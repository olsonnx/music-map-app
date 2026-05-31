import { auth, db } from '../api/firebase-config.js';
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { loadFriends, checkIsFriend, toggleFriendInDB } from './friends.js';

const DEFAULT_AVATAR = 'img/default-avatar.jpg';

const profilePanel = document.getElementById('profile-panel');
const profileNameTitle = document.getElementById('profile-name-title');
const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const profilePicUrlInput = document.getElementById('profile-pic-url');
const profileBioInput = document.getElementById('profile-bio');
const saveProfileBtn = document.getElementById('save-profile-btn');

const myProfileEdit = document.getElementById('my-profile-edit');
const guestProfileView = document.getElementById('guest-profile-view');
const guestBio = document.getElementById('guest-bio');
const profileActionBtn = document.getElementById('profile-action-btn');

const tabEdit = document.getElementById('tab-edit');
const tabFriends = document.getElementById('tab-friends');
const tabFavorites = document.getElementById('tab-favorites'); 

const sectionEdit = document.getElementById('section-edit');
const sectionFriends = document.getElementById('section-friends');
const sectionFavorites = document.getElementById('section-favorites'); 
const favoritesList = document.getElementById('favorites-list'); 

let currentViewedUserId = null;
let isAlreadyFriend = false;
let isMutual = false; // NOWOŚĆ: Śledzimy czy jest mutual

// --- ZAKTUALIZOWANE UI PRZYCISKU ---
const updateFriendBtnUI = (isFriend, isMutual) => {
    if (isFriend) {
        profileActionBtn.textContent = isMutual ? "Usuń (Jesteście Mutuals 🤝)" : "Usuń ze znajomych";
        profileActionBtn.style.background = "#e74c3c";
    } else {
        profileActionBtn.textContent = "Dodaj do znajomych";
        profileActionBtn.style.background = "#1DB954";
    }
};

async function loadFavorites(uid) {
    if (!favoritesList) return;
    favoritesList.innerHTML = '<p style="color: #aaa; font-size: 13px; text-align: center;">Ładowanie...</p>';
    
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        const favs = docSnap.exists() ? (docSnap.data().favorites || []) : [];

        if (favs.length === 0) {
            favoritesList.innerHTML = '<p style="color: #aaa; font-size: 13px; text-align: center;">Brak ulubionych utworów.</p>';
            return;
        }

        favoritesList.innerHTML = '';
        favs.forEach(f => {
            const item = document.createElement('div');
            item.className = 'track-item'; 
            item.innerHTML = `
                <img src="${f.coverUrl || 'img/default-avatar.jpg'}" class="track-img" alt="Cover">
                <div class="track-info">
                    <span class="track-title">${f.songName}</span>
                    <span class="track-artist">${f.artistName}</span>
                </div>
            `;
            favoritesList.appendChild(item);
        });
    } catch (error) {
        console.error("Błąd ładowania ulubionych:", error);
        favoritesList.innerHTML = '<p style="color: #e74c3c; font-size: 13px; text-align: center;">Błąd ładowania.</p>';
    }
}

