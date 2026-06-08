import { auth } from '../api/firebase-config.js'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { hideProfilePanel } from './profile.js'; 

const API_BASE = 'https://jawor.wzks.uj.edu.pl/~22_ruszkowski/frontend/frontend/api';

const openAuthBtn = document.getElementById('open-auth-btn');
const userMenu = document.getElementById('user-menu');
const userNameDisplay = document.getElementById('user-name-display'); 
const logoutBtn = document.getElementById('logout-btn');

// Elementy okna modalnego
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
const forgotPasswordContainer = document.getElementById('forgot-password-container');
const forgotPasswordLink = document.getElementById('forgot-password-link');

// Flaga określająca, czy aktualnie jesteśmy w trybie logowania (czy rejestracji)
let isLoginMode = true;

// Obsługa przełączania widoku między logowaniem a rejestracją
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

// Obsługa otwierania i zamykania modala
openAuthBtn.addEventListener('click', () => authModal.classList.add('active'));
closeModalBtn.addEventListener('click', () => authModal.classList.remove('active'));
authModal.addEventListener('click', (e) => { if(e.target === authModal) authModal.classList.remove('active'); });

// Główna logika dla przycisku akcji (logowanie lub rejestracja)
actionBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isLoginMode) {
        // Logowanie użytkownika
        actionBtn.textContent = "Logowanie...";
        try {
            await signInWithEmailAndPassword(auth, email, password);
            authModal.classList.remove('active');
            emailInput.value = ''; passwordInput.value = '';
        } catch (error) { 
            alert("Błąd logowania. Sprawdź e-mail i hasło."); 
        }
        actionBtn.textContent = "Zaloguj się";
        if (forgotPasswordContainer) forgotPasswordContainer.style.display = 'block';
    } else {
        // Rejestracja użytkownika
        const username = usernameInput.value.trim();
        if (!username) { alert("Musisz podać nazwę użytkownika!"); return; }

        actionBtn.textContent = "Sprawdzanie nazwy...";

        try {
            // Sprawdzamy w MySQL, czy wybrany nick jest wolny
            const checkRes = await fetch(`${API_BASE}/users/find?nick=${username.toLowerCase()}`);
            if (checkRes.ok) { 
                alert("Ta nazwa użytkownika jest już zajęta. Wybierz inną!");
                actionBtn.textContent = "Zarejestruj nowe konto";
                return; 
            }

            actionBtn.textContent = "Tworzenie konta...";

            // Tworzymy użytkownika w Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Ustawiamy nazwę użytkownika w profilu Firebase
            await updateProfile(user, { displayName: username });

            // Synchronizujemy dane z naszą bazą MySQL
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
        if (forgotPasswordContainer) forgotPasswordContainer.style.display = 'none';
    }
});

// Obsługa resetowania hasła
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) {
            alert("Wpisz swój adres e-mail w polu powyżej, a następnie kliknij 'Zapomniałeś hasła?'.");
            return;
        }
        
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Wysłano link do resetowania hasła! Sprawdź swoją skrzynkę odbiorczą (oraz folder SPAM).");
        } catch (error) {
            alert("Błąd: Nie znaleziono konta z takim adresem e-mail lub podano nieprawidłowy format.");
        }
    });
}

// Wylogowywanie
logoutBtn.addEventListener('click', () => signOut(auth));

// Nasłuchiwanie stanu zalogowania
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Użytkownik zalogowany - pokazujemy menu i zmieniamy widoczność przycisków
        openAuthBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        userNameDisplay.textContent = "@" + (user.displayName || "Użytkownik");
        
        if (user.displayName) {
            try {
                // Przy każdym logowaniu aktualizujemy/synchronizujemy dane w MySQL
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
        // Użytkownik wylogowany - przywracamy widok dla gościa
        openAuthBtn.style.display = 'block';
        userMenu.style.display = 'none';
        hideProfilePanel(); 
    }
});
