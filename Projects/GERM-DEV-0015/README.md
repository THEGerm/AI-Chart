# Project Sphere

**GERM-DEV-0015.** Former location `project-sphere/`, moved 2026-10-23. Live page: https://thegerm.github.io/AI-Chart/Projects/GERM-DEV-0015/

Upload a 360 photo from an Insta360 and publish it to Google Street View as a standalone blue dot at its GPS location (no business or landmark needed).

It runs entirely in the browser. No server. It talks straight to the Google Street View Publish API with your own Google sign-in.

## What it does

1. Checks the photo against Google's rules: 2:1 equirectangular, at least 3840x1920, under 75 MB.
2. Reads GPS and capture time from the photo. If there is no GPS, you click the map.
3. Shows a 360 preview.
4. Adds Photo Sphere (GPano) metadata if it is missing.
5. Uploads with `photo:startUpload`, then `photo.create` with `pose.latLngPair` and no `places`. This makes a coordinate-only blue dot.
6. Checks status and shows the share link once Google provides it.

## One-time Google setup (about 10 minutes)

1. Go to https://console.cloud.google.com and create a project.
2. **APIs & Services > Library**: enable **Street View Publish API**.
3. **APIs & Services > OAuth consent screen**: choose External, fill in the app name and your email, add the scope `.../auth/streetviewpublish`, and add your own Google account as a **Test user**.
4. **APIs & Services > Credentials > Create credentials > OAuth client ID**: type **Web application**. Under **Authorized JavaScript origins** add where you will open the app, for example:
   - `http://localhost:8080`
   - `https://<your-github-user>.github.io` (if you host it on GitHub Pages)
5. Copy the Client ID. Paste it into the app in step 1. The app remembers it in this browser.

The app ships with this project's Client ID already filled in (`DEFAULT_CLIENT_ID` in `app.js`). Only replace it if you use your own Google Cloud project.

## Run it

```bash
cd AI-Chart/Projects/GERM-DEV-0015
python3 -m http.server 8080
```

Open http://localhost:8080. It must be served over http(s); opening `index.html` as a file will not work with Google sign-in.

To use it from your phone, host the folder on GitHub Pages (or any static host) and add that origin in step 4.

### GitHub Pages

1. In the AI-Chart repo: **Settings > Pages**.
2. **Source:** Deploy from a branch. **Branch:** `main`, folder `/ (root)`. Save.
3. Wait 1 to 2 minutes, then open https://thegerm.github.io/AI-Chart/Projects/GERM-DEV-0015/ (the path is case-sensitive).
4. In Google Cloud, the OAuth client's **Authorized JavaScript origins** must include `https://thegerm.github.io` (no path, no trailing slash).

## Getting the right file from your Insta360

The camera saves `.insp` files. Those are two unstitched fisheye images and cannot be published as is.

- **Insta360 app (phone):** open the photo, tap export, choose the 360 photo option (not a reframed flat photo). It saves a stitched 2:1 JPG.
- **Insta360 Studio (desktop):** open the `.insp`, export as 360 photo (JPG).

Keep phone location on while shooting so the photo has GPS. If it does not, set the location on the map.

## Notes

- After upload, Google can take from minutes up to a few days to show the blue dot. You can also see it in Google Maps under **You > Contributions**.
- The sign-in token lasts about 1 hour. Sign in again if you get a 401 error.
- Heading is optional. 0 means the center of the photo faces north.
