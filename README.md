# 🎵 SoundWave - Professional Music Streaming Platform

A modern, feature-rich music streaming application with intelligent discovery algorithms, comprehensive analytics, and professional admin dashboard for managing tracks and playlists.

![SoundWave](https://via.placeholder.com/800x400/FF6B35/white?text=SoundWave+Music+Player)

## ✨ Key Features

### 🎵 Music Player
- **Stream-based playback** - Play music directly from URLs
- **Smart discovery algorithms** - AI-powered recommendations
- **Professional dark theme** - Modern UI with orange accent colors
- **Full playback controls** - Play, pause, next, previous, shuffle, repeat
- **Real-time search** - Search across titles, artists, albums, and genres
- **Personal playlists** - Create and manage custom playlists
- **Favorites system** - Heart tracks and build your collection
- **Listening history** - Track your music journey
- **User analytics** - View your listening statistics
- **Keyboard shortcuts** - Space to play/pause, Ctrl+Arrow keys for navigation

### 🔍 Discovery & Intelligence
- **Smart Mix Algorithm** - Combines popularity, recency, and randomness
- **Trending Tracks** - Most played songs across all users
- **Genre-based Recommendations** - Discover music based on your taste
- **Fresh Tracks** - Newly added music highlights
- **Advanced filtering** - Filter by genre, artist, popularity
- **Intelligent sorting** - Multiple sorting options

### 👤 User Experience
- **Session-based tracking** - No registration required
- **Cross-device responsive** - Works on desktop, tablet, and mobile
- **Real-time notifications** - Instant feedback for actions
- **Loading states** - Smooth loading indicators
- **Empty state handling** - Helpful messages when no content
- **Accessibility** - Keyboard navigation and screen reader support

### 🛠️ Admin Dashboard
- **Secure authentication** - Login system with session management
- **Track management** - Add, edit, delete music tracks
- **Bulk import** - Import multiple tracks at once
- **URL validation** - Test audio URLs before adding
- **Google Drive converter** - Convert share links to direct URLs
- **Analytics overview** - View platform statistics
- **User management** - Monitor user activity
- **Database insights** - Track library growth

### 🔧 Technical Features
- **SQLite Database** - Lightweight, persistent storage
- **RESTful API** - Clean, documented API endpoints
- **Session management** - Secure user sessions
- **Error handling** - Comprehensive error management
- **Audio validation** - Automatic duration detection
- **Cross-platform** - Works on Windows, macOS, and Linux
- **Production ready** - Optimized for deployment

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd professional-music-player
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Music Player: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin

## Development

For development with auto-reload:
```bash
npm run dev
```

## Usage

### Adding Music Tracks

1. Open the Admin Dashboard at `/admin`
2. Click "Add Track" button
3. Fill in the track information:
   - **Title** (required)
   - **Artist** (required)
   - **Album** (optional)
   - **Stream URL** (required) - Direct link to audio file
   - **Cover Image URL** (optional)
4. Click "Add Track" to save

### Supported Audio Formats

The player supports any audio format that browsers can play:
- MP3
- WAV
- OGG
- M4A
- AAC

### URL Examples

Valid stream URLs:
- `https://example.com/song.mp3`
- `https://cdn.example.com/audio/track.wav`
- `https://streaming-service.com/stream/12345`

### Creating Playlists

1. Go to the Playlists tab in Admin Dashboard
2. Click "Create Playlist"
3. Enter playlist name and description
4. Add tracks to the playlist (feature coming soon)

## API Endpoints

### Tracks
- `GET /api/tracks` - Get all tracks
- `POST /api/tracks` - Add new track
- `DELETE /api/tracks/:id` - Delete track

### Playlists
- `GET /api/playlists` - Get all playlists
- `POST /api/playlists` - Create new playlist
- `DELETE /api/playlists/:id` - Delete playlist

## Database Schema

### Tracks Table
```sql
CREATE TABLE tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    url TEXT NOT NULL,
    duration INTEGER,
    cover_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Playlists Table
```sql
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Keyboard Shortcuts

- **Space** - Play/Pause
- **Ctrl + Left Arrow** - Previous track
- **Ctrl + Right Arrow** - Next track

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the browser console for error messages
2. Verify audio URLs are accessible and valid
3. Ensure proper internet connection for streaming
4. Check browser audio permissions

## Future Enhancements

- User authentication and profiles
- Advanced playlist management
- Audio visualization
- Social features (sharing, comments)
- Mobile app version
- Offline playback support
- Advanced analytics and reporting