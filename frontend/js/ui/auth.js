import { auth } from '../api/firebase-config.js'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// Usunięto importy firebase-firestore
import { hideProfilePanel } from './profile.js'; 

const API_BASE = 'http://jawor.wzks.uj.edu.pl:32207/api'; 

const openAuthBtn = document.getElementById('open-auth-btn');
const userMenu = document.getElementById('user-menu');
const userNameDisplay = document.getElementById('user-name-display'); 
const logoutBtn = document.getElementById('logout-btn');

export const authModal = document.getElementById('auth-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const usernameInput = document.getElementById('username-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const actionBtn = document.getElementById('action-btn');
const toggleHint = document.getElementById('toggle-hint');
const toggleLink = document.getElementById('toggle-link');

let isLoginMode = true;

toggleLink.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        modalTitle.textContent = "Witaj ponownie!";
        modalDesc.textContent = "Zaloguj się, aby dodawać utwory.";
        usernameInput.style.display = 'none';
        actionBtn.textContent = "Zaloguj się";
        toggleHint.textContent = "Nie masz konta?";
        toggleLink.textContent = "Zarejestruj się";
    } else {
        modalTitle.textContent = "Dołącz do nas";
        modalDesc.textContent = "Wybierz nazwę i stwórz konto.";
        usernameInput.style.display = 'block';
        actionBtn.textContent = "Zarejestruj nowe konto";
        toggleHint.textContent = "Masz już konto?";
        toggleLink.textContent = "Zaloguj się";
    }
});

openAuthBtn.addEventListener('click', () => authModal.classList.add('active'));
closeModalBtn.addEventListener('click', () => authModal.classList.remove('active'));
authModal.addEventListener('click', (e) => { if(e.target === authModal) authModal.classList.remove('active'); });

actionBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isLoginMode) {
        actionBtn.textContent = "Logowanie...";
        try {
            await signInWithEmailAndPassword(auth, email, password);
            authModal.classList.remove('active');
            emailInput.value = ''; passwordInput.value = '';
        } catch (error) { 
            alert("Błąd logowania. Sprawdź e-mail i hasło."); 
        }
        actionBtn.textContent = "Zaloguj się";
    } else {
        const username = usernameInput.value.trim();
        if (!username) { alert("Musisz podać nazwę użytkownika!"); return; }

        actionBtn.textContent = "Sprawdzanie nazwy...";

        try {
            // SPRAWDZAMY W MYSQL CZY NICK JEST ZAJĘTY
            const checkRes = await fetch(`${API_BASE}/users/find?nick=${username.toLowerCase()}`);
            if (checkRes.ok) { 
                alert("Ta nazwa użytkownika jest już zajęta. Wybierz inną!");
                actionBtn.textContent = "Zarejestruj nowe konto";
                return; 
            }

            actionBtn.textContent = "Tworzenie konta...";

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: username });

            // ZAPISUJEMY UŻYTKOWNIKA DO MYSQL ZAMIAST FIRESTORE
            await fetch(`${API_BASE}/users/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.uid,
                    userName: username,
                    photoURL: ""
                })
            });

            userNameDisplay.textContent = "@" + username;
            authModal.classList.remove('active');
            emailInput.value = ''; passwordInput.value = ''; usernameInput.value = '';
        } catch (error) { 
            alert("Błąd rejestracji: " + error.message); 
        }
        actionBtn.textContent = "Zarejestruj nowe konto";
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        openAuthBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        userNameDisplay.textContent = "@" + (user.displayName || "Użytkownik");
        
        if (user.displayName) {
            try {
                // Przy każdym logowaniu upewniamy się, że użytkownik jest w MySQL
                await fetch(`${API_BASE}/users/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: user.uid,
                        userName: user.displayName,
                        photoURL: user.photoURL || ""
                    })
                });
            } catch (e) { console.error("Błąd synchronizacji usera: ", e); }
        }
    } else {
        openAuthBtn.style.display = 'block';
        userMenu.style.display = 'none';
        hideProfilePanel(); 
    }
});