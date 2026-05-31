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