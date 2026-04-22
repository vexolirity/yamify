// ============================================
// YAMIFY - Upload Module with Drag & Drop FIX
// ============================================

let selectedFile = null;
let selectedCover = null;

async function uploadSong() {
    if (!currentUser) {
        showToast('Login dulu ya biar bisa upload lagu!', 2000, 'error');
        setTimeout(() => window.location.href = '/index.html', 1500);
        return;
    }
    
    const title = document.getElementById('songTitle')?.value.trim();
    const artist = document.getElementById('songArtist')?.value.trim();
    const genre = document.getElementById('songGenre')?.value;
    const mp3File = selectedFile || document.getElementById('mp3File')?.files[0];
    const coverFile = selectedCover || document.getElementById('coverFile')?.files[0];
    
    if (!title || !artist) {
        showUploadStatus('Isi judul dan artis dulu', 'error');
        return;
    }
    
    if (!mp3File) {
        showUploadStatus('Pilih atau drag & drop file MP3', 'error');
        return;
    }
    
    if (mp3File.type !== 'audio/mpeg' && mp3File.type !== 'audio/mp3') {
        showUploadStatus('File harus MP3', 'error');
        return;
    }
    
    if (mp3File.size > 50 * 1024 * 1024) {
        showUploadStatus('File max 50MB', 'error');
        return;
    }
    
    showUploadStatus('Mengupload... Jangan tutup halaman', 'info');
    
    try {
        let mp3Url = null;
        let coverUrl = null;
        
        // Upload MP3
        const mp3FileName = `${Date.now()}_${mp3File.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: mp3Error } = await supabase.storage
            .from('songs')
            .upload(mp3FileName, mp3File);
        
        if (mp3Error) throw new Error('Upload MP3 gagal: ' + mp3Error.message);
        
        const { data: mp3Public } = supabase.storage.from('songs').getPublicUrl(mp3FileName);
        mp3Url = mp3Public.publicUrl;
        
        // Upload cover
        if (coverFile) {
            const coverFileName = `cover_${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { error: coverError } = await supabase.storage
                .from('covers')
                .upload(coverFileName, coverFile);
            
            if (!coverError) {
                const { data: coverPublic } = supabase.storage.from('covers').getPublicUrl(coverFileName);
                coverUrl = coverPublic.publicUrl;
            }
        }
        
        // Get duration
        let duration = 180;
        try {
            const tempAudio = new Audio();
            tempAudio.src = mp3Url;
            await new Promise((resolve) => {
                tempAudio.addEventListener('loadedmetadata', () => {
                    duration = Math.floor(tempAudio.duration);
                    resolve();
                });
                tempAudio.addEventListener('error', () => resolve());
                setTimeout(resolve, 3000);
            });
        } catch(e) {
            console.warn('Gagal baca durasi:', e);
        }
        
        // Save to database
        const { error } = await supabase
            .from('songs')
            .insert([{
                title: title,
                artist: artist,
                genre: genre || null,
                duration: duration,
                cover_url: coverUrl || `https://picsum.photos/200/200?random=${Date.now()}`,
                mp3_url: mp3Url,
                user_id: currentUser.id,
                user_email: currentUser.email,
                play_count: 0,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw new Error(error.message);
        
        showUploadStatus('Upload berhasil!', 'success');
        showToast(`🎵 "${title}" berhasil diupload!`, 3000, 'success');
        
        // Reset form
        document.getElementById('songTitle').value = '';
        document.getElementById('songArtist').value = '';
        document.getElementById('songGenre').value = '';
        document.getElementById('mp3File').value = '';
        document.getElementById('coverFile').value = '';
        selectedFile = null;
        selectedCover = null;
        document.getElementById('uploadDetails').style.display = 'none';
        document.getElementById('dropzone').style.display = 'block';
        
        // Refresh library
        if (typeof loadAllSongs === 'function') await loadAllSongs();
        if (typeof loadLikedSongs === 'function') await loadLikedSongs();
        
        // Switch to library
        if (typeof showPanel === 'function') showPanel('library');
        
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('Gagal: ' + error.message, 'error');
    }
}

function showUploadStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = 'upload-status ' + type;
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'upload-status';
        }, 4000);
    }
}

// ========== DRAG & DROP - FIXED ==========
function setupDragAndDrop() {
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;
    
    // Hapus event listener lama (biar gak double)
    const newDropzone = dropzone.cloneNode(true);
    dropzone.parentNode.replaceChild(newDropzone, dropzone);
    
    const freshDropzone = document.getElementById('dropzone');
    if (!freshDropzone) return;
    
    // Drag Over
    freshDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        freshDropzone.style.borderColor = '#1DB954';
        freshDropzone.style.background = 'rgba(29, 185, 84, 0.15)';
        freshDropzone.style.transform = 'scale(1.02)';
    });
    
    // Drag Leave
    freshDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        freshDropzone.style.borderColor = '';
        freshDropzone.style.background = '';
        freshDropzone.style.transform = '';
    });
    
    // Drop
    freshDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        freshDropzone.style.borderColor = '';
        freshDropzone.style.background = '';
        freshDropzone.style.transform = '';
        
        const files = e.dataTransfer.files;
        console.log('Files dropped:', files);
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.name.endsWith('.mp3')) {
                selectedFile = file;
                
                // Tampilkan nama file yang di-drop
                const fileNameDisplay = document.createElement('div');
                fileNameDisplay.style.cssText = 'margin-top:10px;font-size:12px;color:#1DB954;';
                fileNameDisplay.innerText = `📁 ${file.name}`;
                freshDropzone.appendChild(fileNameDisplay);
                
                document.getElementById('uploadDetails').style.display = 'block';
                freshDropzone.style.display = 'none';
                showToast(`File siap: ${file.name}`, 2000, 'success');
            } else {
                showUploadStatus('File harus MP3!', 'error');
            }
        }
    });
    
    // Select file button
    const selectBtn = document.getElementById('selectFileBtn');
    const mp3Input = document.getElementById('mp3File');
    
    if (selectBtn && mp3Input) {
        // Hapus event listener lama
        const newSelectBtn = selectBtn.cloneNode(true);
        selectBtn.parentNode.replaceChild(newSelectBtn, selectBtn);
        
        document.getElementById('selectFileBtn')?.addEventListener('click', () => {
            mp3Input.click();
        });
        
        mp3Input.onchange = (e) => {
            if (e.target.files.length > 0) {
                selectedFile = e.target.files[0];
                document.getElementById('uploadDetails').style.display = 'block';
                freshDropzone.style.display = 'none';
                showToast(`File dipilih: ${selectedFile.name}`, 1500);
            }
        };
    }
    
    // Cover preview
    const coverInput = document.getElementById('coverFile');
    const coverPreview = document.getElementById('coverPreview');
    
    if (coverInput && coverPreview) {
        coverInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                selectedCover = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    coverPreview.innerHTML = `<img src="${event.target.result}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;">`;
                };
                reader.readAsDataURL(selectedCover);
            }
        };
    }
}

// Inisialisasi saat halaman load
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('uploadSubmitBtn');
    if (submitBtn) {
        // Hapus listener lama
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
        document.getElementById('uploadSubmitBtn')?.addEventListener('click', uploadSong);
    }
    
    setupDragAndDrop();
    console.log('✅ Drag & drop ready');
});

window.uploadSong = uploadSong;