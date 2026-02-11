# Quick Deployment Guide

This project is now configured for **Monolithic Deployment** (Frontend + Backend in one service). This is the fastest and cheapest way to deploy (e.g., on Render Free Tier).

## Prerequisites
1.  **MongoDB Atlas URI** (Database)
2.  **Redis URI** (for background jobs - you can use a free Redis from Render or Upstash)

## Step 1: Update & Push
1.  Open terminal in `backend` folder and run:
    ```bash
    npm install
    ```
    (This ensures `package-lock.json` is updated with the new `pm2` dependency).
2.  Commit and push all changes to GitHub.

## Step 2: Deploy on Render
1.  Create a new **Web Service** on Render.
2.  Connect your GitHub repository.
3.  **Configuration**:
    - **Name**: `smart-reconciliation-system` (or similar)
    - **Runtime**: `Node`
    - **Build Command**: 
      ```bash
      cd frontend && npm install && npm run build && cd ../backend && npm install
      ```
    - **Start Command**: 
      ```bash
      cd backend && npm start
      ```
4.  **Environment Variables** (Add these):
    - `MONGO_URI`: Your MongoDB Connection String.
    - `JWT_SECRET`: A secure random string.
    - `REDIS_HOST`: Your Redis Host (e.g., `red-xxxxx.render.com` or `localhost` if using local redis on simple VPS).
    - `REDIS_PORT`: Your Redis Port (e.g., `6379`).
    - `NODE_ENV`: `production` (Render usually sets this automatically).

## How it Works
- The **Backend** now serves the **Frontend** static files automatically.
- A single URL (e.g., `https://your-app.onrender.com`) serves both the React App and the API.
- `PM2` manages both the Web Server and the Background Worker in the same container.
