import { auth } from '../api/firebase-config.js'; // Usunięto 'db'
// Usunięto importy firebase-firestore
import { showUserProfile } from './profile.js';

const DEFAULT_AVATAR = 'img/default-avatar.jpg';

const addFriendInput = document.getElementById('add-friend-input');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsList = document.getElementById('friends-list');

if (addFriendBtn) {
    addFriendBtn.addEventListener('click', async () => {
        const nick = addFriendInput.value.trim().toLowerCase();
        if (!nick) return;
        
        if (nick === auth.currentUser.displayName.toLowerCase()) {
            alert("Nie możesz dodać samego siebie!");
            return;
        }

        addFriendBtn.textContent = "Szukanie...";
        
        try {
            // Pytamy nasz serwer, czy użytkownik o takim nicku istnieje w MySQL
            const response = await fetch(`http://localhost:3000/api/users/find?nick=${nick}`);
            
            if (!response.ok) {
                alert("Nie znaleziono użytkownika o takim nicku.");
            } else {
                const friendData = await response.json();
                
                // Wywołujemy nowy endpoint do dodawania znajomego
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

if (friendsList) {
    friendsList.addEventListener('click', (e) => {
        const link = e.target.closest('.prof-link');
        if (link) {
            const uid = link.getAttribute('data-uid');
            showUserProfile(uid);
        }
    });
}

export async function loadFriends() {
    if (!friendsList || !auth.currentUser) return;
    friendsList.innerHTML = '<p style="color: #aaa; font-size: 13px; text-align: center;">Ładowanie...</p>';
    
    try {
        // Uderzamy do naszego API, które zwróci listę znajomych i od razu sprawdzi 'Mutuals'
        const response = await fetch(`http://localhost:3000/api/friends/${auth.currentUser.uid}`);
        
        if (!response.ok) throw new Error("Błąd sieci");
        const friends = await response.json();

        if (friends.length === 0) {
            friendsList.innerHTML = '<p style="color: #aaa; font-size: 13px; text-align: center;">Brak znajomych. Dodaj kogoś!</p>';
            return;
        }

        friendsList.innerHTML = ''; 
        
        for (const fData of friends) {
            const fPic = fData.avatar || DEFAULT_AVATAR; // Będziemy musieli dodać kolumnę avatar w MySQL, lub brać z Firebase (później)
            const fName = fData.userName || "Nieznany";
            const fid = fData.friendId;
            
            // Nasz serwer sprawdzi to za pomocą SQL JOIN!
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

export async function checkIsFriend(uid) {
    if (!auth.currentUser) return false;
    try {
        const response = await fetch(`http://localhost:3000/api/friends/check?userId=${auth.currentUser.uid}&friendId=${uid}`);
        const data = await response.json();
        return data.isFriend;
    } catch (e) {
        console.error("Błąd sprawdzania znajomego:", e);
        return false;
    }
}

export async function toggleFriendInDB(friendId, isAdding) {
    if (!auth.currentUser || !friendId) return;
    try {
        const method = isAdding ? 'POST' : 'DELETE';
        
        const response = await fetch('http://localhost:3000/api/friends', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: auth.currentUser.uid,
                friendId: friendId
            })
        });

        if (!response.ok) throw new Error("Błąd bazy danych");

        loadFriends(); 
    } catch (e) {
        console.error("Błąd modyfikacji bazy znajomych:", e);
        throw e;
    }
}