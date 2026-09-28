# 🖼️ Product Image Finder & CSV Enricher

An interactive, fast app that finds matching product images from the web and enriches CSV files with direct image URLs.

---

## ✨ Features

- **Automated Image Matching**: Intelligent relevance ranking algorithm matching product brand, model, and keywords.
- **CSV Enrichment**: Reads product names from the 1st column and outputs direct Image URLs in the 2nd column.
- **Interactive UI**:
  - **Drag & Drop** or file browser for CSV upload.
  - **Paste Products**: Quick textarea input for ad-hoc lists.
  - **1-Click Demo Sample**: Test immediately with 10 popular products.
  - **Real-time Live Processing**: Streaming progress bar with concurrent search.
  - **Dual View**: Table View & Visual Card Grid View.
  - **Thumbnail Zoom & Lightbox**: Instant visual inspection.
  - **Alternatives Switcher Modal**: Click any item to preview 6 top Google/Bing candidate images and swap with 1 click.
  - **Custom Search Refinement**: Refine search keywords directly within the modal.
  - **Direct Image Proxy**: Prevents broken hotlinking/CORS image loading in browsers.
  - **Export CSV**: 1-Click download of the enriched CSV with Column 1 = `Product Name` and Column 2 = `Image URL`.
  - **Copy URLs**: 1-Click copy of all image URLs to clipboard.

---

## 🚀 How to Run

1. Run the app:
   ```bash
   python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Or simply double-click [run.bat](file:///e:/ImageFinder/run.bat).*

2. Open your browser at:
   **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 📁 Project Structure

- [`app.py`](file:///e:/ImageFinder/app.py): FastAPI backend API with CSV upload, streaming search, image proxy, and CSV export.
- [`search_engine.py`](file:///e:/ImageFinder/search_engine.py): Multi-engine search provider with relevance scoring.
- [`static/index.html`](file:///e:/ImageFinder/static/index.html): Modern UI layout.
- [`static/style.css`](file:///e:/ImageFinder/static/style.css): Dark glassmorphism styling & animations.
- [`static/app.js`](file:///e:/ImageFinder/static/app.js): Client-side interaction & batch processing engine.
- [`run.bat`](file:///e:/ImageFinder/run.bat): One-click Windows runner script.
