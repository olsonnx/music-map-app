# Music World Map

A web application where users pin songs to locations on a world map. Each pin ("bubble") holds a track chosen from Spotify, and other users can browse the map, open a pin, comment on it, and rate the song. The project was built as a bachelor's thesis.

## Features

- Interactive world map (Leaflet) with song pins placed by clicking a location
- Song search through the Spotify API, with cover art, artist, and a link back to Spotify
- User accounts with email/password sign-up, login, and password reset (Firebase Authentication)
- Comments on individual pins, with soft deletion
- Song ratings with an averaged score and per-user vote
- Favourites list saved per user
- Friends: add/remove other users, mutual-friend detection, and viewing their profiles
- User profiles with a bio and avatar

## Tech stack

**Frontend**
- Plain JavaScript (ES modules), HTML, CSS — no build step
- Leaflet for the map
- Firebase Authentication (client SDK) for sign-in

**Backend**
- Node.js with Express
- MySQL (via `mysql2`)
- Acts as the API and as a proxy to the Spotify API (keeps the client secret server-side)
- Serves Firebase config to the frontend so no keys are hardcoded in client files

## Requirements

- Node.js 18 or newer (the backend uses the built-in `fetch`)
- A MySQL database
- A Spotify developer application (client ID and secret)
- A Firebase project with Email/Password authentication enabled

## Configuration

The backend reads its settings from a `.env` file in the `backend/` directory. This file is not committed. Create `backend/.env` with:

```
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASS=your_mysql_password
DB_NAME=your_database_name

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

FIREBASE_API_KEY=your_firebase_web_api_key
```

The remaining Firebase settings (auth domain, project ID, etc.) are set directly in `backend/server.js` in the `/api/config/firebase` endpoint.

## Database

The API expects the following tables: `users`, `bubbles`, `comments`, `friends`, `favorites`, and `song_ratings`. The columns used by each query can be read directly from `backend/server.js`.

## Running

Backend:

```
cd backend
npm install
node server.js
```

Frontend:

The frontend is static. Serve the `frontend/` directory with any static file server, for example:

```
cd frontend
npx serve
```

Set `API_BASE` in `frontend/js/map.js` and `frontend/js/api/firebase-config.js` to point at the running backend.

## API overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/bubbles` | List all map pins |
| POST | `/api/bubbles` | Add a pin |
| DELETE | `/api/bubbles/:id` | Remove a pin |
| GET | `/api/comments/:bubbleId` | Comments for a pin |
| POST | `/api/comments` | Add a comment |
| PATCH | `/api/comments/:id` | Soft-delete a comment |
| POST | `/api/users/sync` | Create/refresh a user after sign-in |
| GET | `/api/users/find` | Find a user by nickname |
| GET | `/api/users/:id` | Get a user profile |
| PATCH | `/api/users/:id` | Update bio and avatar |
| POST/DELETE | `/api/friends` | Add or remove a friend |
| GET | `/api/friends/check` | Check a friendship |
| GET | `/api/friends/:userId` | List a user's friends |
| POST/DELETE | `/api/favorites` | Add or remove a favourite |
| GET | `/api/favorites/check` | Check if a track is favourited |
| GET | `/api/favorites/:userId` | List favourites |
| GET | `/api/ratings/:spotifyId` | Get a track's rating summary |
| POST | `/api/ratings` | Submit a rating |
| GET | `/api/spotify/search` | Search Spotify for tracks |
| GET | `/api/config/firebase` | Firebase config for the frontend |
