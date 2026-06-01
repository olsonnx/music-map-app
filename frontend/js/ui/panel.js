import { auth } from '../api/firebase-config.js';
import { loadRatings, clearRatings } from './ratings.js';
import { loadComments, clearComments } from './comments.js';
import { showUserProfile } from './profile.js';

const API_BASE = 'https://jawor.wzks.uj.edu.pl:32207/api';

const sidePanel = document.getElementById('side-panel');
const closePanelBtn = document.getElementById('close-panel-btn');
const panelSongInfo = document.getElementById('panel-song-info');

let bubbleTimerInterval = null;

export const closePanel = () => {
    sidePanel.classList.remove('active');
    clearComments();
    clearRatings();
    if (bubbleTimerInterval) clearInterval(bubbleTimerInterval); 
};

closePanelBtn.addEventListener('click', closePanel);

export const openSidePanel = async (bubbleId, data) => {
    document.getElementById('search-modal').classList.remove('active');

    const isOwner = auth.currentUser && auth.currentUser.uid === data.userId;

    let coverHTML = '';
    if (data.coverUrl) {
        if (data.spotifyUrl) {
            coverHTML = `
                <a href="${data.spotifyUrl}" target="_blank" class="cover-container" title="Otwórz w Spotify">
                    <img src="${data.coverUrl}" alt="Okładka">
                    <div class="cover-overlay">▶ Słuchaj w Spotify</div>
                </a>
            `;
        } else {
            coverHTML = `<img src="${data.coverUrl}" alt="Okładka" style="width: 160px; height: 160px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); object-fit: cover;">`;
        }
    }

    panelSongInfo.innerHTML = `
        ${coverHTML}
        <h2>${data.songName}</h2>
        <p>${data.artistName || 'Nieznany wykonawca'}</p>
        <button id="favorite-btn" class="favorite-btn" title="Dodaj do ulubionych" style="display: none;">🤍</button>
        <div class="added-by">Dodane przez <span class="prof-link" data-uid="${data.userId}">@${data.userName}</span></div>
        <div id="bubble-timer" class="bubble-timer">Liczenie czasu...</div>
        ${isOwner ? `<button id="delete-bubble-btn" class="delete-bubble-btn">Usuń swój utwór</button>` : ''}
    `;

    // --- SYSTEM ULUBIONYCH (MYSQL) ---
    const favBtn = document.getElementById('favorite-btn');
    if (auth.currentUser && favBtn) {
        favBtn.style.display = 'inline-block';
        const myUid = auth.currentUser.uid;
        const songKey = data.spotifyId || data.songName;
        
        try {
            // Sprawdzenie czy jest w ulubionych
            const res = await fetch(`${API_BASE}/favorites/check?userId=${myUid}&songKey=${songKey}`);
            const favData = await res.json();
            let isFav = favData.isFavorited;

            favBtn.textContent = isFav ? '💚' : '🤍';
            if (isFav) favBtn.classList.add('active');

            favBtn.addEventListener('click', async () => {
                favBtn.textContent = '⏳';
                try {
                    const method = isFav ? 'DELETE' : 'POST';
                    const response = await fetch(`${API_BASE}/favorites`, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: myUid,
                            songKey: songKey,
                            songName: data.songName,
                            artistName: data.artistName || 'Nieznany wykonawca',
                            coverUrl: data.coverUrl || ''
                        })
                    });

                    if (response.ok) {
                        isFav = !isFav;
                        favBtn.textContent = isFav ? '💚' : '🤍';
                        if (isFav) favBtn.classList.add('active'); else favBtn.classList.remove('active');
                    }
                } catch (e) {
                    console.error("Błąd ulubionych:", e);
                    favBtn.textContent = isFav ? '💚' : '🤍'; 
                }
            });
        } catch (error) { console.error("Błąd ładowania ulubionych:", error); }
    }

    const profileLink = panelSongInfo.querySelector('.prof-link');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            const uid = e.target.getAttribute('data-uid');
            showUserProfile(uid);
        });
    }

    sidePanel.classList.add('active');

    if (isOwner) {
        document.getElementById('delete-bubble-btn').addEventListener('click', async () => {
            const confirmDelete = confirm("Czy na pewno chcesz usunąć ten utwór z mapy?");
            if (confirmDelete) {
                try {
                    await fetch(`${API_BASE}/bubbles/${bubbleId}`, { method: 'DELETE' });
                    closePanel();
                } catch (error) { console.error("Błąd usuwania:", error); }
            }
        });
    }

    if (bubbleTimerInterval) clearInterval(bubbleTimerInterval);

    const createdAt = data.timestamp ? new Date(data.timestamp).getTime() : new Date().getTime();
    const expiresAt = createdAt + (24 * 60 * 60 * 1000);

    const updateTimer = () => {
        const now = new Date().getTime();
        const distance = expiresAt - now;
        const timerEl = document.getElementById('bubble-timer');
        
        if (!timerEl) return;
        if (distance < 0) { closePanel(); return; }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        timerEl.innerText = `Zniknie za: ${hours}h ${minutes}m ${seconds}s`;
    };

    updateTimer(); 
    bubbleTimerInterval = setInterval(updateTimer, 1000); 

    if (!data.spotifyId) clearRatings();
    else loadRatings(data.spotifyId);
    
    loadComments(bubbleId);
};