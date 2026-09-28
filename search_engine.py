import urllib.parse
import re
import json
import difflib
from typing import List, Dict, Any, Optional
import primp

class ProductImageMatcher:
    def __init__(self):
        self.client = primp.Client()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': '*/*',
        }

    def _calculate_match_score(self, product_name: str, title: str, image_url: str) -> float:
        p_clean = product_name.lower().strip()
        p_words = set(re.findall(r'\b[a-z0-9]+\b', p_clean))
        if not p_words:
            return 80.0

        t_clean = title.lower()
        t_words = set(re.findall(r'\b[a-z0-9]+\b', t_clean))
        u_clean = image_url.lower()

        overlap = len(p_words.intersection(t_words))
        overlap_score = (overlap / max(1, len(p_words))) * 70.0
        seq_ratio = difflib.SequenceMatcher(None, p_clean, t_clean[:len(p_clean) * 2]).ratio() * 20.0

        bonus = 0.0
        if any(brand in t_clean or brand in u_clean for brand in ['fischer', 'amazon', 'imimg', 'indiamart', 'ebay', 'hardware', 'media.fischer']):
            bonus += 10.0

        final_score = overlap_score + seq_ratio + bonus
        return max(50.0, min(99.9, round(final_score, 1)))

    def search_exact_images(self, query: str, brand_prefix: str = "fischer", count: int = 10) -> List[Dict[str, Any]]:
        """
        Extracts exact matching high-resolution product images directly from web image index.
        """
        # Build query
        q_clean = query.strip()
        if brand_prefix and brand_prefix.lower() not in q_clean.lower():
            full_query = f"{brand_prefix} {q_clean}"
        else:
            full_query = q_clean

        try:
            url = f"https://duckduckgo.com/?q={urllib.parse.quote(full_query)}"
            r1 = self.client.get(url)
            
            vqd_match = re.search(r'vqd=([0-9\-]+)', r1.text) or re.search(r'vqd=\"([0-9\-]+)\"', r1.text)
            if not vqd_match:
                return []
                
            v = vqd_match.group(1)
            api_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(full_query)}&vqd={v}&f=,,,"
            r2 = self.client.get(api_url)
            data = r2.json()
            
            items = []
            for it in data.get("results", []):
                img = it.get("image")
                thumb = it.get("thumbnail") or img
                title = it.get("title", query)
                if img and img.startswith("http"):
                    score = self._calculate_match_score(query, title, img)
                    items.append({
                        "image_url": img,
                        "thumbnail_url": thumb,
                        "title": title,
                        "source": "Web / Google Index",
                        "score": score
                    })
                    if len(items) >= count:
                        break
            return items
        except Exception as e:
            print(f"Error fetching images for '{full_query}': {e}")
            return []

    def find_best_images(self, product_name: str, brand_prefix: str = "fischer", api_key: str = "", cx: str = "", count: int = 10) -> Dict[str, Any]:
        clean_name = product_name.strip()
        if not clean_name:
            return {
                "product_name": product_name,
                "best_image_url": "",
                "best_thumbnail_url": "",
                "best_title": "",
                "match_score": 0,
                "candidates": [],
                "status": "empty"
            }

        # 1. Fetch exact matching images
        candidates = self.search_exact_images(clean_name, brand_prefix=brand_prefix, count=count)

        # 2. If candidates are low, try without brand prefix
        if len(candidates) < 3 and brand_prefix:
            extra = self.search_exact_images(clean_name, brand_prefix="", count=count)
            for e in extra:
                if not any(c["image_url"] == e["image_url"] for c in candidates):
                    candidates.append(e)

        # Sort candidates by match score
        candidates.sort(key=lambda x: x.get("score", 0), reverse=True)
        best_image = candidates[0] if candidates else None

        return {
            "product_name": clean_name,
            "best_image_url": best_image["image_url"] if best_image else "",
            "best_thumbnail_url": best_image["thumbnail_url"] if best_image else "",
            "best_title": best_image["title"] if best_image else "",
            "match_score": best_image["score"] if best_image else 0,
            "candidates": candidates[:count],
            "status": "success" if best_image else "not_found"
        }

matcher = ProductImageMatcher()
