const PLAYERS = [
  {
    name: "Lionel Messi",
    image: "players/messi.jpg",
    displayImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg/250px-Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg",
    audio: "audio/messi.mp3"
  },
  {
    name: "Cristiano Ronaldo",
    image: "players/ronaldo.jpg",
    displayImage: "https://i.pinimg.com/1200x/a2/aa/83/a2aa83f541227e9ce7e16091f42468ce.jpg",
    audio: "audio/ronald.mp3"
  },
  {
    name: "Neymar Jr",
    image: "players/neymar.jpg",
    displayImage: "https://i.pinimg.com/736x/d6/22/a7/d622a78cd38f328801a8d0945e4fbc38.jpg",
    audio: "audio/neymar.mp3"
  },
  {
    name: "Kylian Mbappé",
    image: "players/mbappe.jpg",
    displayImage: "https://i.pinimg.com/736x/c6/c0/1e/c6c01e4ea5181ad5e83ef6a3326dc83e.jpg",
    audio: "audio/mbappe.mp3"
  },
  {
    name: "Erling Haaland",
    image: "players/haaland.jpg",
    displayImage: "https://i.pinimg.com/736x/27/d9/c9/27d9c9001fc75d142277df8b60b4eff0.jpg",
    audio: "audio/haaland.mp3"
  },
  {
    name: "Harry Kane",
    image: "players/kane.jpg",
    displayImage: "https://i.pinimg.com/1200x/06/d6/e1/06d6e1012dd0d054b41fa60fd44535f6.jpg",
    audio: "audio/kane.mp3"
  },
  {
    name: "Mohamed Salah",
    image: "players/salah.jpg",
    displayImage: "https://i.pinimg.com/1200x/0d/2f/1e/0d2f1e0f32be9808151840518cf20c75.jpg",
    audio: "audio/salah.mp3"
  },
  {
    name: "Vinícius Júnior",
    image: "players/viniciusjr.jpg",
    displayImage: "https://i.pinimg.com/1200x/06/42/f9/0642f953b070974e1d254e9553d73434.jpg",
    audio: "audio/vinicius_jr.mp3"
  },
  {
    name: "Achraf Hakimi",
    image: "players/hakimi.jpg",
    displayImage: "https://i.pinimg.com/736x/f1/a2/46/f1a246cd30a88bf13d23bfa4483fc6ea.jpg",
    audio: "audio/hakimi.mp3"
  },
  {
    name: "Emiliano Martínez",
    image: "players/emi martinez.jpg",
    displayImage: "https://i.pinimg.com/736x/bb/8e/8f/bb8e8f88def34ee771d6b84f7d750bd8.jpg",
    audio: "audio/emi_martinez.mp3"
  },
  {
    name: "Lamine Yamal",
    image: "players/lamine yamal.jpg",
    displayImage: "https://i.pinimg.com/736x/03/6e/a1/036ea1cec365c51a96f40088e095a240.jpg",
    audio: "audio/lamine_yamal.mp3"
  }
];

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
async function incrementMatchCount() {

  console.log("MATCH TRACKED");

  await runTransaction(
    ref(db, "stats/totalMatches"),
    (current) => (current || 0) + 1
  );

}



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

// ---------- FETCHING PLAYER DATABASE ----------

const response =
  await fetch("descriptors.json");

descriptors =
  await response.json();

// ---------- ROSTER ----------

function updateRoster() {

  const roster =
    document.getElementById("roster");

  roster.innerHTML = PLAYERS.map(player => `
  
    <div class="player-card">

      <img src="${player.displayImage || player.image }" alt="${player.name}">

      <h4>${player.name}</h4>

    </div>

  `).join("");

}
updateRoster();

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
    await incrementMatchCount();
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
    .src = player.displayImage || player.image;

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

      const response =
      await fetch("descriptors.json");

      descriptors =
      await response.json();

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

            <img src="${player.displayImage || player.image}">

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
let isReady = false;

window.addEventListener("load", async () => {

    await loadModels();

    const response =
        await fetch("descriptors.json");

    descriptors =
        await response.json();

    isReady = true;
});
if (!isReady) {
    alert("Please wait, AI is still loading...");
}