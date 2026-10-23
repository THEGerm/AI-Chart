// Project Sphere: publish an equirectangular 360 photo to Google Street View
// using the Street View Publish API directly from the browser.
(function () {
  const API = "https://streetviewpublish.googleapis.com/v1";
  const SCOPE = "https://www.googleapis.com/auth/streetviewpublish";
  // Public OAuth client for this app. Override in the field to use a different Google Cloud project.
  const DEFAULT_CLIENT_ID = "104859418898-n2ioo3c347boutonqbs4llc40v8ac8j5.apps.googleusercontent.com";
  const MIN_W = 3840;
  const MIN_H = 1920;
  const MAX_BYTES = 75 * 1024 * 1024;
  const PREVIEW_W = 4096; // keeps the WebGL texture within common GPU limits

  const $ = (id) => document.getElementById(id);
  const state = { token: null, tokenClient: null, bytes: null, width: 0, height: 0, hasGPano: false, valid: false };
  let viewer = null;
  let map = null;
  let marker = null;

  // ---------- Logging ----------
  function log(msg, html) {
    const line = document.createElement("div");
    if (html) line.innerHTML = msg; else line.textContent = msg;
    $("log").appendChild(line);
  }

  function check(kind, text) {
    const li = document.createElement("li");
    li.className = kind;
    li.textContent = text;
    $("checks").appendChild(li);
  }

  function updatePublishButton() {
    const lat = parseFloat($("lat").value);
    const lng = parseFloat($("lng").value);
    $("publish").disabled = !(state.token && state.valid && Number.isFinite(lat) && Number.isFinite(lng));
  }

  // ---------- Auth ----------
  $("client-id").value = DEFAULT_CLIENT_ID;
  try { $("client-id").value = localStorage.getItem("sphere.clientId") || DEFAULT_CLIENT_ID; } catch (e) { /* storage blocked */ }

  $("sign-in").addEventListener("click", () => {
    const clientId = $("client-id").value.trim();
    if (!clientId) { $("auth-status").textContent = "Enter your OAuth Client ID first"; return; }
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
      $("auth-status").textContent = "Google sign-in script not loaded yet, try again";
      return;
    }
    try { localStorage.setItem("sphere.clientId", clientId); } catch (e) { /* storage blocked */ }

    state.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) { $("auth-status").textContent = "Sign-in failed: " + resp.error; return; }
        state.token = resp.access_token;
        $("auth-status").textContent = "Signed in (token valid about 1 hour)";
        updatePublishButton();
      },
    });
    state.tokenClient.requestAccessToken();
  });

  // ---------- Map ----------
  function initMap() {
    map = L.map("map").setView([20, 0], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.on("click", (e) => setLocation(e.latlng.lat, e.latlng.lng, false));
  }

  function setLocation(lat, lng, recenter) {
    $("lat").value = lat.toFixed(7);
    $("lng").value = lng.toFixed(7);
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);
    if (recenter) map.setView([lat, lng], 17);
    updatePublishButton();
  }

  ["lat", "lng"].forEach((id) => $(id).addEventListener("change", () => {
    const lat = parseFloat($("lat").value);
    const lng = parseFloat($("lng").value);
    if (Number.isFinite(lat) && Number.isFinite(lng)) setLocation(lat, lng, true);
    updatePublishButton();
  }));

  function toLocalInput(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // ---------- File handling ----------
  const drop = $("drop");
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  $("file").addEventListener("change", (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  async function handleFile(file) {
    $("checks").innerHTML = "";
    $("log").innerHTML = "";
    state.valid = false;
    state.bytes = null;
    updatePublishButton();

    const name = file.name.toLowerCase();
    if (name.endsWith(".insp") || name.endsWith(".dng")) {
      check("bad", "This is an unstitched Insta360 file. Export it as a 360 JPG from the Insta360 app or Insta360 Studio, then upload that JPG.");
      return;
    }
    if (!/\.jpe?g$/.test(name) && file.type !== "image/jpeg") {
      check("bad", "File must be a JPEG.");
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let ok = true;

    if (file.size > MAX_BYTES) { check("bad", `File is ${(file.size / 1048576).toFixed(1)} MB. Limit is 75 MB.`); ok = false; }
    else check("ok", `Size ${(file.size / 1048576).toFixed(1)} MB`);

    // Dimensions
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (e) {
      check("bad", "Could not decode the image: " + e.message);
      return;
    }
    state.width = bitmap.width;
    state.height = bitmap.height;

    if (bitmap.width !== bitmap.height * 2) {
      check("bad", `Image is ${bitmap.width}x${bitmap.height}. Street View needs exactly 2:1 (equirectangular). If this is a dual-fisheye image, export it as a 360 photo from Insta360 first.`);
      ok = false;
    } else {
      check("ok", `Equirectangular 2:1 (${bitmap.width}x${bitmap.height})`);
    }
    if (bitmap.width < MIN_W || bitmap.height < MIN_H) {
      check("bad", `Resolution below the 7.5 MP minimum (${MIN_W}x${MIN_H}).`);
      ok = false;
    }

    // Photo Sphere metadata
    state.hasGPano = window.SphereXmp.hasGPano(bytes);
    check(state.hasGPano ? "ok" : "warn", state.hasGPano
      ? "Photo Sphere (GPano) metadata present"
      : "No Photo Sphere metadata found. It will be added automatically before upload.");

    // EXIF: GPS and capture time
    let exif = null;
    try { exif = await exifr.parse(file, { gps: true, tiff: true, exif: true, xmp: false }); } catch (e) { /* no EXIF */ }

    if (exif && Number.isFinite(exif.latitude) && Number.isFinite(exif.longitude)) {
      setLocation(exif.latitude, exif.longitude, true);
      check("ok", `GPS found: ${exif.latitude.toFixed(6)}, ${exif.longitude.toFixed(6)}`);
    } else {
      check("warn", "No GPS in the photo. Click the map to set the location.");
    }

    const taken = exif && (exif.DateTimeOriginal || exif.CreateDate);
    $("capture").value = toLocalInput(taken instanceof Date ? taken : new Date(file.lastModified));
    if (!(taken instanceof Date)) check("warn", "No capture time in EXIF. Using the file date; adjust if needed.");

    showPreview(bitmap);
    state.bytes = bytes;
    state.valid = ok;
    updatePublishButton();
  }

  function showPreview(bitmap) {
    const scale = Math.min(1, PREVIEW_W / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    canvas.toBlob((blob) => {
      $("pano").hidden = false;
      if (viewer) viewer.destroy();
      viewer = pannellum.viewer("pano", {
        type: "equirectangular",
        panorama: URL.createObjectURL(blob),
        autoLoad: true,
        showZoomCtrl: true,
      });
    }, "image/jpeg", 0.9);
  }

  // ---------- Publish ----------
  async function api(path, options) {
    const res = await fetch(API + path, {
      ...options,
      headers: { Authorization: "Bearer " + state.token, ...(options && options.headers) },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`${res.status}: ${(body.error && body.error.message) || text}`);
    return body;
  }

  $("publish").addEventListener("click", async () => {
    const lat = parseFloat($("lat").value);
    const lng = parseFloat($("lng").value);
    const heading = parseFloat($("heading").value);
    const captureMs = Date.parse($("capture").value);

    $("publish").disabled = true;
    $("log").innerHTML = "";

    try {
      let bytes = state.bytes;
      if (!state.hasGPano) {
        bytes = window.SphereXmp.injectGPano(bytes, state.width, state.height, Number.isFinite(heading) ? heading : undefined);
        log("Added Photo Sphere metadata.");
      }

      log("Requesting upload URL...");
      const { uploadUrl } = await api("/photo:startUpload", { method: "POST" });

      log(`Uploading ${(bytes.length / 1048576).toFixed(1)} MB...`);
      const up = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: "Bearer " + state.token, "Content-Type": "image/jpeg" },
        body: new Blob([bytes], { type: "image/jpeg" }),
      });
      if (!up.ok) throw new Error(`Upload failed ${up.status}: ${await up.text()}`);

      log("Creating Street View photo...");
      const pose = { latLngPair: { latitude: lat, longitude: lng } };
      if (Number.isFinite(heading)) pose.heading = heading;
      const body = { uploadReference: { uploadUrl }, pose };
      if (Number.isFinite(captureMs)) body.captureTime = { seconds: Math.floor(captureMs / 1000) };

      const photo = await api("/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const id = photo.photoId && photo.photoId.id;
      log(`Created photo (ID: ${id}). Google now processes it; it can take minutes to hours to appear on Maps.`);
      if (id) pollStatus(id);
    } catch (e) {
      log("Error: " + e.message);
      if (/401|UNAUTHENTICATED/.test(e.message)) log("Your sign-in may have expired. Sign in again and retry.");
    } finally {
      updatePublishButton();
    }
  });

  // Checks processing status so the share link shows when ready.
  // A new photo returns 404 (or 503) until Google finishes indexing it; that is expected, not a failure.
  const POLL_MS = 15000;
  const POLL_MAX = 60; // about 15 minutes
  let lastStatusMsg = "";

  function logOnce(msg) {
    if (msg !== lastStatusMsg) log(msg);
    lastStatusMsg = msg;
  }

  async function pollStatus(id, attempt = 0) {
    if (attempt === 0) lastStatusMsg = "";
    try {
      const p = await api(`/photo/${encodeURIComponent(id)}?view=BASIC`, { method: "GET" });
      if (p.mapsPublishStatus && p.mapsPublishStatus !== "UNSPECIFIED_MAPS_PUBLISH_STATUS") {
        logOnce(`Status: ${p.mapsPublishStatus}`);
      }
      if (p.shareLink) {
        log(`Live on Google Maps: <a href="${encodeURI(p.shareLink)}" target="_blank" rel="noopener">open share link</a>`, true);
        return;
      }
      if (p.mapsPublishStatus === "REJECTED_UNKNOWN") {
        log("Google rejected this photo. Check it meets the 360 photo requirements and try again.");
        return;
      }
      logOnce("Still processing...");
    } catch (e) {
      if (/^(404|503):/.test(e.message)) logOnce("Still processing...");
      else logOnce("Status check failed: " + e.message);
    }
    if (attempt < POLL_MAX) setTimeout(() => pollStatus(id, attempt + 1), POLL_MS);
    else log("Still processing after 15 minutes. Check Google Maps > You > Contributions > Photos later.");
  }

  initMap();
})();
