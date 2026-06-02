const PLAYERS = [
  { name: "Messi", image: "players/messi.jpg" },
  { name: "Ronaldo", image: "players/ronaldo.jpg" },
  { name: "Neymar", image: "players/neymar.jpg" },
  { name: "Mbappe", image: "players/mbappe.jpg" },
  { name: "Haaland", image: "players/haaland.jpg" },
  { name: "Kane", image: "players/kane.jpg" },
  { name: "Salah", image: "players/salah.jpg" },
  { name: "Vinicius Jr", image: "players/viniciusjr.jpg" }
];

const MODEL_URL = "./models";

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

    leaderboard.innerHTML = "";

    players.forEach((player,index)=>{

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

            <div class="rank-number">
                #${index+1}
            </div>

            <img src="${player.image}">

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
