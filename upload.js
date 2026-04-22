// ============================================
// YAMIFY - Upload Logic
// ============================================

async function uploadSong() {
    const title = document.getElementById('songName')?.value.trim();
    const artist = document.getElementById('artistName')?.value.trim();
    const mp3File = document.getElementById('mp3File')?.files[0];
    const coverFile = document.getElementById('coverFile')?.files[0];
    
    if (!title || !artist) {
        showUploadStatus('❌ Nama lagu dan penyanyi wajib diisi!', 'error');
        return;
    }
    
    if (!mp3File) {
        showUploadStatus('❌ Pilih file MP3 dulu!', 'error');
        return;
    }
    
    if (mp3File.type !== 'audio/mpeg') {
        showUploadStatus('❌ File harus MP3!', 'error');
        return;
    }
    
    showUploadStatus('⏫ Mengupload... Jangan tutup halaman!', 'info');
    
    try {
        let mp3Url = null;
        let coverUrl = null;
        
        // Upload MP3 ke bucket songs
        const mp3FileName = `${Date.now()}_${mp3File.name}`;
        const { data: mp3Data, error: mp3Error } = await supabase.storage
            .from('songs')
            .upload(mp3FileName, mp3File);
        
        if (mp3Error) throw new Error('Upload MP3 gagal: ' + mp3Error.message);
        
        // Dapatkan public URL MP3
        const { data: mp3PublicUrl } = supabase.storage
            .from('songs')
            .getPublicUrl(mp3FileName);
        mp3Url = mp3PublicUrl.publicUrl;
        
        // Upload cover jika ada
        if (coverFile) {
            const coverFileName = `cover_${Date.now()}_${coverFile.name}`;
            const { data: coverData, error: coverError } = await supabase.storage
                .from('covers')
                .upload(coverFileName, coverFile);
            
            if (!coverError) {
                const { data: coverPublicUrl } = supabase.storage
                    .from('covers')
                    .getPublicUrl(coverFileName);
                coverUrl = coverPublicUrl.publicUrl;
            }
        }
        
        // Baca durasi MP3
        let duration = 0;
        try {
            duration = await getAudioDuration(mp3Url);
        } catch (e) {
            console.warn('Gagal baca durasi:', e);
            duration = 180; // default 3 menit
        }
        
        // Simpan ke database
        const { data, error } = await supabase
            .from('songs')
            .insert([{
                title: title,
                artist: artist,
                duration: duration,
                cover_url: coverUrl || 'https://picsum.photos/200/200?random=' + Date.now(),
                mp3_url: mp3Url,
                user_id: currentUser?.id,
                user_email: currentUser?.email,
                play_count: 0
            }]);
        
        if (error) throw new Error(error.message);
        
        showUploadStatus('✅ Lagu berhasil diupload!', 'success');
        
        // Reset form
        document.getElementById('songName').value = '';
        document.getElementById('artistName').value = '';
        document.getElementById('mp3File').value = '';
        document.getElementById('coverFile').value = '';
        
        // Refresh library
        await loadAllSongs();
        
        // Kembali ke library
        showPanel('library');
        
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('❌ Gagal upload: ' + error.message, 'error');
    }
}

function getAudioDuration(url) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            resolve(Math.floor(audio.duration));
        });
        audio.addEventListener('error', () => {
            reject('Gagal load audio');
        });
        audio.src = url;
    });
}

function showUploadStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = 'upload-status ' + type;
    
    setTimeout(() => {
        if (type !== 'error') {
            statusDiv.textContent = '';
            statusDiv.className = 'upload-status';
        }
    }, 4000);
}