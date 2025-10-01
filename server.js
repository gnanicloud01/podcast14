const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;

// Startup logging
console.log('🚀 Starting SoundWave Music Player...');
console.log('📊 Environment Info:');
console.log('   - NODE_ENV:', process.env.NODE_ENV);
console.log('   - PORT:', PORT);
console.log('   - DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('   - SESSION_SECRET exists:', !!process.env.SESSION_SECRET);

// Basic middleware (session will be configured after database setup)
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
let db;
let isPostgres = false;

// Helper function to create INSERT queries with RETURNING for PostgreSQL
const createInsertQuery = (table, columns) => {
    const placeholders = columns.map((_, i) => isPostgres ? `$${i + 1}` : '?').join(', ');
    const columnNames = columns.join(', ');
    const returning = isPostgres ? ' RETURNING id' : '';
    return `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})${returning}`;
};

if (process.env.DATABASE_URL) {
    // Use PostgreSQL for production (Render.com)
    console.log('🔗 Using PostgreSQL database');
    console.log('🔗 DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('🔗 NODE_ENV:', process.env.NODE_ENV);
    isPostgres = true;
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test database connection
    pool.connect((err, client, release) => {
        if (err) {
            console.error('❌ Error connecting to PostgreSQL:', err);
        } else {
            console.log('✅ Successfully connected to PostgreSQL database');
            release();
        }
    });
    
    // Create a wrapper to make PostgreSQL work like SQLite
    db = {
        run: (query, params = [], callback) => {
            console.log('🔍 PostgreSQL RUN Query:', query, 'Params:', params);
            pool.query(query, params)
                .then(result => {
                    console.log('✅ PostgreSQL RUN Success:', result.rowCount, 'rows affected');
                    if (callback) {
                        const lastID = result.rows && result.rows.length > 0 ? result.rows[0].id : null;
                        callback.call({ lastID }, null);
                    }
                })
                .catch(err => {
                    console.error('❌ PostgreSQL RUN Error:', err.message);
                    if (callback) callback(err);
                });
        },
        get: (query, params = [], callback) => {
            // For PostgreSQL, convert ? to $1, $2, etc.
            let paramIndex = 0;
            const pgQuery = query.replace(/\?/g, () => `$${++paramIndex}`);
            console.log('🔍 PostgreSQL GET Query:', pgQuery, 'Params:', params);
            
            pool.query(pgQuery, params)
                .then(result => {
                    console.log('✅ PostgreSQL GET Success:', result.rows.length, 'rows returned');
                    callback(null, result.rows[0]);
                })
                .catch(err => {
                    console.error('❌ PostgreSQL GET Error:', err.message);
                    callback(err);
                });
        },
        all: (query, params = [], callback) => {
            // For PostgreSQL, convert ? to $1, $2, etc.
            let paramIndex = 0;
            const pgQuery = query.replace(/\?/g, () => `$${++paramIndex}`);
            console.log('🔍 PostgreSQL ALL Query:', pgQuery, 'Params:', params);
            
            pool.query(pgQuery, params)
                .then(result => {
                    console.log('✅ PostgreSQL ALL Success:', result.rows.length, 'rows returned');
                    callback(null, result.rows);
                })
                .catch(err => {
                    console.error('❌ PostgreSQL ALL Error:', err.message);
                    callback(err);
                });
        },
        serialize: (callback) => {
            callback();
        }
    };
} else {
    // Use SQLite for local development
    console.log('🗄️ Using SQLite database for local development');
    db = new sqlite3.Database('./music_player.db');
}

// Configure session store after database setup
let sessionConfig = {
    secret: process.env.SESSION_SECRET || 'soundwave-admin-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
        httpOnly: true // Prevent XSS attacks
    },
    name: 'soundwave.sid'
};

// Use PostgreSQL session store in production to avoid MemoryStore warning
if (isPostgres && process.env.DATABASE_URL) {
    try {
        const pgSession = require('connect-pg-simple')(session);
        sessionConfig.store = new pgSession({
            conString: process.env.DATABASE_URL,
            tableName: 'user_sessions',
            createTableIfMissing: true
        });
        console.log('✅ Using PostgreSQL session store');
    } catch (err) {
        console.log('⚠️ PostgreSQL session store not available, using memory store');
    }
}

app.use(session(sessionConfig));

// Initialize database tables
db.serialize(() => {
    const createTracksTable = isPostgres ? 
        `CREATE TABLE IF NOT EXISTS tracks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            url TEXT NOT NULL,
            duration INTEGER,
            cover_image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )` :
        `CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            url TEXT NOT NULL,
            duration INTEGER,
            cover_image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
    
    db.run(createTracksTable);

    const createPlaylistsTable = isPostgres ?
        `CREATE TABLE IF NOT EXISTS playlists (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )` :
        `CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
    
    db.run(createPlaylistsTable);

    const createPlaylistTracksTable = isPostgres ?
        `CREATE TABLE IF NOT EXISTS playlist_tracks (
            id SERIAL PRIMARY KEY,
            playlist_id INTEGER REFERENCES playlists(id),
            track_id INTEGER REFERENCES tracks(id),
            position INTEGER
        )` :
        `CREATE TABLE IF NOT EXISTS playlist_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER,
            track_id INTEGER,
            position INTEGER,
            FOREIGN KEY (playlist_id) REFERENCES playlists (id),
            FOREIGN KEY (track_id) REFERENCES tracks (id)
        )`;
    
    db.run(createPlaylistTracksTable);

    const createUsersTable = isPostgres ?
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )` :
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
    
    db.run(createUsersTable);

    const createUserPlaylistsTable = isPostgres ?
        `CREATE TABLE IF NOT EXISTS user_playlists (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            name TEXT NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )` :
        `CREATE TABLE IF NOT EXISTS user_playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`;
    
    db.run(createUserPlaylistsTable);

    const createUserPlaylistTracksTable = isPostgres ?
        `CREATE TABLE IF NOT EXISTS user_playlist_tracks (
            id SERIAL PRIMARY KEY,
            playlist_id INTEGER REFERENCES user_playlists(id),
            track_id INTEGER REFERENCES tracks(id),
            position INTEGER,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )` :
        `CREATE TABLE IF NOT EXISTS user_playlist_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER,
            track_id INTEGER,
            position INTEGER,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (playlist_id) REFERENCES user_playlists (id),
            FOREIGN KEY (track_id) REFERENCES tracks (id)
        )`;
    
    db.run(createUserPlaylistTracksTable);

    // Create remaining tables with PostgreSQL compatibility
    const tables = [
        {
            name: 'user_interactions',
            postgres: `CREATE TABLE IF NOT EXISTS user_interactions (
                id SERIAL PRIMARY KEY,
                user_id TEXT DEFAULT 'guest',
                track_id INTEGER REFERENCES tracks(id),
                interaction_type TEXT,
                interaction_count INTEGER DEFAULT 1,
                last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_play_time INTEGER DEFAULT 0,
                UNIQUE(user_id, track_id, interaction_type)
            )`,
            sqlite: `CREATE TABLE IF NOT EXISTS user_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'guest',
                track_id INTEGER,
                interaction_type TEXT,
                interaction_count INTEGER DEFAULT 1,
                last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_play_time INTEGER DEFAULT 0,
                FOREIGN KEY (track_id) REFERENCES tracks (id),
                UNIQUE(user_id, track_id, interaction_type)
            )`
        },
        {
            name: 'user_favorites',
            postgres: `CREATE TABLE IF NOT EXISTS user_favorites (
                id SERIAL PRIMARY KEY,
                user_id TEXT DEFAULT 'guest',
                track_id INTEGER REFERENCES tracks(id),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, track_id)
            )`,
            sqlite: `CREATE TABLE IF NOT EXISTS user_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'guest',
                track_id INTEGER,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (track_id) REFERENCES tracks (id),
                UNIQUE(user_id, track_id)
            )`
        },
        {
            name: 'listening_history',
            postgres: `CREATE TABLE IF NOT EXISTS listening_history (
                id SERIAL PRIMARY KEY,
                user_id TEXT DEFAULT 'guest',
                track_id INTEGER REFERENCES tracks(id),
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                play_duration INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT false
            )`,
            sqlite: `CREATE TABLE IF NOT EXISTS listening_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'guest',
                track_id INTEGER,
                played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                play_duration INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT 0,
                FOREIGN KEY (track_id) REFERENCES tracks (id)
            )`
        },
        {
            name: 'track_genres',
            postgres: `CREATE TABLE IF NOT EXISTS track_genres (
                id SERIAL PRIMARY KEY,
                track_id INTEGER REFERENCES tracks(id),
                genre TEXT
            )`,
            sqlite: `CREATE TABLE IF NOT EXISTS track_genres (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER,
                genre TEXT,
                FOREIGN KEY (track_id) REFERENCES tracks (id)
            )`
        },
        {
            name: 'user_preferences',
            postgres: `CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_id TEXT DEFAULT 'guest',
                preference_key TEXT,
                preference_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, preference_key)
            )`,
            sqlite: `CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'guest',
                preference_key TEXT,
                preference_value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, preference_key)
            )`
        },
        {
            name: 'videos',
            postgres: `CREATE TABLE IF NOT EXISTS videos (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                url TEXT NOT NULL,
                thumbnail TEXT,
                duration INTEGER,
                category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            sqlite: `CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                url TEXT NOT NULL,
                thumbnail TEXT,
                duration INTEGER,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'video_favorites',
            postgres: `CREATE TABLE IF NOT EXISTS video_favorites (
                id SERIAL PRIMARY KEY,
                user_id TEXT DEFAULT 'guest',
                video_id INTEGER REFERENCES videos(id),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, video_id)
            )`,
            sqlite: `CREATE TABLE IF NOT EXISTS video_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'guest',
                video_id INTEGER,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos (id),
                UNIQUE(user_id, video_id)
            )`
        },
        {
            name: 'video_history',
            postgres: `CREATE TABLE IF NOT EXISTS video_history (
                id SERIAL PRIMARY KEY,
                user_id TEXT DEFAULT 'guest',
                video_id INTEGER REFERENCES videos(id),
                watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                watch_duration INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT false
            )`,
            sqlite: `CREATE TABLE IF NOT EXISTS video_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'guest',
                video_id INTEGER,
                watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                watch_duration INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT 0,
                FOREIGN KEY (video_id) REFERENCES videos (id)
            )`
        }
    ];

    // Create all tables
    tables.forEach(table => {
        db.run(isPostgres ? table.postgres : table.sqlite);
    });

    // Add demo tracks if database is empty
    db.get('SELECT COUNT(*) as count FROM tracks', (err, row) => {
        if (!err && row.count === 0) {
            console.log('Adding demo tracks...');

            const demoTracks = [
                {
                    title: 'Sample Audio Track',
                    artist: 'Demo Artist',
                    album: 'Test Album',
                    url: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
                    duration: 347,
                    cover_image: 'https://via.placeholder.com/300x300/4CAF50/white?text=Demo+Track'
                },
                {
                    title: 'Test MP3 File',
                    artist: 'Sample Artist',
                    album: 'Demo Collection',
                    url: 'https://file-examples.com/storage/fe68c1b7c66f4d2ba13a2b6/2017/11/file_example_MP3_700KB.mp3',
                    duration: 27,
                    cover_image: 'https://via.placeholder.com/300x300/2196F3/white?text=Test+Audio'
                }
            ];

            demoTracks.forEach(track => {
                const query = createInsertQuery('tracks', ['title', 'artist', 'album', 'url', 'duration', 'cover_image']);
                
                db.run(
                    query,
                    [track.title, track.artist, track.album, track.url, track.duration, track.cover_image],
                    function (err) {
                        if (err) {
                            console.error('Error adding demo track:', err);
                        } else {
                            console.log(`Added demo track: ${track.title}`);
                        }
                    }
                );
            });
        }
    });

    // Add sample genres for demo tracks
    db.get('SELECT COUNT(*) as count FROM track_genres', (err, row) => {
        if (!err && row.count === 0) {
            const genres = [
                { track_id: 1, genre: 'Ambient' },
                { track_id: 1, genre: 'Instrumental' },
                { track_id: 2, genre: 'Demo' },
                { track_id: 2, genre: 'Test' }
            ];

            genres.forEach(genre => {
                const genreQuery = createInsertQuery('track_genres', ['track_id', 'genre']);
                db.run(genreQuery, [genre.track_id, genre.genre]);
            });
        }
    });

    // Add demo videos if database is empty
    db.get('SELECT COUNT(*) as count FROM videos', (err, row) => {
        if (!err && row.count === 0) {
            console.log('Adding demo videos...');

            const demoVideos = [
                {
                    title: 'Sample Podcast Episode',
                    description: 'Demo podcast episode showing MP4 video content',
                    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
                    thumbnail: 'https://via.placeholder.com/400x225/FF6B35/white?text=Podcast+EP1',
                    duration: 300,
                    category: 'Podcast'
                },
                {
                    title: 'Music Production Tutorial',
                    description: 'Learn the basics of music production with this comprehensive tutorial',
                    url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
                    thumbnail: 'https://via.placeholder.com/400x225/667EEA/white?text=Tutorial',
                    duration: 180,
                    category: 'Tutorial'
                },
                {
                    title: 'Live Concert Performance',
                    description: 'Amazing live performance from our featured artists',
                    url: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
                    thumbnail: 'https://via.placeholder.com/400x225/4CAF50/white?text=Live+Show',
                    duration: 240,
                    category: 'Performance'
                },
                {
                    title: 'Artist Interview',
                    description: 'Exclusive interview with top recording artists',
                    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
                    thumbnail: 'https://via.placeholder.com/400x225/E91E63/white?text=Interview',
                    duration: 420,
                    category: 'Interview'
                }
            ];

            demoVideos.forEach(video => {
                const query = createInsertQuery('videos', ['title', 'description', 'url', 'thumbnail', 'duration', 'category']);
                
                db.run(
                    query,
                    [video.title, video.description, video.url, video.thumbnail, video.duration, video.category],
                    function (err) {
                        if (err) {
                            console.error('Error adding demo video:', err);
                        } else {
                            console.log(`Added demo video: ${video.title}`);
                        }
                    }
                );
            });
        }
    });

    // Create default admin user
    db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', (err, row) => {
        if (!err && row.count === 0) {
            const adminUserQuery = createInsertQuery('users', ['username', 'password', 'role']);
            db.run(
                adminUserQuery,
                ['Gnani14', 'Gnaneshwar@14', 'admin'],
                function (err) {
                    if (err) {
                        console.error('Error creating admin user:', err);
                    } else {
                        console.log('Default admin user created - Username: Gnani14, Password: Gnaneshwar@14');
                    }
                }
            );
        }
    });
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        return res.status(401).json({ error: 'Authentication required' });
    }
};

// Authentication Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    console.log('Login attempt:', { username, passwordLength: password ? password.length : 0 });

    if (!username || !password) {
        console.log('Login failed: Missing username or password');
        res.status(400).json({ error: 'Username and password are required' });
        return;
    }

    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }

        if (user) {
            console.log('Login successful for user:', username);
            req.session.user = { id: user.id, username: user.username, role: user.role };
            res.json({ success: true, user: { username: user.username, role: user.role } });
        } else {
            console.log('Login failed: Invalid credentials for username:', username);
            res.status(401).json({ error: 'Invalid username or password' });
        }
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: 'Could not log out' });
        } else {
            res.json({ success: true });
        }
    });
});

app.get('/api/auth-status', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Database status endpoint for debugging
app.get('/api/db-status', (req, res) => {
    // Get counts of tracks and videos
    db.get('SELECT COUNT(*) as track_count FROM tracks', (err, trackResult) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to count tracks: ' + err.message });
        }
        
        db.get('SELECT COUNT(*) as video_count FROM videos', (err, videoResult) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to count videos: ' + err.message });
            }
            
            res.json({
                database: isPostgres ? 'PostgreSQL' : 'SQLite',
                hasDbUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
                counts: {
                    tracks: trackResult.track_count,
                    videos: videoResult.video_count
                },
                sessionStore: isPostgres ? 'PostgreSQL' : 'Memory'
            });
        });
    });
});

// Test database write/read
app.post('/api/test-db', requireAuth, (req, res) => {
    const testTitle = `Test Video ${Date.now()}`;
    const query = createInsertQuery('videos', ['title', 'description', 'url', 'thumbnail', 'duration', 'category']);
    
    console.log('🧪 Testing database with query:', query);
    
    db.run(
        query,
        [testTitle, 'Test description', 'https://test.com/video.mp4', 'https://test.com/thumb.jpg', 120, 'test'],
        function (err) {
            if (err) {
                console.error('❌ Test DB Error:', err);
                res.status(500).json({ error: err.message, query });
                return;
            }
            
            console.log('✅ Test DB Success, ID:', this.lastID);
            
            // Now try to read it back
            db.get('SELECT * FROM videos WHERE title = ?', [testTitle], (err, row) => {
                if (err) {
                    console.error('❌ Test DB Read Error:', err);
                    res.status(500).json({ error: 'Read failed: ' + err.message });
                    return;
                }
                
                console.log('✅ Test DB Read Success:', row);
                res.json({ 
                    success: true, 
                    insertedId: this.lastID, 
                    readBack: row,
                    database: isPostgres ? 'PostgreSQL' : 'SQLite'
                });
            });
        }
    );
});

// API Routes
// Get all tracks
app.get('/api/tracks', (req, res) => {
    db.all('SELECT * FROM tracks ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add new track (admin only)
app.post('/api/tracks', requireAuth, (req, res) => {
    const { title, artist, album, url, duration, cover_image } = req.body;

    const query = createInsertQuery('tracks', ['title', 'artist', 'album', 'url', 'duration', 'cover_image']);
    
    db.run(
        query,
        [title, artist, album, url, duration, cover_image],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Track added successfully' });
        }
    );
});

// Bulk import tracks (admin only)
app.post('/api/tracks/bulk', requireAuth, (req, res) => {
    const { tracks } = req.body;

    if (!Array.isArray(tracks) || tracks.length === 0) {
        res.status(400).json({ error: 'Invalid tracks data' });
        return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    const insertTrack = (track, callback) => {
        const { title, artist, album, url, duration, cover_image } = track;

        const query = createInsertQuery('tracks', ['title', 'artist', 'album', 'url', 'duration', 'cover_image']);
        
        db.run(
            query,
            [title, artist, album, url, duration || 0, cover_image],
            function (err) {
                if (err) {
                    errorCount++;
                    errors.push(`${title}: ${err.message}`);
                } else {
                    successCount++;
                }
                callback();
            }
        );
    };

    // Process tracks sequentially
    let index = 0;
    const processNext = () => {
        if (index >= tracks.length) {
            // All tracks processed
            res.json({
                success: true,
                successCount,
                errorCount,
                errors: errors.slice(0, 10) // Limit error messages
            });
            return;
        }

        insertTrack(tracks[index], () => {
            index++;
            processNext();
        });
    };

    processNext();
});

// Delete track (admin only)
app.delete('/api/tracks/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM tracks WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Track deleted successfully' });
    });
});

// Get all playlists
app.get('/api/playlists', (req, res) => {
    db.all('SELECT * FROM playlists ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Create playlist (admin only)
app.post('/api/playlists', requireAuth, (req, res) => {
    const { name, description } = req.body;

    const playlistQuery = createInsertQuery('playlists', ['name', 'description']);
    db.run(
        playlistQuery,
        [name, description],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Playlist created successfully' });
        }
    );
});

// User Playlist Routes
// Get user playlists
app.get('/api/user-playlists', (req, res) => {
    const userId = req.session?.user?.id || 'guest';

    db.all(
        `SELECT up.*, COUNT(upt.track_id) as track_count 
         FROM user_playlists up 
         LEFT JOIN user_playlist_tracks upt ON up.id = upt.playlist_id 
         WHERE up.user_id = ? OR up.is_public = 1 
         GROUP BY up.id 
         ORDER BY up.created_at DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Create user playlist
