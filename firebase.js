import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDhMbe05HuVLBAaEvZWkbMKK42wjIVqZVE",
  authDomain: "player-similarity-588e5.firebaseapp.com",
  databaseURL: "https://player-similarity-588e5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "player-similarity-588e5",
  storageBucket: "player-similarity-588e5.firebasestorage.app",
  messagingSenderId: "1057414187388",
  appId: "1:1057414187388:web:abe3cbc296296d55683cf9",
  measurementId: "G-LBN6VRZMBX"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);

export {
  ref,
  push,
  runTransaction
};