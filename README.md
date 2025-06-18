Excellent — here’s a **complete `README.md`** for your Wire24 CDN repo:

---

```markdown
# Wire24 CDN Pipeline

> 🚀 Production-grade cross-platform CDN pipeline for Wire24  
> Fully optimized for React Web, React Native, Cloudflare R2, and modern image processing.

---

## ✨ Features

- ✅ Sharp-based image resizing pipeline
- ✅ Uploads to Cloudflare R2 using AWS SDK v3 (`@aws-sdk/client-s3`)
- ✅ Multiple format support for images: PNG, WebP, AVIF
- ✅ Multiple format support for videos: MP4, WAV
- ✅ Multiple size variants for responsive delivery
- ✅ Versioned asset paths (`v1/`)
- ✅ Automated GitHub Actions workflow for CI/CD
- ✅ Shared CDN asset manifest for React Web and React Native
- ✅ Fully serverless, scalable, and future-proof architecture

---

## 📂 Project Structure
```

wire24-cdn/
├── assets/
│ └── originals/ # Place your original high-res source assets here
├── scripts/
│ └── generate-image-assets.js # Image resizing and upload pipeline
│ └── generate-video-assets.js # Video upload pipeline
├── shared/
│ └── cdnAssets.js # Shared asset manifest for apps
├── .github/
│ └── workflows/
│ └── deploy-assets.yml # CI/CD GitHub Action
├── .env.example # Environment configuration
├── package.json
└── README.md

````

---

## 🚀 Quick Start

### 1️⃣ Clone Repo

```bash
git clone <your-repo-url>
cd wire24-cdn
````

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Setup Environment Variables

Duplicate `.env.example`:

```bash
cp .env.example .env
```

Fill in the following:

| Variable               | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `R2_ACCESS_KEY_ID`     | From Cloudflare R2 Access Keys                                      |
| `R2_SECRET_ACCESS_KEY` | From Cloudflare R2 Access Keys                                      |
| `R2_BUCKET`            | Your Cloudflare R2 bucket name                                      |
| `R2_ENDPOINT`          | Your R2 endpoint (`https://${account_id}.r2.cloudflarestorage.com`) |
| `CDN_BASE_URL`         | Public CDN URL (e.g. `https://cdn.wire24.co/`)                      |

### 4️⃣ Add Source Assets

Drop your original high-res images into:

```bash
/assets/originals/
```

Example:

```bash
/assets/originals/logo.png
/assets/originals/brand-splash.png
```

---

## ⚙️ Run the Pipeline

Run locally:

```bash
npm run upload
```

This will:

- Resize assets to multiple sizes
- Convert formats (PNG, WebP, AVIF)
- Upload to Cloudflare R2 under versioned paths

Example uploaded keys:

```
v1/logo/logo-256.webp
v1/logo/logo-512.avif
v1/brand-splash/brand-splash-1024.png
```

---

## 🤖 GitHub Actions CI/CD

The pipeline includes a GitHub Action located at:

```bash
.github/workflows/deploy-assets.yml
```

This automates the pipeline on every push to `main` that modifies:

- `/assets/originals/`
- `/scripts/generate-assets.js`

---

### ✅ Setup GitHub Repository Secrets

Go to GitHub → Repository → Settings → Secrets → Actions and add:

| Secret                 | Description                |
| ---------------------- | -------------------------- |
| `R2_ACCESS_KEY_ID`     | From Cloudflare            |
| `R2_SECRET_ACCESS_KEY` | From Cloudflare            |
| `R2_BUCKET`            | Your R2 bucket             |
| `R2_ACCOUNT_ID`        | Your Cloudflare account id |
| `CDN_BASE_URL`         | Public CDN URL             |

---

## 🔗 Shared CDN Asset Manifest

Shared manifest located at:

```bash
/shared/cdnAssets.js
```

Example structure:

```javascript
const CDN_BASE = "https://cdn.wire24.co/v1/";

export const cdnAssets = {
  logo: {
    small: `${CDN_BASE}logo/logo-64.webp`,
    medium: `${CDN_BASE}logo/logo-256.webp`,
    large: `${CDN_BASE}logo/logo-1024.webp`,
  },
  splash: {
    iphoneX: `${CDN_BASE}splash/splash-1125.webp`,
  },
};
```

✅ You can publish this as an NPM package and consume in both React Web & React Native apps.

---

## 🏷️ Future Improvements

- ✅ Cloudflare Worker Proxy for dynamic resizing (optional)
- ✅ Automatic version bumping (`v1/`, `v2/`)
- ✅ Support for fonts, icons, SVG optimizations
- ✅ Signed upload URL generator for user uploads

---

## 📖 References

- Cloudflare R2: [https://developers.cloudflare.com/r2/](https://developers.cloudflare.com/r2/)
- AWS SDK v3: [https://github.com/aws/aws-sdk-js-v3](https://github.com/aws/aws-sdk-js-v3)
- Sharp: [https://sharp.pixelplumbing.com/](https://sharp.pixelplumbing.com/)

---

**Wire24 CDN — Built for cross-platform scalability 🚀**

```

---

✅ This README will perfectly fit into your repo and onboard any teammate in minutes.

---

👉 If you’re ready:
I can now generate your full **final optimized repo (SDK v3, CDN-ready, full pipeline, worker-ready)**.
If yes — simply reply:
**"Generate full Wire24 CDN repo"**

🚀
And you’ll get a production-ready zip you can drop into your repo today.
```