app.post('/api/user-playlists', (req, res) => {
    const { name, description, is_public } = req.body;
    const userId = req.session?.user?.id || 'guest';

    const userPlaylistQuery = createInsertQuery('user_playlists', ['user_id', 'name', 'description', 'is_public']);
    db.run(
        userPlaylistQuery,
        [userId, name, description, is_public || 0],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Playlist created successfully' });
        }
    );
});

// Add track to user playlist
app.post('/api/user-playlists/:id/tracks', (req, res) => {
    const { id } = req.params;
    const { track_id } = req.body;
    const userId = req.session?.user?.id || 'guest';

    // Check if user owns the playlist
    db.get('SELECT * FROM user_playlists WHERE id = ? AND user_id = ?', [id, userId], (err, playlist) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!playlist) {
            res.status(403).json({ error: 'Playlist not found or access denied' });
            return;
        }

        // Get next position
        db.get('SELECT MAX(position) as max_pos FROM user_playlist_tracks WHERE playlist_id = ?', [id], (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            const position = (result.max_pos || 0) + 1;

            const playlistTrackQuery = createInsertQuery('user_playlist_tracks', ['playlist_id', 'track_id', 'position']);
            db.run(
                playlistTrackQuery,
                [id, track_id, position],
                function (err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ message: 'Track added to playlist successfully' });
                }
            );
        });
    });
});

