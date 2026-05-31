import { db, auth } from './api/firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { authModal } from './ui/auth.js';
import { openSearchModal } from './ui/search.js';
import { openSidePanel, closePanel } from './ui/panel.js';

const bounds = [[-90, -180], [90, 180]];
const map = L.map('map', { 
    zoomControl: false, minZoom: 3, maxBounds: bounds, maxBoundsViscosity: 1.0
}).setView([20, 0], 3);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const bubblesLayer = L.layerGroup().addTo(map);

map.on('click', function(e) {
    if (!auth.currentUser) { authModal.classList.add('active'); return; }
    
    // Zamykamy panele boczne przed otwarciem wyszukiwarki
    closePanel();
    document.getElementById('profile-panel').classList.remove('active'); 
    
    // Uruchamiamy wyszukiwarkę z nowego pliku!
    openSearchModal(e.latlng);
});

onSnapshot(collection(db, "bubbles"), (snapshot) => {
    bubblesLayer.clearLayers();
    
    const now = new Date().getTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        const createdAt = data.timestamp ? data.timestamp.toDate().getTime() : now;
        if (now - createdAt > TWENTY_FOUR_HOURS) {
            return;
        }

        const marker = L.circleMarker([data.lat, data.lng], {
            color: '#1DB954', radius: 8, fillOpacity: 0.8, weight: 2,
            bubblingMouseEvents: false
        });

        // Uruchamiamy lewy panel z nowego pliku!
        marker.on('click', () => {
            openSidePanel(docSnap.id, data);
        });
        marker.addTo(bubblesLayer);
    });
});