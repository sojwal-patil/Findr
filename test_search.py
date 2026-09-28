import urllib.parse
import urllib.request
import re
import json

def search_bing(query, count=5):
    url = f"https://www.bing.com/images/search?q={urllib.parse.quote(query)}&form=HDRSC2&first=1"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        murls = re.findall(r'murl&quot;:&quot;(http[^&]+)&quot;', html)
        if not murls:
            murls = re.findall(r'\"murl\":\"(http[^\"]+)\"', html)
        
        # Also let's extract titles / source page to verify matching
        # Bing has json blobs like {"murl":"...","turl":"...","t":"Title"}
        results = []
        matches = re.findall(r'class="iusc"[^>]*m="([^"]+)"', html)
        for m in matches:
            try:
                decoded = m.replace('&quot;', '"').replace('&amp;', '&')
                data = json.loads(decoded)
                results.append({
                    "image_url": data.get("murl"),
                    "thumb_url": data.get("turl"),
                    "title": data.get("t", ""),
                    "desc": data.get("desc", ""),
                    "source": "bing"
                })
            except Exception:
                pass
        
        if not results and murls:
            results = [{"image_url": u, "thumb_url": u, "title": query, "source": "bing"} for u in murls]
        return results[:count]
    except Exception as e:
        print("Bing error:", e)
        return []

def search_google(query, count=5):
    url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&tbm=isch&udm=2"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        # Google images embeds original URLs in data or script tags
        # Look for http.*.(jpg|png|jpeg|webp)
        urls = re.findall(r'\"(https?://[^"]+\.(?:jpg|jpeg|png|webp|avif)[^"]*)\"', html, re.IGNORECASE)
        # Filter out google domain icons/logos
        clean = []
        for u in urls:
            u_clean = u.encode().decode('unicode_escape')
            if 'gstatic.com' not in u_clean and 'google.com' not in u_clean and 'wikimedia' not in u_clean:
                clean.append({"image_url": u_clean, "thumb_url": u_clean, "title": query, "source": "google"})
        return clean[:count]
    except Exception as e:
        print("Google error:", e)
        return []

if __name__ == "__main__":
    products = [
        "iPhone 15 Pro Max Titanium",
        "Nike Air Jordan 1 Retro High OG",
        "Nutella Hazelnut Spread 750g"
    ]
    for p in products:
        b_res = search_bing(p, 3)
        print(f"\n--- Product: {p} ---")
        for idx, r in enumerate(b_res):
            print(f"[{idx+1}] {r['title'][:40]} -> {r['image_url'][:80]}")