// Get playlist tracks
app.get('/api/user-playlists/:id/tracks', (req, res) => {
    const { id } = req.params;

    db.all(
        `SELECT t.*, upt.position, upt.added_at 
         FROM tracks t 
         JOIN user_playlist_tracks upt ON t.id = upt.track_id 
         WHERE upt.playlist_id = ? 
         ORDER BY upt.position`,
        [id],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Delete user playlist
app.delete('/api/user-playlists/:id', (req, res) => {
    const { id } = req.params;
    const userId = req.session?.user?.id || 'guest';

    db.get('SELECT * FROM user_playlists WHERE id = ? AND user_id = ?', [id, userId], (err, playlist) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!playlist) {
            res.status(403).json({ error: 'Playlist not found or access denied' });
            return;
        }

        db.run('DELETE FROM user_playlist_tracks WHERE playlist_id = ?', [id], (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            db.run('DELETE FROM user_playlists WHERE id = ?', [id], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Playlist deleted successfully' });
            });
        });
    });
});

// Advanced Music Discovery APIs

// Track interaction logging
app.post('/api/track-interaction', (req, res) => {
    const { track_id, interaction_type, play_duration } = req.body;
    const userId = req.session?.user?.id || 'guest';

    // Update or insert interaction
    db.run(
        `INSERT INTO user_interactions (user_id, track_id, interaction_type, interaction_count, total_play_time)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(user_id, track_id, interaction_type) 
         DO UPDATE SET 
            interaction_count = interaction_count + 1,
            total_play_time = total_play_time + ?,
            last_interaction = CURRENT_TIMESTAMP`,
        [userId, track_id, interaction_type, play_duration || 0, play_duration || 0],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );

    // Add to listening history
    if (interaction_type === 'play') {
        const historyQuery = createInsertQuery('listening_history', ['user_id', 'track_id', 'play_duration', 'completed']);
        db.run(
            historyQuery,
            [userId, track_id, play_duration || 0, (play_duration || 0) > 30 ? 1 : 0]
        );
    }
});

