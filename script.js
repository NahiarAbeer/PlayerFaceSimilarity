import { PLAYERS } from "./players.js";

import {
  db,
  ref,
  push,
  runTransaction
} from "./firebase.js";

const MODEL_URL = "./models";

let currentAudio = null;
let descriptors = [];
let isReady = false;

function setStatus(message, type = "loading") {
  const banner = document.getElementById("status-banner");
  if (!banner) return;

  banner.textContent = message;
  banner.className = `status-banner ${type}`;
}

async function trackVisit() {
  try {
    await runTransaction(
      ref(db, "stats/totalVisitors"),
      current => (current || 0) + 1
    );

    await push(ref(db, "visits"), {
      time: Date.now(),
      browser: navigator.userAgent,
      platform: navigator.platform
    });
  } catch (err) {
    console.error("Visit tracking failed:", err);
  }
}

async function incrementMatchCount() {
  try {
    await runTransaction(
      ref(db, "stats/totalMatches"),
      current => (current || 0) + 1
    );
  } catch (err) {
    console.error("Match tracking failed:", err);
  }
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) return 0;

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);
}

async function loadDescriptors() {
  const response = await fetch("./descriptors.json");

  if (!response.ok) {
    throw new Error("descriptors.json not found. Generate it from admin page first.");
  }

  descriptors = await response.json();

  descriptors = descriptors.map(player => ({
    ...player,
    descriptor: new Float32Array(player.descriptor)
  }));
}

function updateRoster() {
  const roster = document.getElementById("roster");
  if (!roster) return;

  roster.innerHTML = PLAYERS.map(player => `
    <div class="player-card">
      <img src="${player.displayImage || player.image}" alt="${player.name}">
      <h4>${player.name}</h4>
    </div>
  `).join("");
}

function previewImage(file) {
  const preview = document.getElementById("preview");
  if (!preview) return;

  const reader = new FileReader();

  reader.onload = e => {
    preview.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

async function matchFace(file) {
  if (!isReady) {
    setStatus("AI is still loading. Please wait.", "loading");
    return;
  }

  try {
    setStatus("Analysing face...", "loading");

    const img = await faceapi.bufferToImage(file);

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.2
    });

    const detection = await faceapi
      .detectSingleFace(img, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setStatus("No face detected. Use a clearer image.", "error");
      return;
    }

    const userDescriptor = detection.descriptor;

    const scores = descriptors.map(player => ({
      ...player,
      score: cosineSimilarity(userDescriptor, player.descriptor)
    }));

    scores.sort((a, b) => b.score - a.score);

    await incrementMatchCount();

    showResult(scores[0]);
    showLeaderboard(scores);
  } catch (err) {
    console.error(err);
    setStatus("Error while analysing image.", "error");
  }
}

function showResult(player) {
  if (!player) {
    setStatus("No player data found.", "error");
    return;
  }

  const result = document.getElementById("result");
  if (result) result.hidden = false;

  document.getElementById("player-image").src =
    player.displayImage || player.image;

  document.getElementById("result-name").textContent =
    player.name;

  const percent = Math.max(
    75,
    Math.min(99, player.score * 100)
  );

  document.getElementById("result-score").textContent =
    percent.toFixed(1) + "%";

  document.getElementById("bar").style.width =
    percent + "%";

  setStatus("Match found!", "success");

  if (player.audio) {
    playAudio(player.audio);
  }
}

function playAudio(audioPath) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  currentAudio = new Audio(audioPath);
  currentAudio.loop = true;
  currentAudio.volume = 1;

  currentAudio.play().catch(err => {
    console.log("Audio play blocked:", err);
  });
}

function showLeaderboard(players) {
  const leaderboard = document.getElementById("leaderboard");
  if (!leaderboard) return;

  leaderboard.innerHTML = `
    <h2>Also Found Similarity With:</h2>
  `;

  players.slice(1, 3).forEach(player => {
    const score = Math.max(
      75,
      Math.min(99, player.score * 100)
    );

    leaderboard.innerHTML += `
      <div class="leaderboard-card">
        <img src="${player.displayImage || player.image}">
        <div class="leaderboard-info">
          <div class="leaderboard-name">
            ${player.name}
          </div>
          <div class="leaderboard-score">
            ${score.toFixed(1)}% Match
          </div>
        </div>
      </div>
    `;
  });
}

function enableUpload() {
  const upload = document.getElementById("upload");

  if (!upload) return;

  upload.addEventListener("change", async e => {
    const file = e.target.files[0];

    if (!file) return;

    previewImage(file);
    await matchFace(file);
  });
}

function enableDragDrop() {
  const uploadBox = document.querySelector(".upload-box");

  if (!uploadBox) return;

  uploadBox.addEventListener("dragover", e => {
    e.preventDefault();
    uploadBox.style.borderColor = "#00ffff";
  });

  uploadBox.addEventListener("dragleave", () => {
    uploadBox.style.borderColor = "";
  });

  uploadBox.addEventListener("drop", async e => {
    e.preventDefault();

    uploadBox.style.borderColor = "";

    const file = e.dataTransfer.files[0];

    if (!file) return;

    previewImage(file);
    await matchFace(file);
  });
}

window.addEventListener("load", async () => {
  try {
    updateRoster();

    await trackVisit();

    setStatus("Loading AI models...", "loading");
    await loadModels();

    setStatus("Loading player database...", "loading");
    await loadDescriptors();

    isReady = true;

    setStatus("Ready. Upload a photo.", "success");

    enableUpload();
    enableDragDrop();
  } catch (err) {
    console.error(err);
    setStatus(
      "Failed to load. Generate descriptors.json from admin page first.",
      "error"
    );
  }
});