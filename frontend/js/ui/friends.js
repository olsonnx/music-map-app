import { auth } from '../api/firebase-config.js'; 
import { showUserProfile } from './profile.js';

const API_BASE = 'https://jawor.wzks.uj.edu.pl/~22_ruszkowski/frontend/frontend/api';
// Domyślny awatar
const DEFAULT_AVATAR = 'img/default-avatar.jpg';

const addFriendInput = document.getElementById('add-friend-input');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsList = document.getElementById('friends-list');

// Obsługa przycisku dodawania znajomego
if (addFriendBtn) {
    addFriendBtn.addEventListener('click', async () => {
        const nick = addFriendInput.value.trim().toLowerCase();
        if (!nick) return;
        
        // Zabezpieczenie przed dodaniem samego siebie
        if (nick === auth.currentUser.displayName.toLowerCase()) {
            alert("Nie możesz dodać samego siebie!");
            return;
        }

        addFriendBtn.textContent = "Szukanie...";
        
        try {
            // Szukamy użytkownika w bazie po nicku
            const response = await fetch(`${API_BASE}/users/find?nick=${nick}`);
            
            if (!response.ok) {
                alert("Nie znaleziono użytkownika o takim nicku.");
            } else {
                const friendData = await response.json();
                // Jeśli znaleziono, dodajemy do bazy znajomych
                await toggleFriendInDB(friendData.id, true);
                addFriendInput.value = '';
                alert("Dodano do znajomych!");
            }
        } catch (error) {
            console.error("Błąd:", error);
            alert("Błąd podczas dodawania.");
        }
        addFriendBtn.textContent = "Dodaj znajomego";
    });
}

// Delegacja zdarzeń dla listy znajomych (przejście do profilu po kliknięciu)
if (friendsList) {
    friendsList.addEventListener('click', (e) => {
        const link = e.target.closest('.prof-link');
        if (link) {
            const uid = link.getAttribute('data-uid');
            showUserProfile(uid);
        }
    });
}

// Główna funkcja ładująca listę znajomych użytkownika
export async function loadFriends() {
    if (!friendsList || !auth.currentUser) return;
    friendsList.innerHTML = '<p style="color: #aaa; font-size: 13px; text-align: center;">Ładowanie...</p>';
    
    try {
        // Pobieramy listę znajomych z backendu
        const response = await fetch(`${API_BASE}/friends/${auth.currentUser.uid}`);
        if (!response.ok) throw new Error("Błąd sieci");
        const friends = await response.json();

        if (friends.length === 0) {
            friendsList.innerHTML = '<p style="color: #aaa; font-size: 13px; text-align: center;">Brak znajomych. Dodaj kogoś!</p>';
            return;
        }

        friendsList.innerHTML = ''; 
        
        // Generujemy listę znajomych w HTML
        for (const fData of friends) {
            const fPic = fData.photoURL || DEFAULT_AVATAR; 
            const fName = fData.userName || "Nieznany";
            const fid = fData.friendId;
            
            // Ikona jeśli to wzajemni znajomi (moots)
            const mutualBadge = fData.isMutual ? '<span class="mutual-badge" title="Wzajemni znajomi (Mutuals)">🤝</span>' : '';
            
            const friendDiv = document.createElement('div');
            friendDiv.className = 'friend-item';
            friendDiv.innerHTML = `
                <img src="${fPic}" alt="Avatar">
                <span class="friend-name prof-link" data-uid="${fid}">@${fName}${mutualBadge}</span>
                <button class="remove-friend-btn" data-id="${fid}" title="Usuń ze znajomych">&times;</button>
            `;
            friendsList.appendChild(friendDiv);
        }

        // Dodajemy obsługę usuwania znajomego dla wygenerowanych przycisków
        const removeBtns = document.querySelectorAll('.remove-friend-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const friendIdToRemove = e.target.getAttribute('data-id');
                if(confirm("Czy na pewno chcesz usunąć tę osobę ze znajomych?")) {
                    await toggleFriendInDB(friendIdToRemove, false);
                }
            });
        });

    } catch (error) {
        console.error("Błąd ładowania znajomych:", error);
        friendsList.innerHTML = '<p style="color: #e74c3c; font-size: 13px; text-align: center;">Błąd ładowania znajomych.</p>';
    }
}

// Funkcja pomocnicza sprawdzająca czy użytkownik jest już w znajomych
export async function checkIsFriend(uid) {
    if (!auth.currentUser) return false;
    try {
        const response = await fetch(`${API_BASE}/friends/check?userId=${auth.currentUser.uid}&friendId=${uid}`);
        const data = await response.json();
        return data.isFriend;
    } catch (e) {
        console.error("Błąd sprawdzania znajomego:", e);
        return false;
    }
}

// Funkcja do dodawania lub usuwania znajomego w bazie danych
export async function toggleFriendInDB(friendId, isAdding) {
    if (!auth.currentUser || !friendId) return;
    try {
        const method = isAdding ? 'POST' : 'DELETE';
        
        const response = await fetch(`${API_BASE}/friends`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: auth.currentUser.uid,
                friendId: friendId
            })
        });

        if (!response.ok) throw new Error("Błąd bazy danych");

        // Odświeżamy listę po zmianie
        loadFriends(); 
    } catch (e) {
        console.error("Błąd modyfikacji bazy znajomych:", e);
        throw e;
    }
}
