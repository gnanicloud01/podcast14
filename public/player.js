class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.tracks = [];
        this.allTracks = [];
        this.videos = [];
        this.allVideos = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isShuffled = false;
        this.repeatMode = 'none'; // none, one, all
        this.currentSection = 'home';
        this.searchTimeout = null;
        this.playStartTime = null;
        this.preloadedAudio = new Map(); // Cache for preloaded audio
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.optimizeAudioSettings();
        this.addClickFeedback();
        this.loadInitialData();
    }

    initializeElements() {
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        
        this.currentTrackTitle = document.getElementById('currentTrackTitle');
        this.currentTrackArtist = document.getElementById('currentTrackArtist');
        this.currentTrackImage = document.getElementById('currentTrackImage');
        
        this.currentTime = document.getElementById('currentTime');
        this.totalTime = document.getElementById('totalTime');
        this.progressFill = document.getElementById('progressFill');
        this.progressHandle = document.getElementById('progressHandle');
        this.progressBar = document.querySelector('.progress-bar');
        
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeBtn = document.getElementById('volumeBtn');
        
        this.tracksContainer = document.getElementById('tracksContainer');
        this.searchInput = document.getElementById('searchInput');
        this.genreFilter = document.getElementById('genreFilter');
        this.sortSelect = document.getElementById('sortSelect');
        this.sectionTitle = document.getElementById('sectionTitle');
        this.sectionDescription = document.getElementById('sectionDescription');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.emptyState = document.getElementById('emptyState');
    }

    optimizeAudioSettings() {
        // Optimize audio element for faster playback
        this.audio.preload = 'metadata'; // Preload metadata only initially
        this.audio.crossOrigin = 'anonymous'; // Enable CORS for better compatibility
        
        // Set volume from localStorage if available
        const savedVolume = localStorage.getItem('soundwave-volume');
        if (savedVolume) {
            this.audio.volume = parseFloat(savedVolume);
            this.volumeSlider.value = parseFloat(savedVolume) * 100;
        }
    }

    // Check if URL is a video file (MP4 and other video formats)
    isVideoFile(url) {
        const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
        const urlLower = url.toLowerCase();
        return videoExtensions.some(ext => urlLower.includes(ext));
    }

    // Check if URL is an audio/podcast file (MP3 and other audio formats)
    isAudioFile(url) {
        const audioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.wma'];
        const urlLower = url.toLowerCase();
        return audioExtensions.some(ext => urlLower.includes(ext));
    }

    // Check if URL is specifically a podcast (MP3)
    isPodcastFile(url) {
        const urlLower = url.toLowerCase();
        return urlLower.includes('.mp3');
    }

    bindEvents() {
        // Playback controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());

        // Audio events
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        this.audio.addEventListener('canplay', () => this.handleCanPlay());
        this.audio.addEventListener('loadstart', () => this.handleLoadStart());
        this.audio.addEventListener('waiting', () => this.handleWaiting());
        this.audio.addEventListener('playing', () => this.handlePlaying());

        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));

        // Volume control
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.volumeBtn.addEventListener('click', () => this.toggleMute());

        // View controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeView(e.target.dataset.view));
        });

        // Navigation
        document.querySelectorAll('.nav-menu li').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) this.switchSection(section);
            });
        });

        // Search
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        });

        // Filters
        this.genreFilter.addEventListener('change', () => this.performSearch());
        this.sortSelect.addEventListener('change', () => this.sortTracks());

        // Content type toggle
        document.querySelectorAll('.content-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const contentType = e.currentTarget.dataset.type;
                this.switchContentType(contentType);
            });
        });


    }

    async loadInitialData() {
        await Promise.all([
            this.loadTracks(),
            this.loadPlaylists(),
            this.loadGenres(),
            this.loadVideoCategories()
        ]);
    }

    async loadTracks() {
        try {
            this.showLoading(true);
            const response = await fetch('/api/tracks');
            this.allTracks = await response.json();
            this.tracks = [...this.allTracks];
            this.renderTracks();
            this.showLoading(false);
        } catch (error) {
            console.error('Error loading tracks:', error);
            this.showLoading(false);
            this.showEmptyState('Error loading tracks', 'Please try again later');
        }
    }

    async loadGenres() {
        try {
            const response = await fetch('/api/genres');
            const genres = await response.json();
            
            this.genreFilter.innerHTML = '<option value="">All Genres</option>';
            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre.genre;
                option.textContent = `${genre.genre} (${genre.track_count})`;
                this.genreFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading genres:', error);
        }
    }

    async loadVideoCategories() {
        try {
            const response = await fetch('/api/video-categories');
            const categories = await response.json();
            
            // We'll update the filter when in videos section
            this.videoCategories = categories;
        } catch (error) {
            console.error('Error loading video categories:', error);
        }
    }



    async loadPlaylists() {
        try {
            const response = await fetch('/api/user-playlists');
            const playlists = await response.json();
            this.renderUserPlaylists(playlists);
        } catch (error) {
            console.error('Error loading playlists:', error);
        }
    }

    renderTracks() {
        this.tracksContainer.innerHTML = '';
        
        if (this.tracks.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        
        const isListView = this.tracksContainer.classList.contains('tracks-list');
        
        this.tracks.forEach((track, index) => {
            const trackCard = document.createElement('div');
            trackCard.className = 'track-card';
            
            if (isListView) {
                // List view layout
                trackCard.innerHTML = `
                    <div class="track-image">
                        <img src="${track.cover_image || 'https://via.placeholder.com/60x60?text=♪'}" alt="${track.title}">
                    </div>
                    <div class="track-info">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                        ${track.album ? `<p class="album">${track.album}</p>` : ''}
                        ${track.genres && track.genres.length > 0 ? 
                            `<div class="track-genres">
                                ${track.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                            </div>` : ''}
                        ${track.play_count ? `<div class="play-count">${track.play_count} plays</div>` : ''}
                    </div>
                    <div class="play-overlay">
                        <button class="play-btn" onclick="player.quickPlayTrack(${index})" title="Play">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="add-to-playlist-btn" onclick="player.showAddToPlaylistModal(${track.id})" title="Add to Playlist">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="favorite-btn ${track.is_favorited ? 'favorited' : ''}" 
                                onclick="player.toggleFavorite(${track.id}, this)" title="Add to Favorites">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                `;
            } else {
                // Grid view layout (original)
                trackCard.innerHTML = `
                    <div class="track-image">
                        <img src="${track.cover_image || 'https://via.placeholder.com/200x200?text=♪'}" alt="${track.title}">
                        <div class="play-overlay">
                            <button class="play-btn" onclick="player.quickPlayTrack(${index})">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="add-to-playlist-btn" onclick="player.showAddToPlaylistModal(${track.id})" title="Add to Playlist">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="favorite-btn ${track.is_favorited ? 'favorited' : ''}" 
                                    onclick="player.toggleFavorite(${track.id}, this)" title="Add to Favorites">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                    </div>
                    <div class="track-info">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                        ${track.album ? `<p class="album">${track.album}</p>` : ''}
                        ${track.genres && track.genres.length > 0 ? 
                            `<div class="track-genres">
                                ${track.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                            </div>` : ''}
                        ${track.play_count ? `<div class="play-count">${track.play_count} plays</div>` : ''}
                    </div>
                `;
            }
            
            this.tracksContainer.appendChild(trackCard);
        });
    }

    renderUserPlaylists(playlists) {
        const playlistsList = document.getElementById('userPlaylistsList');
        playlistsList.innerHTML = '';
        
        playlists.forEach(playlist => {
            const playlistItem = document.createElement('div');
            playlistItem.className = 'playlist-item';
            playlistItem.innerHTML = `
                <div class="playlist-info">
                    <div class="playlist-name">${playlist.name}</div>
                    <div class="playlist-count">${playlist.track_count || 0} tracks</div>
                </div>
                <div class="playlist-actions">
                    <button class="playlist-action-btn" onclick="player.loadPlaylistTracks(${playlist.id})" title="Play Playlist">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `;
            playlistItem.onclick = () => this.loadPlaylistTracks(playlist.id);
            playlistsList.appendChild(playlistItem);
        });
    }

    async loadPlaylistTracks(playlistId) {
        try {
            const response = await fetch(`/api/user-playlists/${playlistId}/tracks`);
            const tracks = await response.json();
            
            if (tracks.length > 0) {
                this.tracks = tracks;
                this.renderTracks();
                this.playTrack(0);
            } else {
                alert('This playlist is empty');
            }
        } catch (error) {
            console.error('Error loading playlist tracks:', error);
        }
    }

    async playTrack(index) {
        if (index >= 0 && index < this.tracks.length) {
            // Show loading immediately
            this.showTrackLoading(true);
            
            // Log previous track completion if applicable
            if (this.playStartTime && this.tracks[this.currentTrackIndex]) {
                const playDuration = Math.floor((Date.now() - this.playStartTime) / 1000);
                this.logTrackInteraction(this.tracks[this.currentTrackIndex].id, 'play', playDuration);
            }

            this.currentTrackIndex = index;
            const track = this.tracks[index];
            
            // Update UI immediately for instant feedback
            this.updateCurrentTrackInfo(track);
            this.updatePlayPauseButton(true); // Show loading state
            
            // Update track cards immediately
            document.querySelectorAll('.track-card').forEach((card, i) => {
                card.classList.toggle('playing', i === index);
            });

            try {
                // Check if track is already preloaded
                if (this.preloadedAudio.has(track.url)) {
                    const preloadedAudio = this.preloadedAudio.get(track.url);
                    this.audio.src = preloadedAudio.src;
                    this.audio.currentTime = 0;
                } else {
                    this.audio.src = track.url;
                    this.audio.preload = 'auto'; // Force preload for current track
                }

                // Try to play immediately
                const playPromise = this.audio.play();
                
                if (playPromise !== undefined) {
                    await playPromise;
                    this.isPlaying = true;
                    this.showTrackLoading(false);
                    this.updatePlayPauseButton();
                    this.playStartTime = Date.now();
                    
                    // Log play interaction
                    this.logTrackInteraction(track.id, 'play');
                    
                    // Preload next track for even faster switching
                    this.preloadNextTrack();
                }
            } catch (error) {
                console.error('Error playing track:', error);
                this.showTrackLoading(false);
                this.handleAudioError(error);
            }
        }
    }

    showTrackLoading(show) {
        const playBtn = this.playPauseBtn.querySelector('i');
        if (show) {
            playBtn.className = 'fas fa-spinner fa-spin';
            this.playPauseBtn.disabled = true;
        } else {
            this.playPauseBtn.disabled = false;
        }
    }

    preloadNextTrack() {
        // Preload the next track in background for instant switching
        const nextIndex = this.getNextTrackIndex();
        if (nextIndex !== -1 && nextIndex < this.tracks.length) {
            const nextTrack = this.tracks[nextIndex];
            
            if (!this.preloadedAudio.has(nextTrack.url)) {
                const preloadAudio = new Audio();
                preloadAudio.preload = 'metadata';
                preloadAudio.src = nextTrack.url;
                
                preloadAudio.addEventListener('canplaythrough', () => {
                    this.preloadedAudio.set(nextTrack.url, preloadAudio);
                    console.log('Preloaded next track:', nextTrack.title);
                });
                
                preloadAudio.addEventListener('error', () => {
                    console.warn('Failed to preload track:', nextTrack.title);
                });
            }
        }
    }

    getNextTrackIndex() {
        if (this.isShuffled) {
            return Math.floor(Math.random() * this.tracks.length);
        } else {
            return (this.currentTrackIndex + 1) % this.tracks.length;
        }
    }

    updateCurrentTrackInfo(track) {
        this.currentTrackTitle.textContent = track.title;
        this.currentTrackArtist.textContent = track.artist;
        this.currentTrackImage.src = track.cover_image || 'https://via.placeholder.com/60x60?text=♪';
        document.title = `${track.title} - ${track.artist} | MusicStream Pro`;
    }

    async togglePlayPause() {
        if (this.tracks.length === 0) return;
        
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            this.updatePlayPauseButton();
        } else {
            if (!this.audio.src) {
                await this.playTrack(0);
                return;
            }
            
            try {
                this.updatePlayPauseButton(true); // Show loading
                await this.audio.play();
                this.isPlaying = true;
                this.updatePlayPauseButton();
            } catch (error) {
                console.error('Error playing audio:', error);
                this.updatePlayPauseButton();
                this.showNotification('Error playing audio', 'error');
            }
        }
    }

    updatePlayPauseButton(loading = false) {
        const icon = this.playPauseBtn.querySelector('i');
        
        if (loading) {
            icon.className = 'fas fa-spinner fa-spin';
            this.playPauseBtn.disabled = true;
        } else {
            icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            this.playPauseBtn.disabled = false;
        }
    }

    async previousTrack() {
        if (this.tracks.length === 0) return;
        
        let newIndex = this.currentTrackIndex - 1;
        if (newIndex < 0) {
            newIndex = this.tracks.length - 1;
        }
        await this.playTrack(newIndex);
    }

    async nextTrack() {
        if (this.tracks.length === 0) return;
        
        const newIndex = this.getNextTrackIndex();
        await this.playTrack(newIndex);
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('active', this.isShuffled);
        this.shuffleBtn.style.color = this.isShuffled ? '#4CAF50' : '';
    }

    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        const icon = this.repeatBtn.querySelector('i');
        this.repeatBtn.style.color = this.repeatMode !== 'none' ? '#4CAF50' : '';
        
        if (this.repeatMode === 'one') {
            icon.className = 'fas fa-redo';
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i><span style="font-size: 0.7em;">1</span>';
        } else {
            icon.className = 'fas fa-redo';
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        }
    }

    handleTrackEnd() {
        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.audio.play();
        } else if (this.repeatMode === 'all' || this.currentTrackIndex < this.tracks.length - 1) {
            this.nextTrack();
        } else {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        }
    }

    updateDuration() {
        const duration = this.audio.duration;
        if (!isNaN(duration)) {
            this.totalTime.textContent = this.formatTime(duration);
        }
    }

    updateProgress() {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (!isNaN(currentTime) && !isNaN(duration)) {
            const progress = (currentTime / duration) * 100;
            this.progressFill.style.width = `${progress}%`;
            this.progressHandle.style.left = `${progress}%`;
            this.currentTime.textContent = this.formatTime(currentTime);
        }
    }

    seekTo(event) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        const newTime = percent * this.audio.duration;
        
        if (!isNaN(newTime)) {
            this.audio.currentTime = newTime;
        }
    }

    setVolume(value) {
        this.audio.volume = value / 100;
        this.updateVolumeIcon(value);
        
        // Save volume to localStorage for persistence
        localStorage.setItem('soundwave-volume', value / 100);
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.audio.volume = 0;
            this.volumeSlider.value = 0;
        } else {
            this.audio.volume = 0.7;
            this.volumeSlider.value = 70;
        }
        this.updateVolumeIcon(this.volumeSlider.value);
    }

    updateVolumeIcon(volume) {
        const icon = this.volumeBtn.querySelector('i');
        if (volume == 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (volume < 50) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    changeView(view) {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        if (view === 'list') {
            if (this.currentSection === 'videos') {
                this.tracksContainer.className = 'videos-list';
            } else {
                this.tracksContainer.className = 'tracks-list';
            }
        } else {
            if (this.currentSection === 'videos') {
                this.tracksContainer.className = 'videos-grid';
            } else {
                this.tracksContainer.className = 'tracks-grid';
            }
        }
        
        // Re-render content with new view
        if (this.currentSection === 'videos') {
            this.renderVideos();
        } else {
            this.renderTracks();
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    handleAudioError(error) {
        console.error('Audio error:', error);
        this.showTrackLoading(false);
        
        // Get current track for better error messaging
        const currentTrack = this.tracks[this.currentTrackIndex];
        let errorMessage = 'Error loading audio. Please check the URL.';
        
        if (currentTrack && this.isVideoFile(currentTrack.url)) {
            errorMessage = 'This is a video file (.mp4). Please add it to the Videos section instead of Music tracks.';
        } else if (error.target && error.target.error) {
            switch (error.target.error.code) {
                case 1: // MEDIA_ERR_ABORTED
                    errorMessage = 'Audio loading was aborted.';
                    break;
                case 2: // MEDIA_ERR_NETWORK
                    errorMessage = 'Network error while loading audio.';
                    break;
                case 3: // MEDIA_ERR_DECODE
                    errorMessage = 'Audio file is corrupted or unsupported format.';
                    break;
                case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                    errorMessage = 'Audio format not supported or URL not accessible.';
                    break;
            }
        }
        
        this.showNotification(errorMessage, 'error');
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }

    handleCanPlay() {
        // Audio is ready to play
        this.showTrackLoading(false);
        console.log('Audio ready to play');
    }

    handleLoadStart() {
        // Audio started loading
        console.log('Audio loading started');
    }

    handleWaiting() {
        // Audio is waiting for more data
        this.showTrackLoading(true);
        console.log('Audio buffering...');
    }

    handlePlaying() {
        // Audio started playing
        this.showTrackLoading(false);
        this.isPlaying = true;
        this.updatePlayPauseButton();
        console.log('Audio playing');
    }

    async createPlaylist(name, description, isPublic) {
        try {
            const response = await fetch('/api/user-playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    description,
                    is_public: isPublic
                })
            });

            if (response.ok) {
                this.loadPlaylists();
                return true;
            } else {
                throw new Error('Failed to create playlist');
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            return false;
        }
    }

    async addTrackToPlaylist(playlistId, trackId) {
        try {
            const response = await fetch(`/api/user-playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ track_id: trackId })
            });

            if (response.ok) {
                this.loadPlaylists();
                return true;
            } else {
                throw new Error('Failed to add track to playlist');
            }
        } catch (error) {
            console.error('Error adding track to playlist:', error);
            return false;
        }
    }

    async showAddToPlaylistModal(trackId) {
        this.selectedTrackId = trackId;
        
        try {
            const response = await fetch('/api/user-playlists');
            const playlists = await response.json();
            
            const playlistOptions = document.getElementById('playlistOptions');
            playlistOptions.innerHTML = '';
            
            if (playlists.length === 0) {
                playlistOptions.innerHTML = `
                    <div class="no-playlists">
                        <p>You don't have any playlists yet.</p>
                        <button class="btn-primary" onclick="showCreatePlaylistModal()">Create Your First Playlist</button>
                    </div>
                `;
            } else {
                playlists.forEach(playlist => {
                    const option = document.createElement('div');
                    option.className = 'playlist-option';
                    option.innerHTML = `
                        <div class="playlist-info">
                            <div class="playlist-name">${playlist.name}</div>
                            <div class="playlist-count">${playlist.track_count || 0} tracks</div>
                        </div>
                        <button class="btn-primary" onclick="player.addToSelectedPlaylist(${playlist.id})">Add</button>
                    `;
                    playlistOptions.appendChild(option);
                });
            }
            
            document.getElementById('addToPlaylistModal').style.display = 'flex';
        } catch (error) {
            console.error('Error loading playlists:', error);
        }
    }

    async addToSelectedPlaylist(playlistId) {
        const success = await this.addTrackToPlaylist(playlistId, this.selectedTrackId);
        if (success) {
            alert('Track added to playlist successfully!');
            document.getElementById('addToPlaylistModal').style.display = 'none';
        } else {
            alert('Failed to add track to playlist');
        }
    }

    // Section Management
    async switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-menu li').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        this.currentSection = section;
        this.showLoading(true);

        // Update UI based on section
        this.updateSectionUI(section);

        try {
            switch (section) {
                case 'home':
                    this.setContentTypePreference('music');
                    await this.loadTracks();
                    break;
                case 'videos':
                    this.setContentTypePreference('videos');
                    await this.loadVideos();
                    break;
                case 'favorites':
                    const favContentType = this.getContentTypePreference();
                    if (favContentType === 'videos') {
                        await this.loadFavoriteVideos();
                    } else {
                        await this.loadFavorites();
                    }
                    break;
                case 'recent':
                    const recentContentType = this.getContentTypePreference();
                    if (recentContentType === 'videos') {
                        await this.loadRecentVideos();
                    } else {
                        await this.loadRecentTracks();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${section}:`, error);
            this.showEmptyState('Error loading content', 'Please try again later');
        }

        this.showLoading(false);
    }

    updateSectionUI(section) {
        // Determine content type for favorites and recent
        let contentType = 'music'; // default
        
        if (section === 'videos') {
            contentType = 'videos';
        } else if (section === 'favorites' || section === 'recent') {
            // For favorites and recent, check if we have a content type preference
            contentType = this.getContentTypePreference();
        }

        const sections = {
            home: {
                title: 'Music Library',
                description: 'Browse and enjoy your music collection'
            },
            videos: {
                title: 'Video Presentations',
                description: 'Watch music videos, tutorials, and performances'
            },
            favorites: {
                title: contentType === 'videos' ? 'Favorite Videos' : 'Favorite Tracks',
                description: contentType === 'videos' ? 'Videos you\'ve marked as favorites' : 'Songs you\'ve marked as favorites'
            },
            recent: {
                title: contentType === 'videos' ? 'Recently Watched' : 'Recently Played',
                description: contentType === 'videos' ? 'Your video watching history' : 'Your listening history'
            }
        };

        const config = sections[section];
        this.sectionTitle.textContent = config.title;
        this.sectionDescription.textContent = config.description;

        // Store content type preference
        this.setContentTypePreference(contentType);

        // Update filter options based on section
        this.updateFilterOptions(section);

        // Show/hide content type toggle for favorites and recent
        const contentTypeToggle = document.getElementById('contentTypeToggle');
        if (section === 'favorites' || section === 'recent') {
            contentTypeToggle.style.display = 'flex';
            
            // Update toggle button states
            document.querySelectorAll('.content-type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === contentType);
            });
        } else {
            contentTypeToggle.style.display = 'none';
        }
    }

    getContentTypePreference() {
        // Check localStorage for user's last content type preference
        const saved = localStorage.getItem('soundwave-content-type');
        return saved || 'music';
    }

    setContentTypePreference(type) {
        localStorage.setItem('soundwave-content-type', type);
        this.currentContentType = type;
    }

    async switchContentType(contentType) {
        // Update toggle buttons
        document.querySelectorAll('.content-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === contentType);
        });

        // Set preference
        this.setContentTypePreference(contentType);

        // Reload current section with new content type
        if (this.currentSection === 'favorites') {
            if (contentType === 'videos') {
                await this.loadFavoriteVideos();
            } else {
                await this.loadFavorites();
            }
        } else if (this.currentSection === 'recent') {
            if (contentType === 'videos') {
                await this.loadRecentVideos();
            } else {
                await this.loadRecentTracks();
            }
        }

        // Update section UI
        this.updateSectionUI(this.currentSection);
    }

    updateFilterOptions(section) {
        if (section === 'videos') {
            // Update filter for video categories
            this.genreFilter.innerHTML = '<option value="">All Categories</option>';
            if (this.videoCategories) {
                this.videoCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.category;
                    option.textContent = `${category.category} (${category.video_count})`;
                    this.genreFilter.appendChild(option);
                });
            }
        } else {
            // Restore music genres
            this.loadGenres();
        }
    }



    // Favorites System
    async loadFavorites() {
        try {
            const response = await fetch('/api/favorites');
            this.tracks = await response.json();
            this.renderTracks();
        } catch (error) {
            console.error('Error loading favorites:', error);
            throw error;
        }
    }

    async toggleFavorite(trackId, buttonElement) {
        try {
            const response = await fetch(`/api/favorites/${trackId}`, { method: 'POST' });
            const result = await response.json();

            if (result.favorited) {
                buttonElement.classList.add('favorited');
                this.showNotification('Added to favorites', 'success');
            } else {
                buttonElement.classList.remove('favorited');
                this.showNotification('Removed from favorites', 'info');
            }

            // Refresh favorites section if currently viewing
            if (this.currentSection === 'favorites') {
                const contentType = this.getContentTypePreference();
                if (contentType === 'videos') {
                    await this.loadFavoriteVideos();
                } else {
                    await this.loadFavorites();
                }
            }


        } catch (error) {
            console.error('Error toggling favorite:', error);
            this.showNotification('Error updating favorites', 'error');
        }
    }

    // Recent Tracks
    async loadRecentTracks() {
        try {
            const response = await fetch('/api/recent');
            this.tracks = await response.json();
            this.renderTracks();
        } catch (error) {
            console.error('Error loading recent tracks:', error);
            throw error;
        }
    }

    // Search System
    async performSearch() {
        const query = this.searchInput.value.trim();
        const filterValue = this.genreFilter.value;

        if (!query && !filterValue) {
            // Reset to current section's default content
            await this.switchSection(this.currentSection);
            return;
        }

        try {
            this.showLoading(true);
            const params = new URLSearchParams();
            if (query) params.append('q', query);

            if (this.currentSection === 'videos') {
                if (filterValue) params.append('category', filterValue);
                const response = await fetch(`/api/search-videos?${params}`);
                this.videos = await response.json();
                this.renderVideos();
            } else {
                if (filterValue) params.append('genre', filterValue);
                const response = await fetch(`/api/search?${params}`);
                this.tracks = await response.json();
                this.renderTracks();
            }
            
            this.showLoading(false);
        } catch (error) {
            console.error('Error searching:', error);
            this.showLoading(false);
            this.showEmptyState('Search error', 'Please try again');
        }
    }

    // Sorting
    sortTracks() {
        const sortBy = this.sortSelect.value;

        switch (sortBy) {
            case 'title':
                this.tracks.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'artist':
                this.tracks.sort((a, b) => a.artist.localeCompare(b.artist));
                break;
            case 'recent':
                this.tracks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'popular':
                this.tracks.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
                break;
            default:
                // Keep original order
                break;
        }

        this.renderTracks();
    }

    // Track Interaction Logging
    async logTrackInteraction(trackId, interactionType, playDuration = 0) {
        try {
            await fetch('/api/track-interaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    track_id: trackId,
                    interaction_type: interactionType,
                    play_duration: playDuration
                })
            });
        } catch (error) {
            console.error('Error logging interaction:', error);
        }
    }

    // UI Helper Methods
    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
        this.tracksContainer.style.display = show ? 'none' : 'grid';
    }

    showEmptyState(title = 'No tracks found', message = 'Try adjusting your search or filters') {
        document.getElementById('emptyTitle').textContent = title;
        document.getElementById('emptyMessage').textContent = message;
        this.emptyState.style.display = 'flex';
        this.tracksContainer.style.display = 'none';
    }

    hideEmptyState() {
        this.emptyState.style.display = 'none';
        this.tracksContainer.style.display = 'grid';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease'
        });

        // Set background color based on type
        const colors = {
            success: '#00d4aa',
            error: '#ff4757',
            warning: '#ffb800',
            info: '#3498db'
        };
        notification.style.background = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    formatDuration(seconds) {
        if (!seconds) return '0h 0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    clearPreloadCache() {
        // Clear preloaded audio to free memory
        this.preloadedAudio.forEach((audio, url) => {
            audio.src = '';
            audio.load();
        });
        this.preloadedAudio.clear();
        console.log('Preload cache cleared');
    }

    // Optimize track switching with instant feedback
    async quickPlayTrack(index, event) {
        // Add click feedback immediately
        if (event && event.target) {
            const button = event.target.closest('.play-btn');
            const card = event.target.closest('.track-card');
            
            if (button) {
                button.classList.add('clicked');
                setTimeout(() => button.classList.remove('clicked'), 150);
            }
            
            if (card) {
                card.classList.add('clicked');
                setTimeout(() => card.classList.remove('clicked'), 150);
            }
        }
        
        // Even faster version for immediate response
        if (index >= 0 && index < this.tracks.length) {
            const track = this.tracks[index];
            
                    // Check if this is a video file (MP4)
            if (this.isVideoFile(track.url)) {
                // Strictly redirect MP4 files to Videos section
                this.showNotification('MP4 files are video files. Please add this to the Videos section.', 'warning');
                return;
            }
            
            // Immediate UI feedback
            this.updateCurrentTrackInfo(track);
            this.currentTrackIndex = index;
            
            // Update cards immediately
            document.querySelectorAll('.track-card').forEach((card, i) => {
                card.classList.toggle('playing', i === index);
                card.classList.toggle('loading', i === index);
            });
            
            // Show loading on play button
            this.updatePlayPauseButton(true);
            
            try {
                // Test the URL first
                await this.testAudioUrl(track.url);
                
                // Start loading and playing
                this.audio.src = track.url;
                this.audio.load(); // Force reload
                
                await this.audio.play();
                this.isPlaying = true;
                this.updatePlayPauseButton();
                this.playStartTime = Date.now();
                this.logTrackInteraction(track.id, 'play');
                this.preloadNextTrack();
                
                // Remove loading state
                document.querySelectorAll('.track-card').forEach(card => {
                    card.classList.remove('loading');
                });
            } catch (error) {
                console.error('Playback error:', error);
                this.handlePlaybackError(error, track);
                document.querySelectorAll('.track-card').forEach(card => {
                    card.classList.remove('loading');
                });
            }
        }
    }

    // Handle video tracks
    handleVideoTrack(track) {
        // Create a simple video player modal for video tracks
        const videoModal = document.createElement('div');
        videoModal.className = 'video-modal';
        videoModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        videoModal.innerHTML = `
            <div style="background: var(--card-bg); border-radius: 12px; padding: 2rem; max-width: 800px; width: 90%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="color: var(--text-primary);">${track.title}</h3>
                    <button onclick="this.closest('.video-modal').remove()" style="background: none; border: none; color: var(--text-primary); font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <video controls style="width: 100%; max-height: 400px;" autoplay>
                    <source src="${track.url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <p style="color: var(--text-secondary); margin-top: 1rem;">Artist: ${track.artist}</p>
            </div>
        `;
        
        document.body.appendChild(videoModal);
        
        // Remove modal when clicking outside
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                videoModal.remove();
            }
        });
    }

    // Test if audio URL is accessible
    async testAudioUrl(url) {
        return new Promise((resolve, reject) => {
            const testAudio = new Audio();
            
            const timeout = setTimeout(() => {
                testAudio.src = '';
                reject(new Error('URL test timeout'));
            }, 5000); // 5 second timeout
            
            testAudio.addEventListener('canplay', () => {
                clearTimeout(timeout);
                testAudio.src = '';
                resolve();
            });
            
            testAudio.addEventListener('error', (e) => {
                clearTimeout(timeout);
                testAudio.src = '';
                reject(new Error(`URL not accessible: ${e.message || 'Unknown error'}`));
            });
            
            testAudio.src = url;
        });
    }

    // Enhanced error handling
    handlePlaybackError(error, track) {
        console.error('Playback error details:', error);
        
        let errorMessage = 'Error loading audio.';
        
        if (error.message.includes('URL not accessible')) {
            errorMessage = 'Cannot access the audio file. Please check the URL or try a different source.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Audio loading timed out. Please check your internet connection.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Audio format not supported by your browser.';
        } else if (error.name === 'NotAllowedError') {
            errorMessage = 'Audio playback blocked. Please allow audio playback in your browser.';
        } else if (this.isVideoFile(track.url)) {
            errorMessage = 'This appears to be a video file. Video files should be added to the Videos section.';
        }
        
        this.showNotification(errorMessage, 'error');
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }

    // Add instant click feedback to all play buttons
    addClickFeedback() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.play-btn')) {
                const button = e.target.closest('.play-btn');
                button.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 100);
            }
        });
    }

    // Suggest correct section for file type
    suggestCorrectSection(url) {
        if (this.isVideoFile(url)) {
            return {
                section: 'Videos',
                message: 'This appears to be a video file. Please add it to the Videos section for proper playback.',
                icon: '🎬'
            };
        } else if (this.isAudioFile(url)) {
            return {
                section: 'Music',
                message: 'This is an audio file and should work in the Music section.',
                icon: '🎵'
            };
        } else {
            return {
                section: 'Unknown',
                message: 'File type not recognized. Please ensure the URL points to a valid audio or video file.',
                icon: '❓'
            };
        }
    }

    // Video Management Methods
    async loadVideos() {
        try {
            this.showLoading(true);
            const response = await fetch('/api/videos');
            this.allVideos = await response.json();
            this.videos = [...this.allVideos];
            this.renderVideos();
            this.showLoading(false);
        } catch (error) {
            console.error('Error loading videos:', error);
            this.showLoading(false);
            this.showEmptyState('Error loading videos', 'Please try again later');
        }
    }

    renderVideos() {
        this.tracksContainer.innerHTML = '';
        
        if (this.videos.length === 0) {
            this.showEmptyState('No videos found', 'Try adjusting your search or filters');
            return;
        }

        this.hideEmptyState();
        
        const isListView = this.tracksContainer.classList.contains('videos-list');
        
        this.videos.forEach((video, index) => {
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            
            if (isListView) {
                // List view layout
                videoCard.innerHTML = `
                    <div class="video-thumbnail">
                        <img src="${video.thumbnail || 'https://via.placeholder.com/120x68?text=Video'}" alt="${video.title}">
                        <div class="video-duration">${this.formatVideoTime(video.duration)}</div>
                    </div>
                    <div class="video-info">
                        <h3>${video.title}</h3>
                        <p class="video-description">${video.description || ''}</p>
                        ${video.category ? `<span class="category-tag">${video.category}</span>` : ''}
                    </div>
                    <div class="video-overlay">
                        <button class="play-btn" onclick="player.playVideo(${index})" title="Play Video">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="favorite-btn ${video.is_favorited ? 'favorited' : ''}" 
                                onclick="player.toggleVideoFavorite(${video.id}, this)" title="Add to Favorites">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                `;
            } else {
                // Grid view layout (original)
                videoCard.innerHTML = `
                    <div class="video-thumbnail">
                        <img src="${video.thumbnail || 'https://via.placeholder.com/400x225?text=Video'}" alt="${video.title}">
                        <div class="video-overlay">
                            <button class="play-btn" onclick="player.playVideo(${index})">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="favorite-btn ${video.is_favorited ? 'favorited' : ''}" 
                                    onclick="player.toggleVideoFavorite(${video.id}, this)" title="Add to Favorites">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                        <div class="video-duration">${this.formatVideoTime(video.duration)}</div>
                    </div>
                    <div class="video-info">
                        <h3>${video.title}</h3>
                        <p class="video-description">${video.description || ''}</p>
                        ${video.category ? `<span class="category-tag">${video.category}</span>` : ''}
                    </div>
                `;
            }
            
            this.tracksContainer.appendChild(videoCard);
        });
    }

    playVideo(index) {
        if (index >= 0 && index < this.videos.length) {
            const video = this.videos[index];
            this.openVideoModal(video);
            
            // Log video watch
            this.logVideoWatch(video.id);
        }
    }

    openVideoModal(video) {
        // Create video modal if it doesn't exist
        let modal = document.getElementById('videoModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'videoModal';
            modal.className = 'video-modal';
            modal.innerHTML = `
                <div class="video-modal-content">
                    <div class="video-modal-header">
                        <h3 id="videoModalTitle">${video.title}</h3>
                        <button class="close-btn" onclick="player.closeVideoModal()">&times;</button>
                    </div>
                    <div class="video-player-container">
                        <video id="videoPlayer" controls>
                            <source src="${video.url}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <div class="video-modal-info">
                        <p id="videoModalDescription">${video.description || ''}</p>
                        <div class="video-modal-meta">
                            <span class="video-category">${video.category || ''}</span>
                            <span class="video-duration">${this.formatVideoTime(video.duration)}</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            // Update existing modal
            document.getElementById('videoModalTitle').textContent = video.title;
            document.getElementById('videoModalDescription').textContent = video.description || '';
            document.getElementById('videoPlayer').src = video.url;
            modal.querySelector('.video-category').textContent = video.category || '';
            modal.querySelector('.video-duration').textContent = this.formatVideoTime(video.duration);
        }

        modal.style.display = 'flex';
        this.currentVideo = video;
        this.videoStartTime = Date.now();
    }

    closeVideoModal() {
        const modal = document.getElementById('videoModal');
        if (modal) {
            modal.style.display = 'none';
            const videoPlayer = document.getElementById('videoPlayer');
            if (videoPlayer) {
                videoPlayer.pause();
                
                // Log watch duration
                if (this.videoStartTime && this.currentVideo) {
                    const watchDuration = Math.floor((Date.now() - this.videoStartTime) / 1000);
                    const completed = videoPlayer.currentTime >= videoPlayer.duration * 0.9;
                    this.logVideoWatch(this.currentVideo.id, watchDuration, completed);
                }
            }
        }
    }

    async toggleVideoFavorite(videoId, buttonElement) {
        try {
            const response = await fetch(`/api/video-favorites/${videoId}`, { method: 'POST' });
            const result = await response.json();

            if (result.favorited) {
                buttonElement.classList.add('favorited');
                this.showNotification('Added to favorites', 'success');
            } else {
                buttonElement.classList.remove('favorited');
                this.showNotification('Removed from favorites', 'info');
            }

            // Refresh favorites section if currently viewing
            if (this.currentSection === 'favorites') {
                const contentType = this.getContentTypePreference();
                if (contentType === 'videos') {
                    await this.loadFavoriteVideos();
                } else {
                    await this.loadFavorites();
                }
            }
        } catch (error) {
            console.error('Error toggling video favorite:', error);
            this.showNotification('Error updating favorites', 'error');
        }
    }

    async loadFavoriteVideos() {
        try {
            const response = await fetch('/api/video-favorites');
            this.videos = await response.json();
            this.renderVideos();
        } catch (error) {
            console.error('Error loading favorite videos:', error);
            throw error;
        }
    }

    async loadRecentVideos() {
        try {
            const response = await fetch('/api/recent-videos');
            this.videos = await response.json();
            this.renderVideos();
        } catch (error) {
            console.error('Error loading recent videos:', error);
            throw error;
        }
    }

    async logVideoWatch(videoId, watchDuration = 0, completed = false) {
        try {
            await fetch('/api/video-watch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    video_id: videoId,
                    watch_duration: watchDuration,
                    completed: completed
                })
            });
        } catch (error) {
            console.error('Error logging video watch:', error);
        }
    }

    formatVideoTime(seconds) {
        if (!seconds) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Global functions for playlist management
function showCreatePlaylistModal() {
    document.getElementById('createPlaylistModal').style.display = 'flex';
}

function closePlaylistModal() {
    document.getElementById('createPlaylistModal').style.display = 'none';
    document.getElementById('createPlaylistForm').reset();
}

function closeAddToPlaylistModal() {
    document.getElementById('addToPlaylistModal').style.display = 'none';
}

// Initialize player when DOM is loaded
let player;
document.addEventListener('DOMContentLoaded', () => {
    player = new MusicPlayer();
    
    // Handle create playlist form
    document.getElementById('createPlaylistForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('playlistName').value;
        const description = document.getElementById('playlistDescription').value;
        const isPublic = document.getElementById('playlistPublic').checked;
        
        const success = await player.createPlaylist(name, description, isPublic);
        if (success) {
            alert('Playlist created successfully!');
            closePlaylistModal();
        } else {
            alert('Failed to create playlist');
        }
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!player) return;
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            player.togglePlayPause();
            break;
        case 'ArrowLeft':
            if (e.ctrlKey) {
                e.preventDefault();
                player.previousTrack();
            }
            break;
        case 'ArrowRight':
            if (e.ctrlKey) {
                e.preventDefault();
                player.nextTrack();
            }
            break;
    }
});