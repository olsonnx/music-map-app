const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // promise dla asynchroniczności (async/await)

const app = express();
app.use(cors());
app.use(express.json());

// 1. KONFIGURACJA POŁĄCZENIA Z BAZĄ MYSQL
const pool = mysql.createPool({
    host: 'localhost', 
    user: '22_ruszkowski',          
    password: 'P4s2m3d9h7',     
    database: '22_ruszkowski',      
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================================
//                 BAŃKI (MAPA)
// ==========================================

// Pobieranie wszystkich baniek na mapę (GET)
app.get('/api/bubbles', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, u.userName 
            FROM bubbles b 
            JOIN users u ON b.userId = u.id
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Błąd pobierania baniek:", error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Dodawanie nowej bańki (POST)
app.post('/api/bubbles', async (req, res) => {
    try {
        const { userId, songName, artistName, lat, lng, coverUrl, spotifyUrl, spotifyId } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO bubbles (userId, songName, artistName, lat, lng, coverUrl, spotifyUrl, spotifyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, songName, artistName, lat, lng, coverUrl, spotifyUrl, spotifyId]
        );
        
        res.status(201).json({ message: 'Bańka dodana!', id: result.insertId });
    } catch (error) {
        console.error("Błąd dodawania bańki:", error);
        res.status(500).json({ error: 'Błąd bazy danych' });
    }
});

// Usuwanie bańki z mapy
app.delete('/api/bubbles/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM bubbles WHERE id = ?', [req.params.id]);
        res.status(200).json({ message: 'Bańka usunięta' });
    } catch (error) {
        res.status(500).json({ error: 'Błąd usuwania bańki' });
    }
});


// ==========================================
//                KOMENTARZE
// ==========================================

// Dodawanie nowego komentarza (POST)
app.post('/api/comments', async (req, res) => {
    try {
        const { bubbleId, userId, text } = req.body;
        await pool.execute(
            'INSERT INTO comments (bubbleId, userId, text) VALUES (?, ?, ?)',
            [bubbleId, userId, text]
        );
        res.status(201).json({ message: 'Komentarz dodany' });
    } catch (error) {
        console.error("Błąd dodawania komentarza:", error);
        res.status(500).json({ error: 'Błąd dodawania komentarza' });
    }
});

// Miękkie usuwanie komentarza (PATCH)
app.patch('/api/comments/:id', async (req, res) => {
    try {
        await pool.execute(
            'UPDATE comments SET isDeleted = true, text = "" WHERE id = ?',
            [req.params.id]
        );
        res.status(200).json({ message: 'Komentarz usunięty' });
    } catch (error) {
        console.error("Błąd usuwania komentarza:", error);
        res.status(500).json({ error: 'Błąd bazy danych' });
    }
});

