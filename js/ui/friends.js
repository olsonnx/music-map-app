import { auth, db } from '../api/firebase-config.js';
import { doc, setDoc, getDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("usernameLower", "==", nick));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Nie znaleziono użytkownika o takim nicku.");
            } else {
                let friendId = null;
                querySnapshot.forEach((docSnap) => { friendId = docSnap.id; });
                
                await toggleFriendInDB(friendId, true);
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
    if (!friendsList) return;
    friendsList.innerHTML = '<p style="color: #aaa; font-size: 13px; text-align: center;">Ładowanie...</p>';
    
    try {
        const myDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        
        if (!myDoc.exists() || !myDoc.data().friends || myDoc.data().friends.length === 0) {
            friendsList.innerHTML = '<p style="color: #aaa; font-size: 13px; text-align: center;">Brak znajomych. Dodaj kogoś!</p>';
            return;
        }

        const friendIds = myDoc.data().friends;
        friendsList.innerHTML = ''; 
        
        for (const fid of friendIds) {
            const fDoc = await getDoc(doc(db, "users", fid));
            if (fDoc.exists()) {
                const fData = fDoc.data();
                const fPic = fData.photoURL || DEFAULT_AVATAR;
                const fName = fData.username || "Nieznany";
                
                // --- NOWOŚĆ: SPRAWDZAMY CZY JEST MUTUAL ---
                const theirFriends = fData.friends || [];
                const isMutual = theirFriends.includes(auth.currentUser.uid);
                const mutualBadge = isMutual ? '<span class="mutual-badge" title="Wzajemni znajomi (Mutuals)">🤝</span>' : '';
                
                const friendDiv = document.createElement('div');
                friendDiv.className = 'friend-item';
                friendDiv.innerHTML = `
                    <img src="${fPic}" alt="Avatar">
                    <span class="friend-name prof-link" data-uid="${fid}">@${fName}${mutualBadge}</span>
                    <button class="remove-friend-btn" data-id="${fid}" title="Usuń ze znajomych">&times;</button>
                `;
                friendsList.appendChild(friendDiv);
            }
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

// --- NOWE API ZNAJOMYCH DLA RESZTY APLIKACJI ---

export async function checkIsFriend(uid) {
    if (!auth.currentUser) return false;
    try {
        const myDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        return myDoc.exists() && (myDoc.data().friends || []).includes(uid);
    } catch (e) {
        console.error("Błąd sprawdzania znajomego:", e);
        return false;
    }
}

// ZMIANA: Dodaje/usuwa znajomego TYLKO z Twojej listy (aby mutuals miało sens)
export async function toggleFriendInDB(friendId, isAdding) {
    if (!auth.currentUser || !friendId) return;
    try {
        const action = isAdding ? arrayUnion : arrayRemove;
        
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            friends: action(friendId)
        }, { merge: true });

        // USUNĘLIŚMY modyfikowanie konta znajomego. Musi sam Cię dodać, żebyście byli mutuals!

        loadFriends(); 
    } catch (e) {
        console.error("Błąd modyfikacji bazy znajomych:", e);
        throw e;
    }
}