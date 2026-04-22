let selectedFile = null;
let selectedCover = null;

async function uploadSong() {
    if (!window.currentUser) {
        showToast('Login dulu untuk upload!', 2000);
        return;
    }
    
    const title = document.getElementById('songTitle')?.value.trim();
    const artist = document.getElementById('songArtist')?.value.trim();
    const genre = document.getElementById('songGenre')?.value;
    const mp3File = selectedFile || document.getElementById('mp3File')?.files[0];
    const coverFile = selectedCover || document.getElementById('coverFile')?.files[0];
    
    if (!title || !artist) { showToast('Isi judul dan artis', 2000); return; }
    if (!mp3File) { showToast('Pilih file MP3', 2000); return; }
    
    showToast('Uploading...', 1500);
    
    try {
        let mp3Url, coverUrl = null;
        
        const mp3FileName = `${Date.now()}_${mp3File.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: mp3Error } = await supabase.storage.from('songs').upload(mp3FileName, mp3File);
        if (mp3Error) throw new Error('Bucket "songs" belum dibuat di Supabase Storage!');
        
        const { data: mp3Public } = supabase.storage.from('songs').getPublicUrl(mp3FileName);
        mp3Url = mp3Public.publicUrl;
        
        if (coverFile) {
            const coverFileName = `cover_${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            await supabase.storage.from('covers').upload(coverFileName, coverFile);
            const { data: coverPublic } = supabase.storage.from('covers').getPublicUrl(coverFileName);
            coverUrl = coverPublic.publicUrl;
        }
        
        let duration = 180;
        try {
            const tempAudio = new Audio();
            tempAudio.src = mp3Url;
            await new Promise(resolve => {
                tempAudio.onloadedmetadata = () => { duration = Math.floor(tempAudio.duration); resolve(); };
                setTimeout(resolve, 2000);
            });
        } catch(e) {}
        
        await supabase.from('songs').insert([{
            title, artist, genre: genre || null, duration,
            cover_url: coverUrl || `https://picsum.photos/200/200?random=${Date.now()}`,
            mp3_url: mp3Url, user_id: window.currentUser.id, user_email: window.currentUser.email,
            play_count: 0, created_at: new Date().toISOString()
        }]);
        
        showToast(`✅ "${title}" berhasil diupload!`, 3000);
        
        document.getElementById('songTitle').value = '';
        document.getElementById('songArtist').value = '';
        document.getElementById('mp3File').value = '';
        document.getElementById('coverFile').value = '';
        document.getElementById('coverPreview').innerHTML = '';
        selectedFile = null;
        selectedCover = null;
        document.getElementById('uploadDetails').style.display = 'none';
        document.getElementById('dropzone').style.display = 'block';
        
        if (window.loadAllSongs) await window.loadAllSongs();
        
    } catch (error) {
        showToast('Gagal: ' + error.message, 4000);
        console.error(error);
    }
}

function setupDragAndDrop() {
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;
    
    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = '#1DB954'; };
    dropzone.ondragleave = () => { dropzone.style.borderColor = ''; };
    dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && (file.type === 'audio/mpeg' || file.name.endsWith('.mp3'))) {
            selectedFile = file;
            document.getElementById('uploadDetails').style.display = 'block';
            dropzone.style.display = 'none';
            showToast(`File: ${file.name}`, 1500);
        } else { showToast('File harus MP3!', 2000); }
    };
    
    const selectBtn = document.getElementById('selectFileBtn');
    const mp3Input = document.getElementById('mp3File');
    if (selectBtn && mp3Input) {
        selectBtn.onclick = () => mp3Input.click();
        mp3Input.onchange = (e) => {
            if (e.target.files.length) {
                selectedFile = e.target.files[0];
                document.getElementById('uploadDetails').style.display = 'block';
                dropzone.style.display = 'none';
            }
        };
    }
    
    const coverInput = document.getElementById('coverFile');
    const coverPreview = document.getElementById('coverPreview');
    if (coverInput && coverPreview) {
        coverInput.onchange = (e) => {
            if (e.target.files.length) {
                selectedCover = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => { coverPreview.innerHTML = `<img src="${ev.target.result}" style="width:80px;height:80px;border-radius:8px">`; };
                reader.readAsDataURL(selectedCover);
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('uploadSubmitBtn')?.addEventListener('click', uploadSong);
    setupDragAndDrop();
});

window.uploadSong = uploadSong;
