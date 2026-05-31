import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCAsLKTrSPuoyMOUaNRZ3P9rtYvfRNFdgU",
    authDomain: "music-map-app-ar.firebaseapp.com",
    projectId: "music-map-app-ar",
    storageBucket: "music-map-app-ar.firebasestorage.app",
    messagingSenderId: "432711468617",
    appId: "1:432711468617:web:3ac6dffbad4b73eb08a198"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Udostępniamy bazę i narzędzia logowania dla pozostałych plików
export { db, auth };