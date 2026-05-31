import { db, auth } from '../api/firebase-config.js';
// ZMIANA: Dodano getDoc i setDoc do importów
import { doc, deleteDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { loadRatings, clearRatings } from './ratings.js';
import { loadComments, clearComments } from './comments.js';
import { showUserProfile } from './profile.js';

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

export const openSidePanel = (bubbleId, data) => {
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

    // --- SYSTEM ULUBIONYCH (SERDUSZKO) ---
    const favBtn = document.getElementById('favorite-btn');
    if (auth.currentUser && favBtn) {
        favBtn.style.display = 'inline-block';
        const myUid = auth.currentUser.uid;
        const songKey = data.spotifyId || data.songName; // Unikalny identyfikator utworu
        
        // Sprawdzamy, czy utwór jest już w ulubionych
        getDoc(doc(db, "users", myUid)).then(docSnap => {
            let favs = docSnap.exists() ? (docSnap.data().favorites || []) : [];
            let isFav = favs.some(f => f.id === songKey);

            favBtn.textContent = isFav ? '💚' : '🤍';
            if (isFav) favBtn.classList.add('active');

            // Kliknięcie serduszka
            favBtn.addEventListener('click', async () => {
                favBtn.textContent = '⏳'; // Chwilowy loader
                try {
                    const freshSnap = await getDoc(doc(db, "users", myUid));
                    let currentFavs = freshSnap.exists() ? (freshSnap.data().favorites || []) : [];
                    const alreadyFav = currentFavs.some(f => f.id === songKey);

                    if (alreadyFav) {
                        // Usuwamy z ulubionych
                        currentFavs = currentFavs.filter(f => f.id !== songKey);
                        favBtn.textContent = '🤍';
                        favBtn.classList.remove('active');
                    } else {
                        // Dodajemy do ulubionych (zapisujemy wszystkie dane utworu)
                        currentFavs.push({
                            id: songKey,
                            songName: data.songName,
                            artistName: data.artistName || 'Nieznany wykonawca',
                            coverUrl: data.coverUrl || ''
                        });
                        favBtn.textContent = '💚';
                        favBtn.classList.add('active');
                    }

                    await setDoc(doc(db, "users", myUid), { favorites: currentFavs }, { merge: true });
                } catch (e) {
                    console.error("Błąd ulubionych:", e);
                    favBtn.textContent = isFav ? '💚' : '🤍'; // W razie błędu cofa UI
                }
            });
        });
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
                    await deleteDoc(doc(db, "bubbles", bubbleId));
                    closePanel();
                } catch (error) { console.error("Błąd usuwania:", error); }
            }
        });
    }

    if (bubbleTimerInterval) clearInterval(bubbleTimerInterval);

    const createdAt = data.timestamp ? data.timestamp.toDate().getTime() : new Date().getTime();
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