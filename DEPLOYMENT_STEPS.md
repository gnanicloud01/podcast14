# Complete Deployment Guide

## Step 1: Create GitHub Repository
1. Go to https://github.com and sign in
2. Click the "+" icon → "New repository"
3. Repository name: `soundwave-music-player` (or any name you prefer)
4. Make it **Public** (required for free Render deployment)
5. **Don't check** "Initialize with README" (we already have files)
6. Click "Create repository"

## Step 2: Push Code to GitHub
After creating the repository, GitHub will show you commands like this:

```bash
git remote add origin https://github.com/YOUR_USERNAME/soundwave-music-player.git
git branch -M main
git push -u origin main
```

**Replace YOUR_USERNAME with your actual GitHub username** and run these commands in your terminal.

## Step 3: Deploy to Render.com

1. **Go to https://render.com** and sign up/sign in
2. **Click "New +"** → "Web Service"
3. **Connect your GitHub account** if not already connected
4. **Select your repository** (`soundwave-music-player`)
5. **Configure the service:**
   - Name: `soundwave-music-player`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`

6. **Click "Create Web Service"**

## Step 4: Render Will Automatically:
- Create a PostgreSQL database (because of your render.yaml file)
- Set up environment variables
- Deploy your application
- Give you a live URL like: `https://soundwave-music-player.onrender.com`

## Step 5: Test Your Deployment
1. Visit your Render URL
2. Go to `/login.html` to access admin panel
3. Login with: Username: `Gnani14`, Password: `Gnaneshwar@14`
4. Add some songs
5. Refresh the page - songs should persist now!

## Important Notes:
- The first deployment might take 5-10 minutes
- Your app will automatically use PostgreSQL on Render (persistent storage)
- Songs added will now survive server restarts
- Free tier apps sleep after 15 minutes of inactivity

## If You Need Help:
- Check the Render dashboard for deployment logs
- Make sure your GitHub repository is public
- Ensure all files are committed and pushed to GitHub

Your music player will now work perfectly with persistent data storage!