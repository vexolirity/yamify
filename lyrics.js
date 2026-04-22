// ============================================
// YAMIFY ULTIMATE - Lyrics Module
// Fetch Synced Lyrics from API
// ============================================

async function fetchLyrics(songTitle, songArtist) {
    const modal = document.getElementById('lyricsModal');
    const lyricsTitle = document.getElementById('lyricsTitle');
    const lyricsText = document.getElementById('lyricsText');
    
    if (lyricsTitle) lyricsTitle.innerText = `${songTitle} - ${songArtist}`;
    if (lyricsText) lyricsText.innerHTML = '<div class="loading-spinner"></div><p style="text-align:center;margin-top:16px;">Mencari lirik...</p>';
    
    modal.classList.remove('hidden');
    
    try {
        // Try multiple lyric APIs
        let lyrics = await fetchFromLyricsOvh(songTitle, songArtist);
        
        if (!lyrics) {
            lyrics = await fetchFromLRCLIB(songTitle, songArtist);
        }
        
        if (!lyrics) {
            lyrics = await fetchFromMusixmatch(songTitle, songArtist);
        }
        
        if (lyrics && lyricsText) {
            lyricsText.innerHTML = `<div style="white-space:pre-wrap;line-height:1.8;">${escapeHtml(lyrics)}</div>`;
        } else if (lyricsText) {
            lyricsText.innerHTML = '<p style="text-align:center;color:#6A6A6A;">Lirik tidak ditemukan untuk lagu ini</p>';
        }
        
    } catch (error) {
        console.error('Lyrics fetch error:', error);
        if (lyricsText) {
            lyricsText.innerHTML = '<p style="text-align:center;color:#E5484D;">Gagal memuat lirik</p>';
        }
    }
}

async function fetchFromLyricsOvh(title, artist) {
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        const data = await response.json();
        return data.lyrics || null;
    } catch(e) {
        return null;
    }
}

async function fetchFromLRCLIB(title, artist) {
    try {
        const response = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`);
        const data = await response.json();
        return data.syncedLyrics || data.plainLyrics || null;
    } catch(e) {
        return null;
    }
}

async function fetchFromMusixmatch(title, artist) {
    // Musixmatch requires API key, fallback to mock
    return null;
}

function showLyrics() {
    if (currentPlayingSong) {
        fetchLyrics(currentPlayingSong.title, currentPlayingSong.artist);
    } else {
        showToast('Tidak ada lagu yang sedang diputar', 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const lyricsBtn = document.getElementById('lyricsBtn');
    if (lyricsBtn) lyricsBtn.addEventListener('click', showLyrics);
});

window.fetchLyrics = fetchLyrics;
window.showLyrics = showLyrics;