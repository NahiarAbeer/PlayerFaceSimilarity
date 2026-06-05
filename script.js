import {
  db,
  ref,
  push,
  runTransaction
} from "./firebase.js";
async function trackVisit() {

  try {

    runTransaction(
      ref(db, "stats/totalVisitors"),
      (current) => (current || 0) + 1
    );

    push(
      ref(db, "visits"),
      {
        time: Date.now(),
        browser: navigator.userAgent,
        platform: navigator.platform
      }
    );

  }

  catch (err) {

    console.error(
      "Visit tracking failed:",
      err
    );

  }

}



const PLAYERS = [
  {
    name: "Lionel Messi",
    image: "players/messi.jpg",
    audio: "audio/messi.mp3"
  },
  {
    name: "Cristiano Ronaldo",
    image: "players/ronaldo.jpg",
    audio: "audio/ronald.mp3"
  },
  {
    name: "Neymar Jr",
    image: "players/neymar.jpg",
    audio: "audio/neymar.mp3"
  },
  {
    name: "Kylian Mbappé",
    image: "players/mbappe.jpg",
    audio: "audio/mbappe.mp3"
  },
  {
    name: "Erling Haaland",
    image: "players/haaland.jpg",
    audio: "audio/haaland.mp3"
  },
  {
    name: "Harry Kane",
    image: "players/kane.jpg",
    audio: "audio/kane.mp3"
  },
  {
    name: "Mohamed Salah",
    image: "players/salah.jpg",
    audio: "audio/salah.mp3"
  },
  {
    name: "Vinícius Júnior",
    image: "players/viniciusjr.jpg",
    audio: "audio/vinicius_jr.mp3"
  },
  {
    name: "Achraf Hakimi",
    image: "players/hakimi.jpg",
    audio: "audio/hakimi.mp3"
  },
  {
    name: "Emiliano Martínez",
    image: "players/emi martinez.jpg",
    audio: "audio/emi_martinez.mp3"
  },
  {
    name: "Lamine Yamal",
    image: "players/lamine yamal.jpg",
    audio: "audio/lamine_yamal.mp3"
  }
];
const MODEL_URL = "./models";
let currentAudio = null;
let descriptors = [];

// ---------- STATUS ----------

function setStatus(message, type = "loading") {

    const banner =
        document.getElementById("status-banner");

    banner.textContent = message;

    banner.className =
        `status-banner ${type}`;
}
// ---------- SIMILARITY ----------

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ---------- MODELS ----------

async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);
}

// ---------- BUILD PLAYER DATABASE ----------

async function buildDescriptors() {

  const options =
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.2
    });

  const results = await Promise.allSettled(

    PLAYERS.map(async player => {

      const img =
        await faceapi.fetchImage(player.image);

      const detection =
        await faceapi
          .detectSingleFace(img, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

      if (!detection) {
        throw new Error(
          `No face found in ${player.name}`
        );
      }

      return {
        ...player,
        descriptor: detection.descriptor
      };

    })

  );

  descriptors =
    results
      .filter(r => r.status === "fulfilled")
      .map(r => r.value);

  console.table(descriptors);

  updateRoster();
}

// ---------- ROSTER ----------

function updateRoster() {

  const roster =
    document.getElementById("roster");

  roster.innerHTML = PLAYERS.map(player => `
  
    <div class="player-card">

      <img src="${player.image}" alt="${player.name}">

      <h4>${player.name}</h4>

    </div>

  `).join("");

}

// ---------- IMAGE PREVIEW ----------

function previewImage(file) {

  const reader = new FileReader();

  reader.onload = e => {

    document
      .getElementById("preview")
      .src = e.target.result;

  };

  reader.readAsDataURL(file);

}

// ---------- MATCH FACE ----------

async function matchFace(file) {

  try {

    setStatus("Analysing face...");

    const img =
      await faceapi.bufferToImage(file);

    const options =
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 512,
        scoreThreshold: 0.2
      });

    const detection =
      await faceapi
        .detectSingleFace(img, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {

      setStatus(
        "No face detected. Use a clearer image."
      );

      return;
    }

    const userDescriptor =
      detection.descriptor;

    const scores =
      descriptors.map(player => ({

        ...player,

        score:
          cosineSimilarity(
            userDescriptor,
            player.descriptor
          )

      }));

    scores.sort(
      (a, b) => b.score - a.score
    );

    showResult(scores[0]);
    showLeaderboard(scores);

  }

  catch (err) {

    console.error(err);

    setStatus(
      "Error while analysing image."
    );

  }

}

// ---------- SHOW RESULT ----------

function showResult(player) {

  const result =
    document.getElementById("result");

  result.hidden = false;

  document
    .getElementById("player-image")
    .src = player.image;

  document
    .getElementById("result-name")
    .textContent = player.name;

  const percent =
    Math.max(
      75,
      Math.min(
        99,
        player.score * 100
      )
    );

  document
    .getElementById("result-score")
    .textContent =
      percent.toFixed(1) + "%";

  document
    .getElementById("bar")
    .style.width =
      percent + "%";

  setStatus("Match found!");
  if(player.audio){
    playAudio(player.audio);
}

}
function playAudio(audioPath){

    if(currentAudio){
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    currentAudio = new Audio(audioPath);
    currentAudio.loop = true;   // 🔥 loop forever
    currentAudio.volume = 1;

    currentAudio.play().catch(err=>{
        console.log(err);
    });
}
// ---------- DRAG & DROP ----------

function enableDragDrop() {

  const uploadBox =
    document.querySelector(".upload-box");

  uploadBox.addEventListener(
    "dragover",
    e => {

      e.preventDefault();

      uploadBox.style.borderColor =
        "#00ffff";

    }
  );

  uploadBox.addEventListener(
    "dragleave",
    () => {

      uploadBox.style.borderColor =
        "";

    }
  );

  uploadBox.addEventListener(
    "drop",
    async e => {

      e.preventDefault();

      const file =
        e.dataTransfer.files[0];

      if (!file) return;

      previewImage(file);

      await matchFace(file);

    }
  );

}

// ---------- START ----------

window.addEventListener(
  "load",
  async () => {
    await trackVisit();
    try {

      setStatus(
        "Loading AI models..."
      );

      await loadModels();

      setStatus(
        "Building player database..."
      );

      await buildDescriptors();

      setStatus(
        "Ready. Upload a photo."
      );

      document
        .getElementById("upload")
        .addEventListener(
          "change",
          async e => {

            const file =
              e.target.files[0];

            if (!file) return;

            previewImage(file);

            await matchFace(file);

          }
        );

      enableDragDrop();

    }

    catch (err) {

      console.error(err);

      setStatus(
        "Failed to load models."
      );

    }

  }
);
function showLeaderboard(players){

    const leaderboard =
        document.getElementById("leaderboard");

    leaderboard.innerHTML = `<h2>
        Also Found Similarity With:
        </h2>`;

    players.slice(1, 3).forEach((player,index)=>{

        const score =
            Math.max(
                75,
                Math.min(
                    99,
                    player.score * 100
                )
            );
        
        leaderboard.innerHTML += `
        
        <div class="leaderboard-card">

            <img src="${player.image}">

            <div class="leaderboard-info">

                <div class="leaderboard-name">
                    ${player.name}
                </div>

                <div class="leaderboard-score">
                    ${Math.round(100-score.toFixed(1))}% Match
                </div>

            </div>

        </div>
        
        `;
    });
}
