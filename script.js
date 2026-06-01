const PLAYERS = [
  { name: "Ronaldo", initials: "CR", image: "players/ronaldo.png", sound: "sounds/ronaldo.mp3" },
  { name: "Neymar",  initials: "NJ", image: "players/neymar.png",  sound: "sounds/neymar.mp3"  },
];

const MODEL_URL = "./models";
let descriptors = [];
let activeAudio = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function playSound(src) {
  if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; }
  activeAudio = Object.assign(new Audio(src), { volume: 0.7 });
  activeAudio.play();
}

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

// ── Init ───────────────────────────────────────────────────────────────────

async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

async function buildDescriptors() {
  const OPTS = new faceapi.TinyFaceDetectorOptions();

  const results = await Promise.allSettled(
    PLAYERS.map(async (player) => {
      const img       = await faceapi.fetchImage(player.image);
      const detection = await faceapi
        .detectSingleFace(img, OPTS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) throw new Error(`No face found in ${player.image}`);

      return { ...player, descriptor: detection.descriptor };
    })
  );

  descriptors = results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);

  const failed = results.filter(r => r.status === "rejected").length;
  if (failed) console.warn(`${failed} player(s) could not be loaded.`);

  updateRoster();
}

function updateRoster() {
  const roster  = document.getElementById("roster");
  const label   = document.getElementById("roster-label");
  const loaded  = new Set(descriptors.map(d => d.name));

  roster.innerHTML = PLAYERS.map(p => `
    <div class="player-chip">
      <span class="dot ${loaded.has(p.name) ? "ready" : ""}"></span>
      ${p.name}
    </div>
  `).join("");

  label.style.display = "block";
}

// ── Match ──────────────────────────────────────────────────────────────────

async function matchFace(file) {
  setStatus("Analysing face…");

  const img       = await faceapi.bufferToImage(file);
  const OPTS      = new faceapi.TinyFaceDetectorOptions();
  const detection = await faceapi
    .detectSingleFace(img, OPTS)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    setStatus("No face detected — try a clearer photo.");
    return;
  }

  const userDesc = detection.descriptor;

  const [best] = descriptors
    .map(p => ({ ...p, score: cosineSimilarity(userDesc, p.descriptor) }))
    .sort((a, b) => b.score - a.score);

  showResult(best);
  playSound(best.sound);
}

function showResult({ name, initials, score }) {
  const pct = (score * 100).toFixed(1);

  document.getElementById("avatar").textContent      = initials;
  document.getElementById("result-name").textContent = `🏆 ${name}`;
  document.getElementById("result-score").textContent = `${pct}% match`;
  document.getElementById("bar").style.width          = `${pct}%`;
  document.getElementById("result").classList.add("visible");
  setStatus("Match found!");
}

// ── Boot ───────────────────────────────────────────────────────────────────

window.addEventListener("load", async () => {
  setStatus("Loading face recognition models…");
  await loadModels();
  setStatus("Preparing player data…");
  await buildDescriptors();
  setStatus("Ready — upload a photo to find your match.");

  document.getElementById("upload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) await matchFace(file);
    e.target.value = "";  // allow re-uploading the same file
  });
});