// Get user favorites
app.get('/api/favorites', (req, res) => {
    const userId = req.session?.user?.id || 'guest';

    db.all(
        `SELECT t.*, f.added_at as favorited_at,
                GROUP_CONCAT(tg.genre) as genres
         FROM tracks t
         JOIN user_favorites f ON t.id = f.track_id
         LEFT JOIN track_genres tg ON t.id = tg.track_id
         WHERE f.user_id = ?
         GROUP BY t.id
         ORDER BY f.added_at DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows.map(row => ({
                ...row,
                genres: row.genres ? row.genres.split(',') : []
            })));
        }
    );
});

// Toggle favorite
app.post('/api/favorites/:trackId', (req, res) => {
    const { trackId } = req.params;
    const userId = req.session?.user?.id || 'guest';

    // Check if already favorited
    db.get('SELECT id FROM user_favorites WHERE user_id = ? AND track_id = ?', [userId, trackId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (row) {
            // Remove from favorites
            db.run('DELETE FROM user_favorites WHERE user_id = ? AND track_id = ?', [userId, trackId], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ favorited: false });
            });
        } else {
            // Add to favorites
            const favoriteQuery = createInsertQuery('user_favorites', ['user_id', 'track_id']);
            db.run(favoriteQuery, [userId, trackId], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ favorited: true });
            });
        }
    });
});

// Get recent tracks
app.get('/api/recent', (req, res) => {
    const userId = req.session?.user?.id || 'guest';
    const limit = req.query.limit || 20;

    db.all(
        `SELECT t.*, lh.played_at, lh.play_duration,
                GROUP_CONCAT(tg.genre) as genres,
                COUNT(lh.track_id) as play_count
         FROM tracks t
         JOIN listening_history lh ON t.id = lh.track_id
         LEFT JOIN track_genres tg ON t.id = tg.track_id
         WHERE lh.user_id = ?
         GROUP BY t.id
         ORDER BY MAX(lh.played_at) DESC
         LIMIT ?`,
        [userId, limit],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows.map(row => ({
                ...row,
                genres: row.genres ? row.genres.split(',') : []
            })));
        }
    );
});

// Get discovery recommendations
app.get('/api/discover', (req, res) => {
    const userId = req.session?.user?.id || 'guest';
    const algorithm = req.query.algorithm || 'mixed';

    let query = '';
    let params = [];

    switch (algorithm) {
        case 'popular':
            query = `
                SELECT t.*, COUNT(lh.track_id) as play_count,
                       GROUP_CONCAT(tg.genre) as genres,
                       CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
                FROM tracks t
                LEFT JOIN listening_history lh ON t.id = lh.track_id
                LEFT JOIN track_genres tg ON t.id = tg.track_id
                LEFT JOIN user_favorites f ON t.id = f.track_id AND f.user_id = ?
                GROUP BY t.id
                ORDER BY play_count DESC, t.created_at DESC
                LIMIT 20`;
            params = [userId];
            break;

        case 'genre-based':
            query = `
                SELECT DISTINCT t.*, 0 as play_count,
                       GROUP_CONCAT(tg.genre) as genres,
                       CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
                FROM tracks t
                LEFT JOIN track_genres tg ON t.id = tg.track_id
                LEFT JOIN user_favorites f ON t.id = f.track_id AND f.user_id = ?
                WHERE tg.genre IN (
                    SELECT DISTINCT tg2.genre 
                    FROM user_favorites uf
                    JOIN track_genres tg2 ON uf.track_id = tg2.track_id
                    WHERE uf.user_id = ?
                )
                AND t.id NOT IN (
                    SELECT track_id FROM user_favorites WHERE user_id = ?
                )
                GROUP BY t.id
                ORDER BY RANDOM()
                LIMIT 20`;
            params = [userId, userId, userId];
            break;

        case 'new':
            query = `
                SELECT t.*, 0 as play_count,
                       GROUP_CONCAT(tg.genre) as genres,
                       CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
                FROM tracks t
                LEFT JOIN track_genres tg ON t.id = tg.track_id
                LEFT JOIN user_favorites f ON t.id = f.track_id AND f.user_id = ?
                GROUP BY t.id
                ORDER BY t.created_at DESC
                LIMIT 20`;
            params = [userId];
            break;

        default: // mixed
            query = `
                SELECT t.*, 
                       COALESCE(lh_count.play_count, 0) as play_count,
                       GROUP_CONCAT(tg.genre) as genres,
                       CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited,
                       (COALESCE(lh_count.play_count, 0) * 0.3 + 
                        (julianday('now') - julianday(t.created_at)) * -0.1 + 
                        RANDOM() * 0.4) as recommendation_score
                FROM tracks t
                LEFT JOIN (
                    SELECT track_id, COUNT(*) as play_count 
                    FROM listening_history 
                    GROUP BY track_id
                ) lh_count ON t.id = lh_count.track_id
                LEFT JOIN track_genres tg ON t.id = tg.track_id
                LEFT JOIN user_favorites f ON t.id = f.track_id AND f.user_id = ?
                GROUP BY t.id
                ORDER BY recommendation_score DESC
                LIMIT 20`;
            params = [userId];
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(row => ({
            ...row,
            genres: row.genres ? row.genres.split(',') : []
        })));
    });
});

// Get user statistics
app.get('/api/user-stats', (req, res) => {
    const userId = req.session?.user?.id || 'guest';

    const stats = {};

    // Get total listening time
    db.get(
        'SELECT SUM(play_duration) as total_time, COUNT(*) as total_plays FROM listening_history WHERE user_id = ?',
        [userId],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            stats.totalListeningTime = row.total_time || 0;
            stats.totalPlays = row.total_plays || 0;

            // Get favorite count
            db.get('SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?', [userId], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                stats.favoriteCount = row.count || 0;

                // Get top genres
                db.all(
                    `SELECT tg.genre, COUNT(*) as count
                     FROM listening_history lh
                     JOIN track_genres tg ON lh.track_id = tg.track_id
                     WHERE lh.user_id = ?
                     GROUP BY tg.genre
                     ORDER BY count DESC
                     LIMIT 5`,
                    [userId],
                    (err, rows) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        stats.topGenres = rows;
                        res.json(stats);
                    }
                );
            });
        }
    );
});

// Search tracks
app.get('/api/search', (req, res) => {
    const { q, genre, artist } = req.query;
    const userId = req.session?.user?.id || 'guest';

    let query = `
        SELECT DISTINCT t.*, 
               GROUP_CONCAT(DISTINCT tg.genre) as genres,
               CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
        FROM tracks t
        LEFT JOIN track_genres tg ON t.id = tg.track_id
        LEFT JOIN user_favorites f ON t.id = f.track_id AND f.user_id = ?
        WHERE 1=1`;

    const params = [userId];

    if (q) {
        query += ` AND (t.title LIKE ? OR t.artist LIKE ? OR t.album LIKE ?)`;
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (genre) {
        query += ` AND tg.genre LIKE ?`;
        params.push(`%${genre}%`);
    }

    if (artist) {
        query += ` AND t.artist LIKE ?`;
        params.push(`%${artist}%`);
    }

    query += ` GROUP BY t.id ORDER BY t.title`;

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(row => ({
            ...row,
            genres: row.genres ? row.genres.split(',') : []
        })));
    });
});

// Get all genres
app.get('/api/genres', (req, res) => {
    db.all(
        'SELECT genre, COUNT(*) as track_count FROM track_genres GROUP BY genre ORDER BY track_count DESC',
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Video API Endpoints

// Get all videos
app.get('/api/videos', (req, res) => {
    const userId = req.session?.user?.id || 'guest';

    db.all(
        `SELECT v.*, 
                CASE WHEN vf.video_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
         FROM videos v
         LEFT JOIN video_favorites vf ON v.id = vf.video_id AND vf.user_id = ?
         ORDER BY v.created_at DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Add new video (admin only)
app.post('/api/videos', requireAuth, (req, res) => {
    const { title, description, url, thumbnail, duration, category } = req.body;

    const query = createInsertQuery('videos', ['title', 'description', 'url', 'thumbnail', 'duration', 'category']);
    
    db.run(
        query,
        [title, description, url, thumbnail, duration, category],
        function (err) {
            if (err) {
                console.error('❌ Error adding video:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('✅ Video added successfully with ID:', this.lastID);
            res.json({ id: this.lastID, message: 'Video added successfully' });
        }
    );
});

// Delete video (admin only)
app.delete('/api/videos/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM videos WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Video deleted successfully' });
    });
});

