# 🚩 Parshuram Shobhayatra - Poster Generator

A free web app where 10,000+ users can create and share personalized Parshuram Shobhayatra posters.

## Features
- 📸 Upload selfie → auto-generated poster
- ⬇️ Download poster as image (save to gallery)
- 📤 Share on WhatsApp, Facebook, Instagram
- 💾 Data saved to Google Sheets (free)
- ☁️ Selfie uploaded to Cloudinary with renamed filename
- 📱 Mobile-first, works on all devices

---

## Step 1: Deploy on Vercel (FREE)

1. Push this project to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
3. Click **Deploy** — Vercel gives you a free URL like `https://parshuram-yatra.vercel.app`
4. Share this link with your 10,000 users!

---

## Step 2: Set up Google Sheets (FREE data storage)

### Create the Sheet:
1. Go to [sheets.google.com](https://sheets.google.com) → Create new spreadsheet
2. Name it: **Parshuram Yatra Registrations**
3. In Row 1, add these headers:
   - A1: `Timestamp`
   - B1: `Name`
   - C1: `Mobile`
   - D1: `Photo`

### Create Apps Script:
1. In your Google Sheet → **Extensions** → **Apps Script**
2. Delete existing code and paste this:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name || '',
      data.mobile || '',
      data.selfieBase64 ? 'Photo uploaded' : 'No photo',
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow GET for testing
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'OK' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy** → **New Deployment**
4. Type: **Web App**
5. Execute as: **Me**
6. Who has access: **Anyone**
7. Click **Deploy** → Copy the URL

### Add to Vercel:
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add: `GOOGLE_SHEET_URL` = `(paste your Apps Script URL)`
3. Add Cloudinary vars:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_FOLDER` (optional)
4. Redeploy

### Important Apps Script Access Setting
- For server-to-server `fetch` from this app, deploy Web App with:
  - Execute as: **Me**
  - Who has access: **Anyone**
- `Only myself` usually blocks backend requests from Next.js/Vercel.

---

## Local Development

```bash
# Install dependencies
npm install

# Create env file
cp .env.example .env.local
# Edit .env.local and add your GOOGLE_SHEET_URL

# Run locally
npm run dev
# Open http://localhost:3000
```

---

## Customize the Poster Background

To add a real Parshuram image in the background:
1. Add your image to `/public/parshuram-bg.jpg`
2. In `PosterCanvas.tsx`, in the `drawPoster` function, add after the gradient:

```javascript
try {
  const bgImg = await loadImage('/parshuram-bg.jpg')
  ctx.save()
  ctx.globalAlpha = 0.3  // adjust transparency
  ctx.drawImage(bgImg, 0, 0, W, H)
  ctx.restore()
} catch(e) { /* ignore */ }
```

---

## File Structure

```
src/
  app/
    page.tsx          ← Main app page (form + poster steps)
    layout.tsx        ← HTML layout + metadata
    globals.css       ← All styles
    api/
      register/
        route.ts      ← API to save data to Google Sheets
  components/
    PosterCanvas.tsx  ← Canvas-based poster generator
    ShareButtons.tsx  ← WhatsApp / Facebook / Instagram share
```

---

## Sharing Icons Guide

| Platform | What happens |
|----------|-------------|
| WhatsApp | Opens WhatsApp with text + link. On mobile: shares image file directly |
| Facebook | Opens Facebook share dialog with page link |
| Instagram | On mobile: uses Web Share API to share image. On desktop: opens Instagram |
| Download | Saves poster as PNG to device gallery |

---

## 🆓 All Free!

- **Vercel** → Free hosting (100GB bandwidth/month)
- **Google Sheets** → Free data storage  
- **Next.js** → Free & open source
- **No server costs** for 10,000+ users!
