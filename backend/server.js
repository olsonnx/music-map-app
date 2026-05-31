const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Używamy wersji promise dla asynchroniczności (async/await)

const app = express();
app.use(cors());
app.use(express.json());

// 1. KONFIGURACJA POŁĄCZENIA Z BAZĄ MYSQL
const pool = mysql.createPool({
    host: 'localhost', 
    user: 'TWOJ_LOGIN',          // Twój login do phpMyAdmin (zazwyczaj indeks)
    password: 'TWOJE_HASLO',     // Nowe hasło, które zmieniłeś
    database: 'TWOJ_LOGIN',      // Nazwa Twojej bazy to zazwyczaj Twój login
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 2. ENDPOINT: Pobieranie wszystkich baniek na mapę (GET)
app.get('/api/bubbles', async (req, res) => {
    try {
        // Zamiast Firebase getDocs, robimy zapytanie SQL (z dołączeniem nicku autora)
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

// URUCHOMIENIE SERWERA
// Używamy zmiennej środowiskowej, żeby na uczelni podać port od administratora
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
    console.log(`Serwer API działa na porcie ${PORT}`);
});