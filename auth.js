// ============================================
// YAMIFY ULTIMATE - Authentication Module FIXED
// ============================================

async function checkAuthAndLoad() {
    await getCurrentUser();
    
    if (currentUser) {
        const userAvatarEl = document.getElementById('userAvatar');
        const userNameEl = document.getElementById('userName');
        const userMenu = document.getElementById('userMenu');
        
        if (userAvatarEl) {
            const avatarUrl = currentUser.user_metadata?.avatar_url;
            userAvatarEl.src = avatarUrl || `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${currentUser.email}&size=32&rounded=true`;
        }
        
        if (userNameEl) {
            const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0];
            userNameEl.textContent = name;
        }
        
        if (userMenu) userMenu.style.display = 'flex';
        
        await loadLikedSongs();
        await loadUserPlaylists();
        loadUserSettings();
        
        return true;
    }
    
    const guestMode = localStorage.getItem('yamify_guest') === 'true';
    if (!guestMode && window.location.pathname.includes('dashboard.html')) {
        window.location.href = '/index.html';
        return false;
    }
    
    if (guestMode) {
        showToast('Mode Tamu - Login untuk upload & playlist', 3000);
    }
    
    return false;
}

async function ensureAuth() {
    if (!currentUser) {
        showToast('Login dulu untuk fitur ini', 2000, 'error');
        setTimeout(() => window.location.href = '/index.html', 1500);
        return false;
    }
    return true;
}

function loadUserSettings() {
    const savedTheme = loadFromLocalStorage('theme', 'dark');
    const savedQuality = loadFromLocalStorage('quality', 'medium');
    const savedDataSaver = loadFromLocalStorage('dataSaver', false);
    const savedCrossfade = loadFromLocalStorage('crossfade', 0);
    
    currentQuality = savedQuality;
    dataSaverMode = savedDataSaver;
    crossfadeDuration = savedCrossfade;
    
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveToLocalStorage('theme', theme);
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });
}

function logout() {
    logoutUser();
}

// ========== FIX LOGIN GOOGLE ==========
async function handleGoogleLogin() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error('Login error:', error);
        showToast('Gagal login: ' + error.message, 3000, 'error');
    }
}

// ========== EXPORT GLOBAL ==========
window.ensureAuth = ensureAuth;
window.applyTheme = applyTheme;
window.handleGoogleLogin = handleGoogleLogin;

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});

console.log('✅ Auth module ready');