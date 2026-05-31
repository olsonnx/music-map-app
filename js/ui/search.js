import { db, auth } from '../api/firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { searchSpotify } from '../api/spotify.js';

const searchModal = document.getElementById('search-modal');
const closeSearchBtn = document.getElementById('close-search-btn');
const spotifySearchInput = document.getElementById('spotify-search-input');
const spotifyResults = document.getElementById('spotify-results');

let currentClickLatLng = null;

export const openSearchModal = (latlng) => {
    currentClickLatLng = latlng;
    searchModal.classList.add('active');
    setTimeout(() => spotifySearchInput.focus(), 100);
};

closeSearchBtn.addEventListener('click', () => searchModal.classList.remove('active'));

let searchTimeout;
spotifySearchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const queryStr = e.target.value.trim();
    if (queryStr.length < 2) { spotifyResults.innerHTML = ''; return; }
    
    searchTimeout = setTimeout(async () => {
        const tracks = await searchSpotify(queryStr);
        renderSpotifyResults(tracks);
    }, 500);
});

function renderSpotifyResults(tracks) {
    spotifyResults.innerHTML = '';
    tracks.forEach(track => {
        const div = document.createElement('div');
        div.className = 'track-item';
        
        const imgUrl = track.album.images[0]?.url || 'https://via.placeholder.com/50';
        const artistName = track.artists.map(a => a.name).join(', ');

        div.innerHTML = `
            <img src="${imgUrl}" class="track-img" alt="Okładka">
            <div class="track-info">
                <span class="track-title">${track.name}</span>
                <span class="track-artist">${artistName}</span>
            </div>
        `;

        div.addEventListener('click', async () => {
            try {
                await addDoc(collection(db, "bubbles"), {
                    lat: currentClickLatLng.lat,
                    lng: currentClickLatLng.lng,
                    songName: track.name,
                    artistName: artistName,
                    coverUrl: imgUrl,
                    spotifyUrl: track.external_urls.spotify,
                    spotifyId: track.id, 
                    userName: auth.currentUser.displayName || "Anonim", 
                    userId: auth.currentUser.uid,
                    timestamp: new Date()
                });
                searchModal.classList.remove('active');
                spotifySearchInput.value = '';
                spotifyResults.innerHTML = '';
            } catch (error) { console.error("Błąd zapisu: ", error); }
        });
        spotifyResults.appendChild(div);
    });
}