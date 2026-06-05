import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getDatabase,
    ref,
    get
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

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
const db = getDatabase(app);
loadDashboard();

async function loadDashboard(){

    try{

        const statsSnap =
            await get(ref(db,"stats"));

        if(statsSnap.exists()){

            const stats =
                statsSnap.val();

            document
                .getElementById("visitors")
                .textContent =
                stats.totalVisitors || 0;

            document
                .getElementById("matches")
                .textContent =
                stats.totalMatches || 0;
        }

        const visitsSnap =
            await get(ref(db,"visits"));

        if(visitsSnap.exists()){

            const visits =
                Object.values(
                    visitsSnap.val()
                );

            visits.reverse();

            const table =
                document.getElementById(
                    "visitTable"
                );

            visits
                .slice(0,20)
                .forEach(v=>{

                table.innerHTML += `
                <tr>
                    <td>${v.time || "-"}</td>
                    <td>${v.userAgent || "-"}</td>
                </tr>
                `;

            });
        }

    }

    catch(err){

        console.error(err);

    }

}