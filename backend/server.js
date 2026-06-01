const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Używamy wersji promise dla asynchroniczności (async/await)

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

// 2. ENDPOINT: Pobieranie wszystkich baniek na mapę (GET)
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

// 3. ENDPOINT: Dodawanie nowej bańki (POST)
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

// ENDPOINT: Miękkie usuwanie komentarza (PATCH)
app.patch('/api/comments/:id', async (req, res) => {
    try {
        const [result] = await pool.execute(
            'UPDATE comments SET isDeleted = true, text = "" WHERE id = ?',
            [req.params.id]
        );
        res.status(200).json({ message: 'Komentarz usunięty' });
    } catch (error) {
        console.error("Błąd usuwania komentarza:", error);
        res.status(500).json({ error: 'Błąd bazy danych' });
    }
});

// ENDPOINT: Pobieranie komentarzy dla danej bańki (GET)
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

// ENDPOINT: Dodawanie nowego komentarza (POST)
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

// ENDPOINT: Znajdowanie użytkownika po nicku
app.get('/api/users/find', async (req, res) => {
    try {
        // Szukamy po małych literach, tak jak miałeś to zrobione w firebase
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

// ENDPOINT: Pobieranie listy znajomych użytkownika (z weryfikacją Mutuals)
app.get('/api/friends/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const [friends] = await pool.execute(`
            SELECT f.friendId, u.userName, 
                   (SELECT COUNT(*) FROM friends f2 WHERE f2.userId = f.friendId AND f2.friendId = ?) as isMutual
            FROM friends f
            JOIN users u ON f.friendId = u.id
            WHERE f.userId = ?
        `, [userId, userId]);
        
        // Zmieniamy isMutual z liczby (0 lub 1) na true/false dla frontendu
        const formattedFriends = friends.map(f => ({ ...f, isMutual: f.isMutual > 0 }));
        res.status(200).json(formattedFriends);
    } catch (error) {
        res.status(500).json({ error: 'Błąd pobierania znajomych' });
    }
});

// ENDPOINT: Sprawdzanie czy dana osoba jest w moich znajomych
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

// ENDPOINT: Dodawanie lub Usuwanie znajomego (POST/DELETE na tej samej ścieżce)
app.post('/api/friends', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        await pool.execute('INSERT IGNORE INTO friends (userId, friendId) VALUES (?, ?)', [userId, friendId]);
        res.status(201).json({ message: 'Dodano znajomego' });
    } catch (error) { res.status(500).json({ error: 'Błąd bazy' }); }
});

app.delete('/api/friends', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        await pool.execute('DELETE FROM friends WHERE userId = ? AND friendId = ?', [userId, friendId]);
        res.status(200).json({ message: 'Usunięto znajomego' });
    } catch (error) { res.status(500).json({ error: 'Błąd bazy' }); }
});

// ENDPOINT: Pobieranie danych pojedynczego użytkownika (Profil)
app.get('/api/users/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, userName, bio, photoURL FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Błąd bazy danych' });
    }
});

// ENDPOINT: Aktualizacja profilu (Bio, Avatar)
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

// ENDPOINT: Pobieranie ulubionych utworów
app.get('/api/favorites/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM favorites WHERE userId = ? ORDER BY timestamp DESC', [req.params.userId]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Błąd pobierania ulubionych' });
    }
});

// ENDPOINT: Synchronizacja użytkownika po zalogowaniu/rejestracji
app.post('/api/users/sync', async (req, res) => {
    try {
        const { id, userName, photoURL } = req.body;
        // INSERT IGNORE nie wywali błędu, jeśli user loguje się kolejny raz
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

// ENDPOINT: USUWANIE BAŃKI Z MAPY
app.delete('/api/bubbles/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM bubbles WHERE id = ?', [req.params.id]);
        res.status(200).json({ message: 'Bańka usunięta' });
    } catch (error) {
        res.status(500).json({ error: 'Błąd usuwania bańki' });
    }
});

// ENDOINT: SPRAWDZANIE CZY UTWÓR JEST W ULUBIONYCH 
app.get('/api/favorites/check', async (req, res) => {
    try {
        const { userId, songKey } = req.query;
        const [rows] = await pool.execute('SELECT * FROM favorites WHERE userId = ? AND songKey = ?', [userId, songKey]);
        res.status(200).json({ isFavorited: rows.length > 0 });
    } catch (error) {
        res.status(500).json({ error: 'Błąd sprawdzania ulubionych' });
    }
});

// ENDPOINT: DODAWANIE/USUWANIE ULUBIONYCH (TOGGLE)
app.post('/api/favorites', async (req, res) => {
    try {
        const { userId, songKey, songName, artistName, coverUrl } = req.body;
        await pool.execute('INSERT IGNORE INTO favorites (userId, songKey, songName, artistName, coverUrl) VALUES (?, ?, ?, ?, ?)', [userId, songKey, songName, artistName, coverUrl]);
        res.status(200).json({ message: 'Dodano do ulubionych' });
    } catch (error) { res.status(500).json({ error: 'Błąd dodawania do ulubionych' }); }
});

app.delete('/api/favorites', async (req, res) => {
    try {
        const { userId, songKey } = req.body;
        await pool.execute('DELETE FROM favorites WHERE userId = ? AND songKey = ?', [userId, songKey]);
        res.status(200).json({ message: 'Usunięto z ulubionych' });
    } catch (error) { res.status(500).json({ error: 'Błąd usuwania' }); }
});

// ENDPOINT: POBIERANIE OCEN UTWORU
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

// ENDPOINT: GŁOSOWANIE NA UTWÓR
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

// URUCHOMIENIE SERWERA
const PORT = 32207; 
app.listen(PORT, () => {
    console.log(`Serwer API działa na porcie ${PORT}`);
});