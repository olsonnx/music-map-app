// js/spotify.js

const clientId = 'f7acf4a96bdf44a2bbfc82186c7c6356';
const clientSecret = 'f214ff529c88461f9ce3ab2722c8aa3b'; // <-- WKLEJ GO TUTAJ

let accessToken = null;
let tokenExpiration = 0; // Kiedy wygasa token

// Funkcja, która w tle łączy się ze Spotify jako NASZA APLIKACJA
const getAccessToken = async () => {
    // Jeśli mamy token i jeszcze nie wygasł, używamy go ponownie
    if (accessToken && Date.now() < tokenExpiration) {
        return accessToken;
    }
    
    // W przeciwnym razie prosimy Spotify o nowy token
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                // Kodujemy nasze klucze do formatu Base64 (wymóg Spotify)
                'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
            },
            body: 'grant_type=client_credentials'
        });
        
        const data = await response.json();
        accessToken = data.access_token;
        // Zapisujemy czas wygaśnięcia (minus 1 minuta dla bezpieczeństwa)
        tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;
        
        return accessToken;
    } catch (error) {
        console.error("Błąd pobierania tokenu Spotify:", error);
        return null;
    }
};

// Funkcja szukająca piosenek
export const searchSpotify = async (query) => {
    const token = await getAccessToken();
    if (!token) return [];
    
    try {
        const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        return data.tracks.items; // Zwracamy listę 5 utworów
    } catch (error) {
        console.error("Błąd wyszukiwania w Spotify:", error);
        return [];
    }
};