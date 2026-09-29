# 🔍 Findr — Product Image Finder & CSV Enricher

An interactive, lightning-fast app that finds matching high-resolution product images from the web and automatically enriches CSV spreadsheets with direct image URLs.

---

## ⚡ Quick Start Options

### Option 1: Standalone Desktop App (No Python Required)
Simply double-click **`Findr.exe`**. It runs as a native, single-file Windows desktop application with full offline bundling and native Save As dialogs.

### Option 2: Web Server Mode
```bash
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
*Or double-click [run.bat](file:///e:/ImageFinder/run.bat) and open [http://127.0.0.1:8000](http://127.0.0.1:8000).*

---

## 📁 Project Structure

- [`app.py`](file:///e:/ImageFinder/app.py): FastAPI backend API with CSV upload, streaming search, image proxy, and CSV export.
- [`search_engine.py`](file:///e:/ImageFinder/search_engine.py): Multi-engine search provider with relevance scoring.
- [`static/index.html`](file:///e:/ImageFinder/static/index.html): Modern UI layout.
- [`static/style.css`](file:///e:/ImageFinder/static/style.css): Dark glassmorphism styling & animations.
- [`static/app.js`](file:///e:/ImageFinder/static/app.js): Client-side interaction & batch processing engine.
- [`run.bat`](file:///e:/ImageFinder/run.bat): One-click Windows runner script.
