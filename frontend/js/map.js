import { auth } from './api/firebase-config.js';
import { authModal } from './ui/auth.js';
import { openSearchModal } from './ui/search.js';
import { openSidePanel, closePanel } from './ui/panel.js';

const API_BASE = 'https://jawor.wzks.uj.edu.pl:32207/api';

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
    
    closePanel();
    document.getElementById('profile-panel').classList.remove('active'); 
    openSearchModal(e.latlng);
});

export const loadBubbles = async () => {
    try {
        const response = await fetch(`${API_BASE}/bubbles`);
        const bubbles = await response.json();

        bubblesLayer.clearLayers();
        
        const now = new Date().getTime();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        bubbles.forEach((bubble) => {
            const createdAt = new Date(bubble.timestamp).getTime();
            
            if (now - createdAt > TWENTY_FOUR_HOURS) {
                return;
            }

            const marker = L.circleMarker([bubble.lat, bubble.lng], {
                color: '#1DB954', radius: 8, fillOpacity: 0.8, weight: 2,
                bubblingMouseEvents: false
            });

            marker.on('click', () => {
                openSidePanel(bubble.id, bubble);
            });
            
            marker.addTo(bubblesLayer);
        });
    } catch (error) {
        console.error("Błąd ładowania mapy z bazy MySQL:", error);
    }
};

loadBubbles();
setInterval(loadBubbles, 30000);