export async function showUserProfile(uid) {
    if (!uid) return;

    const isMe = auth.currentUser && auth.currentUser.uid === uid;
    currentViewedUserId = uid; 
    
    const searchModal = document.getElementById('search-modal');
    if(searchModal) searchModal.classList.remove('active');
    
    profilePanel.classList.add('active');
    if (tabEdit) tabEdit.click(); 

    profileNameTitle.textContent = "Ładowanie...";
    profileAvatarPreview.src = DEFAULT_AVATAR;

    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            profileAvatarPreview.src = data.photoURL || DEFAULT_AVATAR;

            if (isMe) {
                profileNameTitle.textContent = "@" + (data.username || "Użytkownik");
                myProfileEdit.style.display = 'block';
                guestProfileView.style.display = 'none';
                profilePicUrlInput.value = data.photoURL || '';
                profileBioInput.value = data.bio || '';
                
                tabFriends.style.display = 'block'; 
                tabFavorites.style.display = 'block'; 
                tabEdit.textContent = "Edytuj profil";
            } else {
                myProfileEdit.style.display = 'none';
                guestProfileView.style.display = 'block';
                guestBio.textContent = data.bio || "Ten użytkownik nie dodał jeszcze opisu.";
                
                tabFriends.style.display = 'none'; 
                tabFavorites.style.display = 'block'; 
                tabEdit.textContent = "Informacje";

                // Sprawdzanie znajomych i mutuals
                isAlreadyFriend = await checkIsFriend(uid);
                
                const theirFriends = data.friends || [];
                isMutual = isAlreadyFriend && theirFriends.includes(auth.currentUser.uid);

                // Wyświetlenie znaczka mutuals w tytule
                const baseName = "@" + (data.username || "Użytkownik");
                profileNameTitle.innerHTML = isMutual ? `${baseName} <span class="mutual-badge" title="Wzajemni znajomi">🤝</span>` : baseName;

                updateFriendBtnUI(isAlreadyFriend, isMutual);
            }
        } else {
            profileNameTitle.textContent = "Nieznany użytkownik";
        }
    } catch (error) { 
        console.error("Błąd ładowania profilu:", error); 
    }
}

if (profileActionBtn) {
    profileActionBtn.addEventListener('click', async () => {
        if (!currentViewedUserId || !auth.currentUser) return;
        profileActionBtn.textContent = "Przetwarzanie...";
        try {
            const adding = !isAlreadyFriend;
            await toggleFriendInDB(currentViewedUserId, adding);
            isAlreadyFriend = adding;
            // Musimy ponownie sprawdzić czy jesteśmy mutuals z bazy, ale dla płynności UI można założyć, że isMutual się nie zmieni od razu po naszej akcji (bo to od nich zależy)
            updateFriendBtnUI(isAlreadyFriend, isMutual);
        } catch (error) {
            alert("Wystąpił błąd podczas zmiany statusu.");
            updateFriendBtnUI(isAlreadyFriend, isMutual); 
        }
    });
}

const tabs = [
    { btn: tabEdit, sec: sectionEdit, action: null },
    { btn: tabFriends, sec: sectionFriends, action: loadFriends },
    { btn: tabFavorites, sec: sectionFavorites, action: () => loadFavorites(currentViewedUserId) }
];

tabs.forEach(t => {
    if (t.btn && t.sec) {
        t.btn.addEventListener('click', () => {
            tabs.forEach(other => {
                other.btn.classList.remove('active');
                other.sec.classList.remove('active');
            });
            t.btn.classList.add('active');
            t.sec.classList.add('active');
            if (t.action) t.action();
        });
    }
});

const userNameDisplay = document.getElementById('user-name-display');
if (userNameDisplay) {
    userNameDisplay.addEventListener('click', () => {
        if (auth.currentUser) showUserProfile(auth.currentUser.uid);
    });
}

export const hideProfilePanel = () => {
    if (profilePanel) profilePanel.classList.remove('active');
};

const closeProfileBtn = document.getElementById('close-profile-btn');
if (closeProfileBtn) closeProfileBtn.addEventListener('click', hideProfilePanel);

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;

        const newPhotoUrl = profilePicUrlInput.value.trim();
        const newBio = profileBioInput.value.trim();
        saveProfileBtn.textContent = "Zapisywanie...";
        
        try {
            await updateProfile(auth.currentUser, { photoURL: newPhotoUrl });
            await setDoc(doc(db, "users", auth.currentUser.uid), {
                bio: newBio,
                photoURL: newPhotoUrl
            }, { merge: true });
            
            saveProfileBtn.textContent = "Zapisano!";
            profileAvatarPreview.src = newPhotoUrl || DEFAULT_AVATAR;
            setTimeout(() => { saveProfileBtn.textContent = "Zapisz zmiany"; }, 2000);
        } catch (error) { 
            saveProfileBtn.textContent = "Błąd zapisu!"; 
            setTimeout(() => { saveProfileBtn.textContent = "Zapisz zmiany"; }, 2000);
        }
    });
}