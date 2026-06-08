import { PLAYERS } from "./players.js";

async function generateDescriptors() {
  const button = document.getElementById("export");

  if (button) {
    button.disabled = true;
    button.textContent = "Generating...";
  }

  try {
    const MODEL_URL = "./models";

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.2
    });

    const descriptorDB = [];

    for (const player of PLAYERS) {
      console.log("Processing:", player.name);

      try {
        const img = await faceapi.fetchImage(player.image);

        const detection = await faceapi
          .detectSingleFace(img, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          console.warn(`No face found in ${player.name}`);
          continue;
        }

        descriptorDB.push({
          name: player.name,
          image: player.image,
          displayImage: player.displayImage,
          audio: player.audio,
          descriptor: Array.from(detection.descriptor)
        });
      } catch (err) {
        console.warn(`Failed for ${player.name}:`, err);
      }
    }

    const blob = new Blob(
      [JSON.stringify(descriptorDB, null, 2)],
      { type: "application/json" }
    );

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);
    a.download = "descriptors.json";
    a.click();

    URL.revokeObjectURL(a.href);

    console.log("descriptors.json generated:", descriptorDB.length, "players");

    alert(`Generated descriptors.json for ${descriptorDB.length} players.`);
  } catch (err) {
    console.error(err);
    alert("Failed to generate descriptors.json");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Generate JSON";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("export");

  if (button) {
    button.addEventListener("click", generateDescriptors);
  }
});