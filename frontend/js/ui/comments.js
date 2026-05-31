import { auth } from '../api/firebase-config.js'; // Zostawiamy tylko logowanie
// Usunięto wszystkie importy firebase-firestore
import { authModal } from './auth.js';
import { showUserProfile } from './profile.js';

const commentsList = document.getElementById('comments-list');
const commentInput = document.getElementById('comment-input');
const addCommentBtn = document.getElementById('add-comment-btn');

let currentBubbleId = null;

const MAX_CHARS = 140;
let charCounter = null;

if (commentInput) {
    // Fizyczna blokada pola tekstowego
    commentInput.setAttribute('maxlength', MAX_CHARS);
    commentInput.placeholder = `Napisz komentarz...`;
    
    // Tworzenie licznika na żywo w JS
    charCounter = document.createElement('div');
    charCounter.style.fontSize = '11px';
    charCounter.style.color = '#888';
    charCounter.style.marginTop = '3px';
    charCounter.style.paddingBottom = '5px';
    charCounter.style.marginRight = '2px';
    charCounter.style.textAlign = 'right';
    charCounter.textContent = `0 / ${MAX_CHARS}`;
    
    const inputArea = commentInput.parentNode;
    inputArea.parentNode.insertBefore(charCounter, inputArea.nextSibling);

    // Nasłuchiwanie wpisywania
    commentInput.addEventListener('input', () => {
        const len = commentInput.value.length;
        charCounter.textContent = `${len} / ${MAX_CHARS}`;
        charCounter.style.color = len >= MAX_CHARS ? '#e74c3c' : '#888';
    });
}

export const clearComments = () => {
    // Czyszczenie pola i licznika przy zamykaniu panelu
    if (commentInput) commentInput.value = '';
    if (charCounter) {
        charCounter.textContent = `0 / ${MAX_CHARS}`;
        charCounter.style.color = '#888';
    }
};

export const loadComments = async (bubbleId) => {
    currentBubbleId = bubbleId;
    commentsList.innerHTML = '<p style="color: #666; font-size: 13px; text-align: center; margin-top: 20px;">Ładowanie komentarzy...</p>';
    
    try {
        // Pobieramy komentarze z Twojego API zamiast z Firebase
        const response = await fetch(`http://localhost:3000/api/comments/${bubbleId}`);
        const comments = await response.json();

        commentsList.innerHTML = '';
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="color: #666; font-size: 13px; text-align: center; margin-top: 20px;">Brak komentarzy. Bądź pierwszy!</p>';
            return;
        }
        
        comments.forEach((commentData) => {
            const div = document.createElement('div');
            div.className = 'comment-item';
            
            // MySQL wysyła true/false lub 1/0
            if (commentData.isDeleted) {
                div.innerHTML = `
                    <span class="comment-text" style="color: #888; font-style: italic; font-size: 13px;">[ Ten komentarz został usunięty ]</span>
                `;
            } else {
                const isMine = auth.currentUser && auth.currentUser.uid === commentData.userId;
                
                const deleteBtnHtml = isMine 
                    ? `<button class="delete-comment-btn" data-id="${commentData.id}" style="float: right; background: none; border: none; cursor: pointer; color: #e74c3c; font-size: 12px; margin-top: 2px;" title="Usuń komentarz">✖</button>` 
                    : '';

                div.innerHTML = `
                    ${deleteBtnHtml}
                    <span class="comment-author prof-link" data-uid="${commentData.userId}" style="cursor: pointer;" title="Zobacz profil">@${commentData.userName}</span>
                    <span class="comment-text" style="display: block; margin-top: 5px; word-wrap: break-word;">${commentData.text}</span>
                `;
            }
            
            commentsList.appendChild(div);
        });
        commentsList.scrollTop = commentsList.scrollHeight;
    } catch (error) {
        console.error("Błąd pobierania komentarzy:", error);
        commentsList.innerHTML = '<p style="color: red; font-size: 13px; text-align: center;">Błąd ładowania komentarzy.</p>';
    }
};

const submitComment = async () => {
    if (!auth.currentUser) { authModal.classList.add('active'); return; }
    
    const text = commentInput.value.trim();
    if (!text || !currentBubbleId) return;

    if (text.length > MAX_CHARS) {
        alert(`Komentarz jest za długi! Maksymalnie ${MAX_CHARS} znaków.`);
        return;
    }

    try {
        // Wysyłamy POST do Twojego serwera Node.js
        const response = await fetch('http://localhost:3000/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bubbleId: currentBubbleId,
                userId: auth.currentUser.uid,
                text: text
            })
        });

        if (!response.ok) throw new Error('Błąd dodawania komentarza');
        
        // Reset formularza
        commentInput.value = ''; 
        if (charCounter) {
            charCounter.textContent = `0 / ${MAX_CHARS}`;
            charCounter.style.color = '#888';
        }

        // Ręczne odświeżenie listy komentarzy po dodaniu
        loadComments(currentBubbleId);

    } catch (error) { console.error("Błąd dodawania komentarza:", error); }
};

addCommentBtn.addEventListener('click', submitComment);
commentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitComment();
});

// --- NASŁUCHIWANIE KLIKNIĘĆ (PROFILE I USUWANIE) ---
if (commentsList) {
    commentsList.addEventListener('click', async (e) => {
        const profileLink = e.target.closest('.prof-link');
        if (profileLink) {
            const uid = profileLink.getAttribute('data-uid');
            showUserProfile(uid);
            return;
        }

        const deleteBtn = e.target.closest('.delete-comment-btn');
        if (deleteBtn && currentBubbleId) {
            const commentId = deleteBtn.getAttribute('data-id');
            const confirmDelete = confirm("Czy na pewno chcesz usunąć ten komentarz?");
            
            if (confirmDelete) {
                try {
                    // Żądanie typu PATCH do zaktualizowania wpisu na "usunięty"
                    const response = await fetch(`http://localhost:3000/api/comments/${commentId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isDeleted: true })
                    });

                    if (!response.ok) throw new Error('Błąd usuwania komentarza');

                    // Odświeżenie widoku po pomyślnym usunięciu
                    loadComments(currentBubbleId);

                } catch (error) {
                    console.error("Błąd podczas usuwania komentarza:", error);
                    alert("Nie udało się usunąć komentarza.");
                }
            }
        }
    });
}