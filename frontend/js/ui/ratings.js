import { auth } from '../api/firebase-config.js';
import { authModal } from './auth.js';

const API_BASE = 'https://jawor.wzks.uj.edu.pl/~22_ruszkowski/frontend/frontend/api';

const ratingSection = document.getElementById('rating-section');
const stars = document.querySelectorAll('.star');
const ratingInfo = document.getElementById('rating-info');

let currentSpotifyId = null;

// Ukrywa sekcję ocen
export const clearRatings = () => {
    ratingSection.style.display = 'none';
};

// Pobiera dane o ocenach z API i odświeża gwiazdki oraz tekst
const fetchAndDisplayRatings = async (spotifyId) => {
    try {
        const url = auth.currentUser 
            ? `${API_BASE}/ratings/${spotifyId}?userId=${auth.currentUser.uid}` 
            : `${API_BASE}/ratings/${spotifyId}`;
            
        const res = await fetch(url);
        const data = await res.json();

        const currentUserVote = data.userVote || 0;
        const displayScore = currentUserVote > 0 ? currentUserVote : data.average;

        // Podświetlamy gwiazdki na podstawie wyniku
        stars.forEach(star => {
            const starVal = parseInt(star.getAttribute('data-val'));
            if (starVal <= displayScore) star.classList.add('active');
            else star.classList.remove('active');
        });

        // Aktualizujemy opis tekstowy pod gwiazdkami
        if (data.votesCount === 0) {
            ratingInfo.textContent = "Brak ocen. Bądź pierwszy!";
        } else {
            ratingInfo.textContent = currentUserVote > 0 
                ? `Twoja ocena: ${currentUserVote} ★ (Średnia: ${data.average} z ${data.votesCount} głosów)` 
                : `Średnia: ${data.average} ★ (${data.votesCount} głosów)`;
        }
    } catch (error) {
        console.error("Błąd pobierania ocen:", error);
    }
};

// Wyświetla sekcję ocen dla konkretnego utworu
export const loadRatings = (spotifyId) => {
    currentSpotifyId = spotifyId;
    ratingSection.style.display = 'block';
    fetchAndDisplayRatings(spotifyId);
};

// Obsługa interakcji z gwiazdkami
stars.forEach(star => {
    // Podświetlenie gwiazdek przy najechaniu myszką
    star.addEventListener('mouseover', (e) => {
        const hoverVal = parseInt(e.target.getAttribute('data-val'));
        stars.forEach(s => {
            if (parseInt(s.getAttribute('data-val')) <= hoverVal) s.style.color = '#1DB954';
            else s.style.color = '#444';
        });
    });

    // Powrót do standardowego koloru po zabraniu myszki
    star.addEventListener('mouseleave', () => {
        stars.forEach(s => s.style.color = ''); 
    });

    // Wysyłanie oceny do bazy po kliknięciu
    star.addEventListener('click', async (e) => {
        // Wymagamy zalogowania
        if (!auth.currentUser) { authModal.classList.add('active'); return; }
        if (!currentSpotifyId) return;

        const ratingVal = parseInt(e.target.getAttribute('data-val'));

        try {
            await fetch(`${API_BASE}/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    spotifyId: currentSpotifyId,
                    userId: auth.currentUser.uid,
                    rating: ratingVal
                })
            });
            // Odświeżamy wyświetlanie po udanym głosowaniu
            fetchAndDisplayRatings(currentSpotifyId);
        } catch (error) { console.error("Błąd zapisywania oceny:", error); }
    });
});