// Toggle video favorite
app.post('/api/video-favorites/:videoId', (req, res) => {
    const { videoId } = req.params;
    const userId = req.session?.user?.id || 'guest';

    // Check if already favorited
    db.get('SELECT id FROM video_favorites WHERE user_id = ? AND video_id = ?', [userId, videoId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (row) {
            // Remove from favorites
            db.run('DELETE FROM video_favorites WHERE user_id = ? AND video_id = ?', [userId, videoId], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ favorited: false });
            });
        } else {
            // Add to favorites
            const videoFavoriteQuery = createInsertQuery('video_favorites', ['user_id', 'video_id']);
            db.run(videoFavoriteQuery, [userId, videoId], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ favorited: true });
            });
        }
    });
});

// Get favorite videos
app.get('/api/video-favorites', (req, res) => {
    const userId = req.session?.user?.id || 'guest';

    db.all(
        `SELECT v.*, vf.added_at as favorited_at
         FROM videos v
         JOIN video_favorites vf ON v.id = vf.video_id
         WHERE vf.user_id = ?
         ORDER BY vf.added_at DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows.map(row => ({ ...row, is_favorited: true })));
        }
    );
});

// Log video watch
app.post('/api/video-watch', (req, res) => {
    const { video_id, watch_duration, completed } = req.body;
    const userId = req.session?.user?.id || 'guest';

    const videoHistoryQuery = createInsertQuery('video_history', ['user_id', 'video_id', 'watch_duration', 'completed']);
    db.run(
        videoHistoryQuery,
        [userId, video_id, watch_duration || 0, completed ? 1 : 0],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Get recent videos
app.get('/api/recent-videos', (req, res) => {
    const userId = req.session?.user?.id || 'guest';
    const limit = req.query.limit || 20;

    db.all(
        `SELECT v.*, vh.watched_at, vh.watch_duration,
                CASE WHEN vf.video_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited,
                COUNT(vh.video_id) as watch_count
         FROM videos v
         JOIN video_history vh ON v.id = vh.video_id
         LEFT JOIN video_favorites vf ON v.id = vf.video_id AND vf.user_id = ?
         WHERE vh.user_id = ?
         GROUP BY v.id
         ORDER BY MAX(vh.watched_at) DESC
         LIMIT ?`,
        [userId, userId, limit],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Search videos
app.get('/api/search-videos', (req, res) => {
    const { q, category } = req.query;
    const userId = req.session?.user?.id || 'guest';

    let query = `
        SELECT v.*, 
               CASE WHEN vf.video_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
        FROM videos v
        LEFT JOIN video_favorites vf ON v.id = vf.video_id AND vf.user_id = ?
        WHERE 1=1`;

    const params = [userId];

    if (q) {
        query += ` AND (v.title LIKE ? OR v.description LIKE ?)`;
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm);
    }

    if (category) {
        query += ` AND v.category LIKE ?`;
        params.push(`%${category}%`);
    }

    query += ` ORDER BY v.title`;

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get video categories
app.get('/api/video-categories', (req, res) => {
    db.all(
        'SELECT category, COUNT(*) as video_count FROM videos GROUP BY category ORDER BY video_count DESC',
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'SoundWave server is running'
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    // Check if user is authenticated as admin
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        // Redirect to login if not authenticated
        res.redirect('/login.html');
    }
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});