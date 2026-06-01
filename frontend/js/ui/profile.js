import { auth } from '../api/firebase-config.js'; 
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { loadFriends, checkIsFriend, toggleFriendInDB } from './friends.js';

const API_BASE = 'http://jawor.wzks.uj.edu.pl:32207/api';
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
let isMutual = false;

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
        const response = await fetch(`${API_BASE}/favorites/${uid}`);
        if (!response.ok) throw new Error("Błąd sieci");
        const favs = await response.json();

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
        const response = await fetch(`${API_BASE}/users/${uid}`);
        
        if (response.ok) {
            const data = await response.json();
            profileAvatarPreview.src = data.photoURL || DEFAULT_AVATAR;

            if (isMe) {
                profileNameTitle.textContent = "@" + (data.userName || "Użytkownik");
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

                isAlreadyFriend = await checkIsFriend(uid);
                
                const reverseCheck = await fetch(`${API_BASE}/friends/check?userId=${uid}&friendId=${auth.currentUser.uid}`);
                const reverseData = await reverseCheck.json();
                isMutual = isAlreadyFriend && reverseData.isFriend;

                const baseName = "@" + (data.userName || "Użytkownik");
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
            
            await fetch(`${API_BASE}/users/${auth.currentUser.uid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bio: newBio, photoURL: newPhotoUrl })
            });
            
            saveProfileBtn.textContent = "Zapisano!";
            profileAvatarPreview.src = newPhotoUrl || DEFAULT_AVATAR;
            setTimeout(() => { saveProfileBtn.textContent = "Zapisz zmiany"; }, 2000);
        } catch (error) { 
            saveProfileBtn.textContent = "Błąd zapisu!"; 
            setTimeout(() => { saveProfileBtn.textContent = "Zapisz zmiany"; }, 2000);
        }
    });
}