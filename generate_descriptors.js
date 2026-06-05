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

async function generateDescriptors() {

  const MODEL_URL = "./models";

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);

  const options =
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.2
    });

  const descriptorDB = [];

  for (const player of PLAYERS) {

    console.log("Processing:", player.name);

    const img =
      await faceapi.fetchImage(player.image);

    const detection =
      await faceapi
        .detectSingleFace(img, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
      console.warn(
        `No face found in ${player.name}`
      );
      continue;
    }

    descriptorDB.push({
      name: player.name,
      image: player.image,
      audio: player.audio,
      descriptor: Array.from(
        detection.descriptor
      )
    });
  }

  const blob = new Blob(
    [JSON.stringify(descriptorDB, null, 2)],
    {
      type: "application/json"
    }
  );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "descriptors.json";

  a.click();

  console.log("descriptors.json generated");
}

document
  .getElementById("export")
  .addEventListener(
    "click",
    generateDescriptors
  );