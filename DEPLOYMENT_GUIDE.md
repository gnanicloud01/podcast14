# 🚀 SoundWave Music Player - Deployment Guide

## Quick Deployment Steps

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Start the Server**
```bash
npm start
# Server will run on http://localhost:3001
```

### 3. **Access the Application**
- **Music Player**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3001/admin
- **Admin Login**: http://localhost:3001/login.html

## 🔐 Default Admin Credentials
```
Username: Gnani14
Password: Gnaneshwar@14
```
**⚠️ Change these credentials in production!**

## 🎵 Adding Music Tracks

### **Method 1: Admin Dashboard (Recommended)**
1. Go to `/login.html` and login with admin credentials
2. Navigate to "Tracks" tab
3. Click "Add Track" button
4. Fill in track information:
   - **Title** (required)
   - **Artist** (required)
   - **Album** (optional)
   - **Stream URL** (required)
   - **Cover Image URL** (optional)

### **Method 2: Direct Database Insert**
```sql
INSERT INTO tracks (title, artist, album, url, duration, cover_image) 
VALUES ('Song Title', 'Artist Name', 'Album Name', 'https://example.com/song.mp3', 180, 'https://example.com/cover.jpg');
```

## 🌐 Supported Audio Sources

### **✅ Working URL Examples:**
```
# Direct audio files
https://example.com/song.mp3
https://cdn.example.com/audio/track.wav

# Google Drive (use converter in admin)
https://drive.google.com/file/d/FILE_ID/view
→ Converts to: https://drive.google.com/uc?export=download&id=FILE_ID

# AWS S3 Public Buckets
https://bucket-name.s3.region.amazonaws.com/song.mp3

# CDN URLs
https://d1234567890.cloudfront.net/audio/song.mp3
```

### **❌ URLs That Won't Work:**
```
# YouTube links (not direct audio)
https://youtube.com/watch?v=...

# Spotify links (protected)
https://open.spotify.com/track/...

# SoundCloud (requires API)
https://soundcloud.com/...
```

## 📁 Database Information

### **Database File**: `music_player.db`
- **Type**: SQLite database
- **Location**: Root directory
- **Persistence**: Survives server restarts
- **Backup**: Copy this file to backup all data

### **Database Tables:**
- `tracks` - Music track metadata
- `users` - Admin users
- `user_playlists` - User-created playlists
- `user_favorites` - Favorited tracks
- `listening_history` - Play history
- `user_interactions` - Analytics data

## 🔧 Production Deployment

### **Environment Variables:**
```bash
PORT=3001                    # Server port
NODE_ENV=production         # Production mode
SESSION_SECRET=your-secret  # Change this!
```

### **Security Recommendations:**
1. **Change admin password** immediately
2. **Use HTTPS** in production
3. **Set strong session secret**
4. **Regular database backups**
5. **Monitor disk space** (for database growth)

### **Server Requirements:**
- **Node.js**: 14+ 
- **RAM**: 512MB minimum
- **Storage**: 1GB+ (depends on database size)
- **Network**: Outbound access for streaming URLs

## 📊 Features Available After Deployment

### **For Users:**
- ✅ Browse and play music
- ✅ Create personal playlists
- ✅ Mark favorites
- ✅ View listening history
- ✅ Smart music discovery
- ✅ Search and filter tracks

### **For Admins:**
- ✅ Add/remove tracks
- ✅ Manage playlists
- ✅ View analytics
- ✅ User management
- ✅ Database statistics

## 🎯 Adding Your First Tracks

### **Quick Start Tracks:**
Here are some free, legal audio sources for testing:

1. **Internet Archive**: https://archive.org/details/audio
2. **Free Music Archive**: https://freemusicarchive.org/
3. **Jamendo**: https://www.jamendo.com/
4. **ccMixter**: http://ccmixter.org/

### **Example Track Addition:**
```
Title: "Ambient Dreams"
Artist: "Demo Artist"
Album: "Test Collection"
URL: https://archive.org/download/example/track.mp3
Cover: https://via.placeholder.com/300x300?text=Album+Art
```

## 🔄 Backup & Restore

### **Backup Database:**
```bash
cp music_player.db backup_$(date +%Y%m%d).db
```

### **Restore Database:**
```bash
cp backup_20231201.db music_player.db
```

## 🐛 Troubleshooting

### **Common Issues:**

**1. "Track won't play"**
- Check if URL is publicly accessible
- Verify audio format (MP3, WAV, OGG supported)
- Test URL in browser directly

**2. "Can't login to admin"**
- Use default credentials: Gnani14/Gnaneshwar@14
- Check server logs for errors
- Verify database exists
- Check if server is running on correct port

**3. "Database errors"**
- Ensure write permissions in directory
- Check disk space
- Restart server

### **Logs Location:**
- Server logs appear in console
- Check browser console for client errors

## 📈 Scaling Considerations

### **For High Traffic:**
- Use process manager (PM2)
- Consider database migration to PostgreSQL
- Implement CDN for static assets
- Add load balancing

### **Storage Optimization:**
- Regular database cleanup
- Compress old listening history
- Archive unused tracks

---

**🎵 Enjoy your SoundWave music streaming platform!**

For support or questions, check the server logs and browser console for detailed error messages.