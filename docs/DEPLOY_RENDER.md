# Deploying Chameleon Protocol to Render.com

This guide covers how to deploy the Chameleon Protocol as a **Static Site** on Render.com. This configuration works perfectly for the current "Offline-First / Single-Player" architecture.

## Prerequisites

1.  A [GitHub](https://github.com/) account (where your code is hosted).
2.  A [Render.com](https://render.com/) account.
3.  A valid **Google Gemini API Key**.

---

## Step 1: Push Code to GitHub

Ensure your latest code is committed and pushed to a GitHub repository.

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

*(If you haven't created a repo yet, go to GitHub, create a new repo, and follow the instructions to push your existing code).*

---

## Step 2: Create a New Static Site on Render

1.  Log in to your **Render Dashboard**.
2.  Click the **"New +"** button and select **"Static Site"**.
3.  Connect your **GitHub** account if prompted.
4.  Select the repository (`Chameleon`) from the list.

---

## Step 3: Configure Build Settings

Render will ask for build configuration. Use the following settings:

*   **Name:** `chameleon-protocol` (or whatever you prefer)
*   **Branch:** `main` (or `master`)
*   **Root Directory:** `.` (Leave blank or dot)
*   **Build Command:** `npm install && npm run build`
*   **Publish Directory:** `dist`

> **Note:** The `dist` folder is created by Vite during the build process.

---

## Step 4: Add Environment Variables (Crucial!)

This application requires an API Key to function.

1.  Scroll down to the **"Environment Variables"** section (or find the "Environment" tab after creation).
2.  Click **"Add Environment Variable"**.
3.  Enter the details:
    *   **Key:** `GEMINI_API_KEY`
    *   **Value:** `AIzaSy...` (Paste your actual Google Gemini API Key here)

> **Security Note:** Render keeps this key secure on the server side during the build, but since this is a client-side app, the key will be embedded into the final JavaScript code so the browser can use it. This is standard for MVP demos but effectively exposes the key to anyone inspecting the code. **For a hackathon, this is fine.** For production, you would proxy requests through a backend.

---

## Step 5: Deploy

1.  Click **"Create Static Site"**.
2.  Render will start cloning your repo, installing dependencies, and building the app.
3.  Watch the logs. You should see `vite build` output similar to your local machine.
4.  Once finished, you will see a green **"Live"** link (e.g., `https://chameleon-protocol.onrender.com`).

---

## Troubleshooting

### "404 Not Found" on Refresh
If you navigate to a sub-page (like `/manifest`) and refresh, you might get a 404.
*   **Fix:** In Render settings -> Redirects/Rewrites:
    *   **Source:** `/*`
    *   **Destination:** `/index.html`
    *   **Action:** `Rewrite`
    *   This ensures the Single Page App (SPA) handles all routing.

### "API Key Missing" Error
If the app loads but the AI doesn't work:
1.  Check that you added `GEMINI_API_KEY` correctly in Render settings.
2.  Trigger a **Manual Deploy** (Clear Cache & Deploy) to ensure the new variable is picked up during the build.
