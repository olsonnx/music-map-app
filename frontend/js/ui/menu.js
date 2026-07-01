const hamburgerBtn = document.getElementById('hamburger-btn');
const menuPanel = document.getElementById('menu-panel');
const closeMenuBtn = document.getElementById('close-menu-btn');
const songSidePanel = document.getElementById('side-panel'); 

// Widoki menu
const menuMain = document.getElementById('menu-main');
const menuAbout = document.getElementById('menu-about');
const menuToplist = document.getElementById('menu-toplist');

// Przyciski nawigacji
const navAbout = document.getElementById('nav-about');
const navToplist = document.getElementById('nav-toplist');
const backBtns = document.querySelectorAll('.back-to-main');

// Przełącznik motywu
const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');

// --- 1. OTWIERANIE I ZAMYKANIE PANELU ---
if (hamburgerBtn && menuPanel) {
    hamburgerBtn.addEventListener('click', () => {
        // Zabezpieczenie: zamykamy inne panele
        if (songSidePanel && songSidePanel.classList.contains('active')) {
            const closeSongPanelBtn = document.getElementById('close-panel-btn');
            if (closeSongPanelBtn) closeSongPanelBtn.click();
        }
        const searchModal = document.getElementById('search-modal');
        if (searchModal) searchModal.classList.remove('active');

        // Otwieramy na głównym widoku (jeśli istnieje)
        switchMenuTab(menuMain);
        menuPanel.classList.add('active');
    });
}

if (closeMenuBtn && menuPanel) {
    closeMenuBtn.addEventListener('click', () => {
        menuPanel.classList.remove('active');
    });
}

// --- 2. NAWIGACJA WEWNĄTRZ MENU ---
function switchMenuTab(tabToShow) {
    // Ukrywamy wszystko tylko wtedy, gdy istnieją w DOM
    if (menuMain) menuMain.style.display = 'none';
    if (menuAbout) menuAbout.style.display = 'none';
    if (menuToplist) menuToplist.style.display = 'none';
    
    // Pokazujemy docelowy
    if (tabToShow) {
        tabToShow.style.display = tabToShow === menuMain ? 'flex' : 'block';
    }
}

if (navAbout) navAbout.addEventListener('click', () => switchMenuTab(menuAbout));
if (navToplist) navToplist.addEventListener('click', () => switchMenuTab(menuToplist));

backBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMenuTab(menuMain));
});

// --- 3. TRYB JASNY / CIEMNY ---
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    if (themeToggle) themeToggle.checked = true;
    if (themeLabel) themeLabel.textContent = "Tryb ciemny";
}

// --- 4. USTAWIENIA DOSTĘPNOŚCI (WCAG) ---
const fontDecreaseBtn = document.getElementById('font-decrease');
const fontResetBtn = document.getElementById('font-reset');
const fontIncreaseBtn = document.getElementById('font-increase');
const highContrastToggle = document.getElementById('high-contrast-toggle');

// Pobieranie zapisanego rozmiaru czcionki
let currentFontSize = parseInt(localStorage.getItem('fontSize')) || 14;
document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);

const updateFontSize = (size) => {
    currentFontSize = size;
    document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
    localStorage.setItem('fontSize', currentFontSize);
};

// Limity wielkości
if (fontDecreaseBtn) fontDecreaseBtn.addEventListener('click', () => updateFontSize(Math.max(12, currentFontSize - 2)));
if (fontResetBtn) fontResetBtn.addEventListener('click', () => updateFontSize(14));
if (fontIncreaseBtn) fontIncreaseBtn.addEventListener('click', () => updateFontSize(Math.min(24, currentFontSize + 2)));

// Inicjalizacja i obsługa wysokiego kontrastu
const isHighContrast = localStorage.getItem('highContrast') === 'true';
if (isHighContrast) {
    document.body.classList.add('high-contrast');
    if (highContrastToggle) highContrastToggle.checked = true;
}

if (highContrastToggle) {
    highContrastToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('high-contrast');
            localStorage.setItem('highContrast', 'true');
            // Wyłączamy tryb jasny, jeśli kontrast jest włączony, by uniknąć konfliktów
            document.body.classList.remove('light-mode');
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) themeToggle.checked = false;
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('high-contrast');
            localStorage.setItem('highContrast', 'false');
        }
    });
}

if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
            if (themeLabel) themeLabel.textContent = "Tryb ciemny"; 
        } else {
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
            if (themeLabel) themeLabel.textContent = "Tryb jasny";
        }
    });
}