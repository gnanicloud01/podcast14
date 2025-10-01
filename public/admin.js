class AdminDashboard {
    constructor() {
        this.tracks = [];
        this.videos = [];
        this.playlists = [];
        this.currentTab = 'tracks';
        
        this.checkAuthentication();
    }

    async checkAuthentication() {
        // Hide all content initially
        this.hideAllContent();
        this.showAuthLoading();

        try {
            const response = await fetch('/api/auth-status');
            const data = await response.json();
            
            if (!data.authenticated || data.user.role !== 'admin') {
                // Redirect to login immediately
                this.redirectToLogin();
                return;
            }
            
            // User is authenticated, initialize dashboard
            this.hideAuthLoading();
            this.showAllContent();
            this.initializeElements();
            this.bindEvents();
            this.loadData();
            this.setupLogout();
            this.startSessionMonitoring();
        } catch (error) {
            console.error('Auth check error:', error);
            this.redirectToLogin();
        }
    }

    hideAllContent() {
        const mainContent = document.querySelector('.admin-content');
        const navigation = document.querySelector('.admin-nav');
        if (mainContent) mainContent.style.display = 'none';
        if (navigation) navigation.style.display = 'none';
    }

    showAllContent() {
        const mainContent = document.querySelector('.admin-content');
        const navigation = document.querySelector('.admin-nav');
        if (mainContent) mainContent.style.display = 'block';
        if (navigation) navigation.style.display = 'block';
    }

    showAuthLoading() {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'authLoadingOverlay';
        loadingOverlay.innerHTML = `
            <div class="auth-loading-content">
                <div class="loading-spinner"></div>
                <h3>Verifying Authentication...</h3>
                <p>Please wait while we check your credentials</p>
            </div>
        `;
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--primary-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        document.body.appendChild(loadingOverlay);
    }

    hideAuthLoading() {
        const loadingOverlay = document.getElementById('authLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    redirectToLogin() {
        // Clear any existing session data
        this.clearSessionData();
        
        // Show redirect message briefly
        const redirectOverlay = document.createElement('div');
        redirectOverlay.innerHTML = `
            <div class="redirect-message">
                <i class="fas fa-lock"></i>
                <h3>Authentication Required</h3>
                <p>Redirecting to login...</p>
            </div>
        `;
        redirectOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--primary-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: var(--text-primary);
            text-align: center;
        `;
        document.body.appendChild(redirectOverlay);

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
    }

    clearSessionData() {
        // Clear any cached data
        this.tracks = [];
        this.videos = [];
        this.playlists = [];
    }

    startSessionMonitoring() {
        // Check session status every 5 minutes
        this.sessionCheckInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/auth-status');
                const data = await response.json();
                
                if (!data.authenticated || data.user.role !== 'admin') {
                    // Session expired or user no longer admin
                    clearInterval(this.sessionCheckInterval);
                    this.showNotification('Session expired. Please login again.', 'warning');
                    setTimeout(() => {
                        this.redirectToLogin();
                    }, 2000);
                }
            } catch (error) {
                console.error('Session check error:', error);
                // If we can't check session, assume it's expired
                clearInterval(this.sessionCheckInterval);
                this.redirectToLogin();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    setupLogout() {
        // Add logout button to header
        const headerActions = document.querySelector('.header-actions');
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn-secondary';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.onclick = this.handleLogout.bind(this);
        headerActions.appendChild(logoutBtn);
    }

    async handleLogout() {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }

        try {
            // Show logout loading
            const logoutBtn = document.querySelector('button[onclick*="handleLogout"]');
            if (logoutBtn) {
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
                logoutBtn.disabled = true;
            }

            const response = await fetch('/api/logout', { method: 'POST' });
            if (response.ok) {
                // Clear local data
                this.clearSessionData();
                
                // Show success message
                this.showNotification('Logged out successfully', 'success');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Error during logout', 'error');
            
            // Re-enable logout button
            const logoutBtn = document.querySelector('button[onclick*="handleLogout"]');
            if (logoutBtn) {
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                logoutBtn.disabled = false;
            }
        }
    }

    initializeElements() {
        this.tabButtons = document.querySelectorAll('.admin-nav li');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.tracksTableBody = document.getElementById('tracksTableBody');
        this.videosTableBody = document.getElementById('videosTableBody');
        this.playlistsGrid = document.getElementById('playlistsGrid');
        this.totalTracksEl = document.getElementById('totalTracks');
        this.totalDurationEl = document.getElementById('totalDuration');
        this.totalVideosEl = document.getElementById('totalVideos');
        this.totalVideoDurationEl = document.getElementById('totalVideoDuration');
    }

    bindEvents() {
        // Tab navigation
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Form submissions
        document.getElementById('addTrackForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTrack();
        });

        document.getElementById('addPlaylistForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPlaylist();
        });

        document.getElementById('addVideoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addVideo();
        });

        // Auto-detect file type and suggest category
        document.getElementById('videoUrl').addEventListener('input', (e) => {
            this.autoDetectVideoCategory(e.target.value);
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    switchTab(tabName) {
        // Update navigation
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        this.tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');

        this.currentTab = tabName;
    }

    async loadData() {
        await Promise.all([
            this.loadTracks(),
            this.loadVideos(),
            this.loadPlaylists()
        ]);
        this.updateStats();
    }

    async loadTracks() {
        try {
            const response = await fetch('/api/tracks');
            this.tracks = await response.json();
            this.renderTracksTable();
        } catch (error) {
            console.error('Error loading tracks:', error);
            this.showNotification('Error loading tracks', 'error');
        }
    }

    async loadVideos() {
        try {
            const response = await fetch('/api/videos');
            this.videos = await response.json();
            this.renderVideosTable();
        } catch (error) {
            console.error('Error loading videos:', error);
            this.showNotification('Error loading videos', 'error');
        }
    }

    async loadPlaylists() {
        try {
            const response = await fetch('/api/playlists');
            this.playlists = await response.json();
            this.renderPlaylistsGrid();
        } catch (error) {
            console.error('Error loading playlists:', error);
            this.showNotification('Error loading playlists', 'error');
        }
    }

    renderTracksTable() {
        this.tracksTableBody.innerHTML = '';
        
        this.tracks.forEach(track => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${track.cover_image || 'https://via.placeholder.com/50x50?text=♪'}" 
                         alt="${track.title}" class="track-cover">
                </td>
                <td>
                    <div class="track-title">${track.title}</div>
                </td>
                <td>${track.artist}</td>
                <td>${track.album || '-'}</td>
                <td>${this.formatDuration(track.duration)}</td>
                <td>
                    <div class="track-actions">
                        <button class="action-btn edit" onclick="adminDashboard.editTrack(${track.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="adminDashboard.deleteTrack(${track.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn" onclick="adminDashboard.testTrack('${track.url}')" title="Test Play">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                </td>
            `;
            this.tracksTableBody.appendChild(row);
        });
    }

    renderVideosTable() {
        this.videosTableBody.innerHTML = '';
        
        this.videos.forEach(video => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${video.thumbnail || 'https://via.placeholder.com/80x45?text=📹'}" 
                         alt="${video.title}" class="video-thumbnail-small">
                </td>
                <td>
                    <div class="video-title">${video.title}</div>
                    <div class="video-description-small">${(video.description || '').substring(0, 50)}${video.description && video.description.length > 50 ? '...' : ''}</div>
                </td>
                <td>${video.category || '-'}</td>
                <td>${this.formatDuration(video.duration)}</td>
                <td>
                    <div class="video-actions">
                        <button class="action-btn edit" onclick="adminDashboard.editVideo(${video.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="adminDashboard.deleteVideo(${video.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn" onclick="adminDashboard.previewVideo('${video.url}')" title="Preview">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                </td>
            `;
            this.videosTableBody.appendChild(row);
        });
    }

    renderPlaylistsGrid() {
        this.playlistsGrid.innerHTML = '';
        
        this.playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="playlist-header">
                    <div class="playlist-title">${playlist.name}</div>
                    <div class="playlist-actions">
                        <button class="action-btn edit" onclick="adminDashboard.editPlaylist(${playlist.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="adminDashboard.deletePlaylist(${playlist.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="playlist-description">${playlist.description || 'No description'}</div>
                <div class="playlist-stats">
                    <span><i class="fas fa-music"></i> 0 tracks</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(playlist.created_at).toLocaleDateString()}</span>
                </div>
            `;
            this.playlistsGrid.appendChild(card);
        });
    }

    updateStats() {
        this.totalTracksEl.textContent = this.tracks.length;
        
        const totalSeconds = this.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        this.totalDurationEl.textContent = `${hours}h ${minutes}m`;

        if (this.totalVideosEl) {
            this.totalVideosEl.textContent = this.videos.length;
            
            const totalVideoSeconds = this.videos.reduce((sum, video) => sum + (video.duration || 0), 0);
            const videoHours = Math.floor(totalVideoSeconds / 3600);
            const videoMinutes = Math.floor((totalVideoSeconds % 3600) / 60);
            this.totalVideoDurationEl.textContent = `${videoHours}h ${videoMinutes}m`;
        }
    }

    async addTrack() {
        const formData = {
            title: document.getElementById('trackTitle').value,
            artist: document.getElementById('trackArtist').value,
            album: document.getElementById('trackAlbum').value,
            url: document.getElementById('trackUrl').value,
            cover_image: document.getElementById('trackCover').value
        };

        // Validate URL
        if (!this.isValidUrl(formData.url)) {
            this.showNotification('Please enter a valid URL', 'error');
            return;
        }

        // Enforce file type separation
        if (this.isVideoFile(formData.url)) {
            this.showNotification('Error: MP4 and video files must be added to the Videos section, not Music tracks.', 'error');
            return;
        }
        
        if (!this.isAudioFile(formData.url)) {
            this.showNotification('Warning: This URL may not be a valid audio file. Supported formats: MP3, WAV, AAC, FLAC, M4A, WMA', 'warning');
        }

        try {
            // Test the audio URL
            const duration = await this.getAudioDuration(formData.url);
            formData.duration = duration;

            const response = await fetch('/api/tracks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showNotification('Track added successfully!', 'success');
                this.closeModal('addTrackModal');
                this.loadTracks();
                document.getElementById('addTrackForm').reset();
            } else {
                throw new Error('Failed to add track');
            }
        } catch (error) {
            console.error('Error adding track:', error);
            this.showNotification('Error adding track. Please check the URL and try again.', 'error');
        }
    }

    async addVideo() {
        const formData = {
            title: document.getElementById('videoTitle').value,
            description: document.getElementById('videoDescription').value,
            category: document.getElementById('videoCategory').value,
            url: document.getElementById('videoUrl').value,
            thumbnail: document.getElementById('videoThumbnail').value,
            duration: parseInt(document.getElementById('videoDuration').value) || 0
        };

        // Validate URL
        if (!this.isValidUrl(formData.url)) {
            this.showNotification('Please enter a valid URL', 'error');
            return;
        }

        try {
            const response = await fetch('/api/videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showNotification('Video added successfully!', 'success');
                this.closeModal('addVideoModal');
                this.loadVideos();
                document.getElementById('addVideoForm').reset();
            } else {
                throw new Error('Failed to add video');
            }
        } catch (error) {
            console.error('Error adding video:', error);
            this.showNotification('Error adding video', 'error');
        }
    }

    async addPlaylist() {
        const formData = {
            name: document.getElementById('playlistName').value,
            description: document.getElementById('playlistDescription').value
        };

        try {
            const response = await fetch('/api/playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showNotification('Playlist created successfully!', 'success');
                this.closeModal('addPlaylistModal');
                this.loadPlaylists();
                document.getElementById('addPlaylistForm').reset();
            } else {
                throw new Error('Failed to create playlist');
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            this.showNotification('Error creating playlist', 'error');
        }
    }

    async deleteTrack(id) {
        if (!confirm('Are you sure you want to delete this track?')) {
            return;
        }

        try {
            const response = await fetch(`/api/tracks/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Track deleted successfully!', 'success');
                this.loadTracks();
            } else {
                throw new Error('Failed to delete track');
            }
        } catch (error) {
            console.error('Error deleting track:', error);
            this.showNotification('Error deleting track', 'error');
        }
    }

    async deleteVideo(id) {
        if (!confirm('Are you sure you want to delete this video?')) {
            return;
        }

        try {
            const response = await fetch(`/api/videos/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Video deleted successfully!', 'success');
                this.loadVideos();
            } else {
                throw new Error('Failed to delete video');
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            this.showNotification('Error deleting video', 'error');
        }
    }

    async deletePlaylist(id) {
        if (!confirm('Are you sure you want to delete this playlist?')) {
            return;
        }

        try {
            const response = await fetch(`/api/playlists/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Playlist deleted successfully!', 'success');
                this.loadPlaylists();
            } else {
                throw new Error('Failed to delete playlist');
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            this.showNotification('Error deleting playlist', 'error');
        }
    }

    editTrack(id) {
        // Implementation for editing tracks
        this.showNotification('Edit functionality coming soon!', 'info');
    }

    editVideo(id) {
        // Implementation for editing videos
        this.showNotification('Edit functionality coming soon!', 'info');
    }

    editPlaylist(id) {
        // Implementation for editing playlists
        this.showNotification('Edit functionality coming soon!', 'info');
    }

    previewVideo(url) {
        // Open video in new tab for preview
        window.open(url, '_blank');
    }

    autoDetectVideoCategory(url) {
        if (!url) return;
        
        const categorySelect = document.getElementById('videoCategory');
        const urlLower = url.toLowerCase();
        
        // Auto-suggest category based on file type and URL patterns
        if (urlLower.includes('.mp4')) {
            // Check if it might be a podcast based on filename or path
            if (urlLower.includes('podcast') || urlLower.includes('audio') || urlLower.includes('talk')) {
                categorySelect.value = 'Podcast';
                this.showNotification('Auto-detected: MP4 file with podcast indicators. Category set to "Podcast".', 'info');
            } else {
                categorySelect.value = 'Music Video';
                this.showNotification('Auto-detected: MP4 file. Category set to "Music Video". Change if needed.', 'info');
            }
        } else if (urlLower.includes('tutorial') || urlLower.includes('howto')) {
            categorySelect.value = 'Tutorial';
        } else if (urlLower.includes('interview')) {
            categorySelect.value = 'Interview';
        } else if (urlLower.includes('performance') || urlLower.includes('live')) {
            categorySelect.value = 'Performance';
        }
    }

    testTrack(url) {
        const audio = new Audio(url);
        audio.volume = 0.3;
        audio.play().catch(error => {
            console.error('Error testing track:', error);
            this.showNotification('Error playing track. Please check the URL.', 'error');
        });
        
        setTimeout(() => {
            audio.pause();
        }, 3000);
        
        this.showNotification('Playing 3-second preview...', 'info');
    }

    async getAudioDuration(url) {
        return new Promise((resolve) => {
            const audio = new Audio(url);
            audio.addEventListener('loadedmetadata', () => {
                resolve(Math.floor(audio.duration) || 0);
            });
            audio.addEventListener('error', () => {
                resolve(0);
            });
        });
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    formatDuration(seconds) {
        if (!seconds) return '-';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    convertGoogleDriveUrl(url) {
        if (!url) {
            url = document.getElementById('googleDriveUrl').value;
        }
        
        if (!url) {
            this.showNotification('Please enter a Google Drive URL', 'warning');
            return;
        }

        // Extract file ID from various Google Drive URL formats
        let fileId = null;
        
        // Format: https://drive.google.com/file/d/FILE_ID/view
        let match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
            fileId = match[1];
        }
        
        // Format: https://drive.google.com/open?id=FILE_ID
        if (!fileId) {
            match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
            if (match) {
                fileId = match[1];
            }
        }

        if (fileId) {
            const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            document.getElementById('trackUrl').value = directUrl;
            document.getElementById('googleDriveUrl').value = '';
            this.showNotification('Google Drive URL converted successfully!', 'success');
        } else {
            this.showNotification('Invalid Google Drive URL format', 'error');
        }
    }

    validateStreamUrl(url) {
        // Check if it's a direct audio file
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'];
        const hasAudioExtension = audioExtensions.some(ext => url.toLowerCase().includes(ext));
        
        // Check for known streaming patterns
        const streamingPatterns = [
            /drive\.google\.com\/uc\?export=download/,
            /\.s3\.amazonaws\.com/,
            /\.s3\./,
            /cloudfront\.net/,
            /cdn\./,
            /jsdelivr\.net/
        ];
        
        const isStreamingUrl = streamingPatterns.some(pattern => pattern.test(url));
        
        return hasAudioExtension || isStreamingUrl;
    }

    // Check if URL is a video file (MP4 and other video formats)
    isVideoFile(url) {
        const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
        const urlLower = url.toLowerCase();
        return videoExtensions.some(ext => urlLower.includes(ext));
    }

    // Check if URL is an audio file
    isAudioFile(url) {
        const audioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.wma'];
        const urlLower = url.toLowerCase();
        return audioExtensions.some(ext => urlLower.includes(ext));
    }

    previewBulkImport() {
        const bulkData = document.getElementById('bulkTrackData').value.trim();
        if (!bulkData) {
            this.showNotification('Please enter track data', 'warning');
            return;
        }

        const lines = bulkData.split('\n').filter(line => line.trim());
        const tracks = [];
        const errors = [];

        lines.forEach((line, index) => {
            const parts = line.split('|').map(part => part.trim());
            
            if (parts.length < 4) {
                errors.push(`Line ${index + 1}: Missing required fields (need at least Title, Artist, Album, URL)`);
                return;
            }

            const [title, artist, album, url, coverImage] = parts;
            
            if (!title || !artist || !url) {
                errors.push(`Line ${index + 1}: Title, Artist, and URL are required`);
                return;
            }

            if (!this.isValidUrl(url)) {
                errors.push(`Line ${index + 1}: Invalid URL format`);
                return;
            }

            tracks.push({
                title,
                artist,
                album: album || null,
                url,
                cover_image: coverImage || null
            });
        });

        // Show preview
        const previewDiv = document.getElementById('importPreview');
        const previewList = document.getElementById('previewList');
        
        previewList.innerHTML = '';

        if (errors.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'import-errors';
            errorDiv.innerHTML = `
                <h5>Errors Found:</h5>
                <ul>
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            `;
            previewList.appendChild(errorDiv);
        }

        if (tracks.length > 0) {
            const successDiv = document.createElement('div');
            successDiv.className = 'import-success';
            successDiv.innerHTML = `
                <h5>Ready to Import (${tracks.length} tracks):</h5>
                <div class="preview-tracks">
                    ${tracks.map(track => `
                        <div class="preview-track">
                            <strong>${track.title}</strong> by ${track.artist}
                            ${track.album ? ` - ${track.album}` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            previewList.appendChild(successDiv);
        }

        previewDiv.style.display = 'block';
        this.parsedTracks = tracks;
    }

    async executeBulkImport() {
        if (!this.parsedTracks || this.parsedTracks.length === 0) {
            this.showNotification('Please preview the import first', 'warning');
            return;
        }

        const importBtn = document.querySelector('button[onclick="executeBulkImport()"]');
        const originalText = importBtn.textContent;
        importBtn.textContent = 'Importing...';
        importBtn.disabled = true;

        let successCount = 0;
        let errorCount = 0;

        for (const track of this.parsedTracks) {
            try {
                // Get audio duration
                const duration = await this.getAudioDuration(track.url);
                track.duration = duration;

                const response = await fetch('/api/tracks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(track)
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error('Error importing track:', error);
                errorCount++;
            }
        }

        importBtn.textContent = originalText;
        importBtn.disabled = false;

        if (successCount > 0) {
            this.showNotification(`Successfully imported ${successCount} tracks!`, 'success');
            this.loadTracks();
        }

        if (errorCount > 0) {
            this.showNotification(`${errorCount} tracks failed to import`, 'error');
        }

        if (successCount > 0) {
            this.closeModal('bulkImportModal');
            document.getElementById('bulkTrackData').value = '';
            document.getElementById('importPreview').style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || '#3498db';
    }
}

// Global functions for modal management
function showAddTrackModal() {
    adminDashboard.showModal('addTrackModal');
}

function showAddPlaylistModal() {
    adminDashboard.showModal('addPlaylistModal');
}

function closeModal(modalId) {
    adminDashboard.closeModal(modalId);
}

function convertGoogleDriveUrl() {
    adminDashboard.convertGoogleDriveUrl();
}

function showBulkImportModal() {
    adminDashboard.showModal('bulkImportModal');
}

function previewBulkImport() {
    adminDashboard.previewBulkImport();
}

function executeBulkImport() {
    adminDashboard.executeBulkImport();
}

function showAddVideoModal() {
    adminDashboard.showModal('addVideoModal');
}

// Initialize dashboard when DOM is loaded
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
`;
document.head.appendChild(style);