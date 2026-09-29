# 🔍 Findr (100% JavaScript Serverless Edition)

A high-precision Product Image Finder & CSV Enricher built in **100% JavaScript (Node / Edge / Serverless)**.

- **Zero VPS / Zero Python / Zero Storage** required.
- **Zero API Keys Required**: Exact web image scraping and matching algorithm ported to pure JS.
- **Free Hosting**: 1-click deploy to **Vercel**, **Cloudflare Pages**, or **Netlify** ($0.00 forever).
- **Never Sleeps**: Starts in 1 millisecond on global edge servers.
- **Custom Domain**: Connect any custom domain with free automatic SSL.

---

## 🚀 How to Run Locally

No `npm install` needed! (Uses pure built-in Node modules):

```bash
cd js-version
node server.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 1-Click Free Cloud Deployment (Vercel)

1. Push your repository to GitHub.
2. Go to **[vercel.com](https://vercel.com/)** → **Add New Project**.
3. Select this repo and set the **Root Directory** to `js-version`.
4. Click **Deploy**.

It goes live in seconds with automatic SSL and zero sleep!

---

## 📁 Architecture

- `api/search-item.js`: Serverless image matching and relevance scoring engine in JS.
- `api/proxy-image.js`: Serverless image proxy to prevent hotlinking blocks.
- `api/sample-csv.js`: Generates sample product CSV.
- `api/export-csv.js`: Serverless CSV exporter.
- `public/`: Exact same dark glassmorphic UI, responsive visual card grid, lightbox, and CSV enrichment interface.
- `vercel.json`: Zero-config serverless routing.
