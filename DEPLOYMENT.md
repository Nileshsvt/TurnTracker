# Deployment Guide for TurnTracker

## Step 1: Push to GitHub

First, create a GitHub repository and push your code:

```bash
cd "/home/usl-sz-0158/Desktop/new app"
git init
git add .
git commit -m "Initial commit - TurnTracker app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/turntracker.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Render (Free)

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the `backend` folder as **Root Directory**
5. Settings:
   - **Name**: turntracker-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Click **"Create Web Service"**
7. Wait for deployment (2-3 minutes)
8. Copy your backend URL (e.g., `https://turntracker-api.onrender.com`)

---

## Step 3: Deploy Frontend on Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Create React App
5. Add Environment Variable:
   - **Name**: `REACT_APP_API_URL`
   - **Value**: `https://your-backend-url.onrender.com/api` (from Step 2)
6. Click **"Deploy"**
7. Your app will be live at `https://your-app.vercel.app`

---

## Alternative: Deploy Everything on Render

You can also deploy both frontend and backend on Render:

### Backend (same as above)

### Frontend as Static Site:
1. Click **"New +"** → **"Static Site"**
2. Connect GitHub, select `frontend` folder
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `build`
5. Add environment variable: `REACT_APP_API_URL`

---

## Important Notes

1. **Render Free Tier**: Backend may sleep after 15 mins of inactivity (first request takes ~30 seconds to wake up)

2. **Update API URL**: After deploying backend, update the frontend's `REACT_APP_API_URL` environment variable with your actual backend URL

3. **CORS**: The backend already has CORS enabled, so it will work with any frontend domain

---

## Quick Links

- Render: https://render.com
- Vercel: https://vercel.com
- Netlify: https://netlify.com
- Railway: https://railway.app