// Pobieranie komentarzy dla danej bańki (GET)
app.get('/api/comments/:bubbleId', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT c.*, u.userName 
            FROM comments c 
            JOIN users u ON c.userId = u.id 
            WHERE c.bubbleId = ? 
            ORDER BY c.timestamp ASC
        `, [req.params.bubbleId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Błąd pobierania komentarzy:", error);
        res.status(500).json({ error: 'Błąd pobierania komentarzy' });
    }
});


// ==========================================
//               UŻYTKOWNICY
// ==========================================

// Synchronizacja użytkownika po zalogowaniu/rejestracji (POST)
app.post('/api/users/sync', async (req, res) => {
    try {
        const { id, userName, photoURL } = req.body;
        await pool.execute(
            'INSERT IGNORE INTO users (id, userName, photoURL) VALUES (?, ?, ?)',
            [id, userName, photoURL]
        );
        res.status(200).json({ message: 'Użytkownik zsynchronizowany' });
    } catch (error) {
        console.error("Błąd synchronizacji:", error);
        res.status(500).json({ error: 'Błąd bazy danych' });
    }
});

// 1. ZNAJDOWANIE PO NICKU
app.get('/api/users/find', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, userName FROM users WHERE LOWER(userName) = ?',
            [req.query.nick]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono' });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Błąd bazy' });
    }
});

// 2. POBIERANIE POJEDYNCZEGO PROFILU
app.get('/api/users/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, userName, bio, photoURL FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Błąd bazy danych' });
    }
});

// AKTUALIZACJA PROFILU (Bio, Avatar)
app.patch('/api/users/:id', async (req, res) => {
    try {
        const { bio, photoURL } = req.body;
        await pool.execute(
            'UPDATE users SET bio = ?, photoURL = ? WHERE id = ?',
            [bio, photoURL, req.params.id]
        );
        res.status(200).json({ message: 'Profil zaktualizowany' });
    } catch (error) {
        res.status(500).json({ error: 'Błąd aktualizacji profilu' });
    }
});


// ==========================================
//               ZNAJOMI
// ==========================================

// Dodawanie znajomego (POST)
app.post('/api/friends', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        await pool.execute('INSERT IGNORE INTO friends (userId, friendId) VALUES (?, ?)', [userId, friendId]);
        res.status(201).json({ message: 'Dodano znajomego' });
    } catch (error) { res.status(500).json({ error: 'Błąd bazy' }); }
});

// Usuwanie znajomego (DELETE)
app.delete('/api/friends', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        await pool.execute('DELETE FROM friends WHERE userId = ? AND friendId = ?', [userId, friendId]);
        res.status(200).json({ message: 'Usunięto znajomego' });
    } catch (error) { res.status(500).json({ error: 'Błąd bazy' }); }
});

// 1. SPRAWDZANIE CZY JEST ZNAJOMYM
app.get('/api/friends/check', async (req, res) => {
    try {
        const { userId, friendId } = req.query;
        const [rows] = await pool.execute(
            'SELECT * FROM friends WHERE userId = ? AND friendId = ?',
            [userId, friendId]
        );
        res.status(200).json({ isFriend: rows.length > 0 });
    } catch (error) {
        res.status(500).json({ error: 'Błąd bazy' });
    }
});

// 2. POBIERANIE LISTY ZNAJOMYCH
app.get('/api/friends/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const [friends] = await pool.execute(`
            SELECT f.friendId, u.userName, u.photoURL, 
                   (SELECT COUNT(*) FROM friends f2 WHERE f2.userId = f.friendId AND f2.friendId = ?) as isMutual
            FROM friends f
            JOIN users u ON f.friendId = u.id
            WHERE f.userId = ?
        `, [userId, userId]);
        
        const formattedFriends = friends.map(f => ({ ...f, isMutual: f.isMutual > 0 }));
        res.status(200).json(formattedFriends);
    } catch (error) {
        res.status(500).json({ error: 'Błąd pobierania znajomych' });
    }
});


// ==========================================
//               ULUBIONE
// ==========================================

// Dodawanie do ulubionych (POST)
app.post('/api/favorites', async (req, res) => {
    try {
        const { userId, songKey, songName, artistName, coverUrl } = req.body;
        await pool.execute('INSERT IGNORE INTO favorites (userId, songKey, songName, artistName, coverUrl) VALUES (?, ?, ?, ?, ?)', [userId, songKey, songName, artistName, coverUrl]);
        res.status(200).json({ message: 'Dodano do ulubionych' });
    } catch (error) { 
        console.error("Błąd MySQL (dodawanie ulubionych):", error);
        res.status(500).json({ error: 'Błąd dodawania do ulubionych' }); 
    }
});

// Usuwanie z ulubionych (DELETE)
app.delete('/api/favorites', async (req, res) => {
    try {
        const { userId, songKey } = req.body;
        await pool.execute('DELETE FROM favorites WHERE userId = ? AND songKey = ?', [userId, songKey]);
        res.status(200).json({ message: 'Usunięto z ulubionych' });
    } catch (error) { 
        console.error("Błąd MySQL (usuwanie ulubionych):", error);
        res.status(500).json({ error: 'Błąd usuwania' }); 
    }
});

// SPRAWDZANIE CZY UTWÓR JEST W ULUBIONYCH 
app.get('/api/favorites/check', async (req, res) => {
    try {
        const { userId, songKey } = req.query;
        const [rows] = await pool.execute('SELECT * FROM favorites WHERE userId = ? AND songKey = ?', [userId, songKey]);
        res.status(200).json({ isFavorited: rows.length > 0 });
    } catch (error) {
        console.error("Błąd MySQL (sprawdzanie ulubionych):", error);
        res.status(500).json({ error: 'Błąd sprawdzania ulubionych' });
    }
});

// POBIERANIE LISTY ULUBIONYCH
app.get('/api/favorites/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM favorites WHERE userId = ? ORDER BY timestamp DESC', [req.params.userId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Błąd MySQL (pobieranie listy ulubionych):", error);
        res.status(500).json({ error: 'Błąd pobierania ulubionych' });
    }
});


// ==========================================
//                 OCENY
// ==========================================

// Pobieranie ocen utworu (GET)
app.get('/api/ratings/:spotifyId', async (req, res) => {
    try {
        const spotifyId = req.params.spotifyId;
        const userId = req.query.userId || null;
        
        const [rows] = await pool.execute('SELECT rating, userId FROM song_ratings WHERE spotifyId = ?', [spotifyId]);
        
        let totalScore = 0;
        let userVote = 0;
        rows.forEach(r => {
            totalScore += r.rating;
            if (userId && r.userId === userId) userVote = r.rating;
        });

        const votesCount = rows.length;
        const average = votesCount > 0 ? (totalScore / votesCount).toFixed(1) : 0;
        
        res.status(200).json({ average, votesCount, userVote });
    } catch (error) { res.status(500).json({ error: 'Błąd pobierania ocen' }); }
});

// Głosowanie na utwór (POST)
app.post('/api/ratings', async (req, res) => {
    try {
        const { spotifyId, userId, rating } = req.body;
        await pool.execute(`
            INSERT INTO song_ratings (spotifyId, userId, rating) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE rating = ?
        `, [spotifyId, userId, rating, rating]);
        res.status(200).json({ message: 'Zapisano ocenę' });
    } catch (error) { res.status(500).json({ error: 'Błąd zapisywania oceny' }); }
});

// ==========================================
//               SPOTIFY API
// ==========================================
let spotifyAccessToken = null;
let spotifyTokenExpiration = 0;

const getSpotifyToken = async () => {
    if (spotifyAccessToken && Date.now() < spotifyTokenExpiration) {
        return spotifyAccessToken;
    }
    const clientId = 'f7acf4a96bdf44a2bbfc82186c7c6356';
    const clientSecret = 'f214ff529c88461f9ce3ab2722c8aa3b';
    
    // Kodowanie Base64 dla NodeJS
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    
    const data = await response.json();
    spotifyAccessToken = data.access_token;
    spotifyTokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;
    
    return spotifyAccessToken;
};

// endpoint wyszukiwania dla frontendu
app.get('/api/spotify/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'Brak zapytania' });
        
        const token = await getSpotifyToken();
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        res.status(200).json(data.tracks.items);
    } catch (error) {
        console.error("Błąd Spotify API:", error);
        res.status(500).json({ error: 'Błąd pobierania danych ze Spotify' });
    }
});

// ==========================================
//           KONFIGURACJA FIREBASE
// ==========================================
app.get('/api/config/firebase', (req, res) => {
    res.status(200).json({
        apiKey: "AIzaSyCAsLKTrSPuoyMOUaNRZ3P9rtYvfRNFdgU",
        authDomain: "music-map-app-ar.firebaseapp.com",
        projectId: "music-map-app-ar",
        storageBucket: "music-map-app-ar.firebasestorage.app",
        messagingSenderId: "432711468617",
        appId: "1:432711468617:web:3ac6dffbad4b73eb08a198"
    });
});


// ==========================================
//           URUCHOMIENIE SERWERA
// ==========================================
const PORT = 32207; 
app.listen(PORT, () => {
    console.log(`Serwer API działa na porcie ${PORT}`);
});