import { db, auth } from '../api/firebase-config.js';
import { collection, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { authModal } from './auth.js';

const ratingSection = document.getElementById('rating-section');
const stars = document.querySelectorAll('.star');
const ratingInfo = document.getElementById('rating-info');

let unsubscribeRatings = null;
let currentSpotifyId = null;

// Eksportujemy funkcję czyszczącą na wypadek zamknięcia panelu
export const clearRatings = () => {
    if (unsubscribeRatings) unsubscribeRatings();
    ratingSection.style.display = 'none';
};

// Eksportujemy funkcję ładującą oceny dla konkretnego utworu
export const loadRatings = (spotifyId) => {
    currentSpotifyId = spotifyId;
    ratingSection.style.display = 'block';
    
    if (unsubscribeRatings) unsubscribeRatings();
    
    const votesRef = collection(db, "song_ratings", spotifyId, "votes");
    unsubscribeRatings = onSnapshot(votesRef, (snapshot) => {
        let totalScore = 0;
        let votesCount = 0;
        let currentUserVote = 0; 

        snapshot.forEach((docSnap) => {
            const rating = docSnap.data().rating;
            totalScore += rating;
            votesCount++;
            
            if (auth.currentUser && docSnap.id === auth.currentUser.uid) {
                currentUserVote = rating;
            }
        });

        const displayScore = currentUserVote > 0 ? currentUserVote : (votesCount > 0 ? Math.round(totalScore / votesCount) : 0);
        
        stars.forEach(star => {
            const starVal = parseInt(star.getAttribute('data-val'));
            if (starVal <= displayScore) star.classList.add('active');
            else star.classList.remove('active');
        });

        if (votesCount === 0) {
            ratingInfo.textContent = "Brak ocen. Bądź pierwszy!";
        } else {
            const average = (totalScore / votesCount).toFixed(1); 
            ratingInfo.textContent = currentUserVote > 0 
                ? `Twoja ocena: ${currentUserVote} ★ (Średnia: ${average} z ${votesCount} głosów)` 
                : `Średnia: ${average} ★ (${votesCount} głosów)`;
        }
    });
};

stars.forEach(star => {
    star.addEventListener('mouseover', (e) => {
        const hoverVal = parseInt(e.target.getAttribute('data-val'));
        stars.forEach(s => {
            if (parseInt(s.getAttribute('data-val')) <= hoverVal) s.style.color = '#1DB954';
            else s.style.color = '#444';
        });
    });

    star.addEventListener('mouseleave', () => {
        stars.forEach(s => s.style.color = ''); 
    });

    star.addEventListener('click', async (e) => {
        if (!auth.currentUser) { authModal.classList.add('active'); return; }
        if (!currentSpotifyId) return;

        const ratingVal = parseInt(e.target.getAttribute('data-val'));

        try {
            const userVoteRef = doc(db, "song_ratings", currentSpotifyId, "votes", auth.currentUser.uid);
            await setDoc(userVoteRef, {
                rating: ratingVal,
                timestamp: new Date()
            });
        } catch (error) { console.error("Błąd zapisywania oceny:", error); }
    });
});