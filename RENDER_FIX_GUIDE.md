# Fix for Render.com Database Persistence Issue

## Problem
Your music player was losing added songs after server restarts because Render.com uses ephemeral storage. The SQLite database file was being reset on each deployment.

## Solution
I've updated your app to use PostgreSQL for production (Render.com) while keeping SQLite for local development.

## Changes Made

### 1. Updated server.js
- Added PostgreSQL support with `pg` package
- Created database abstraction layer that works with both SQLite and PostgreSQL
- Updated all table creation queries to be compatible with both databases
- Added helper functions for INSERT queries with RETURNING clause

### 2. Updated package.json
- Added `pg` dependency for PostgreSQL support

### 3. Updated render.yaml
- Added PostgreSQL database configuration
- Connected the web service to the database via environment variables

## Deployment Steps

1. **Commit and push your changes to GitHub:**
   ```bash
   git add .
   git commit -m "Fix database persistence with PostgreSQL support"
   git push origin main
   ```

2. **Render.com will automatically:**
   - Create a PostgreSQL database named `soundwave-db`
   - Set the `DATABASE_URL` environment variable
   - Deploy your updated application

3. **After deployment:**
   - Your app will automatically use PostgreSQL in production
   - All songs added through the admin panel will persist permanently
   - The database will survive server restarts and redeployments

## How It Works

- **Local Development**: Uses SQLite database file (`music_player.db`)
- **Production (Render.com)**: Uses PostgreSQL database via `DATABASE_URL` environment variable
- **Automatic Detection**: The app checks for `DATABASE_URL` to determine which database to use

## Testing

1. After deployment, add some songs through the admin panel
2. Wait a few minutes and refresh the page - songs should still be there
3. The songs will persist even after server restarts

## Notes

- Your existing local development setup remains unchanged
- The admin credentials remain the same: `Gnani14` / `Gnaneshwar@14`
- All existing functionality is preserved
- The database migration happens automatically on first deployment

Your music player should now work perfectly on Render.com with persistent data storage!