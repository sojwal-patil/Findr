import urllib.parse
import urllib.request
import re
import json
import difflib
from typing import List, Dict, Any

class ProductImageMatcher:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }

    def _calculate_match_score(self, product_name: str, title: str, image_url: str, desc: str = "") -> float:
        """
        Calculate a matching score (0 to 100) between the product name and the image metadata.
        """
        p_clean = product_name.lower().strip()
        p_words = set(re.findall(r'\b[a-z0-9]+\b', p_clean))
        if not p_words:
            return 50.0

        t_clean = (title + " " + desc).lower()
        t_words = set(re.findall(r'\b[a-z0-9]+\b', t_clean))
        u_clean = image_url.lower()

        # Word overlap score
        overlap = len(p_words.intersection(t_words))
        overlap_score = (overlap / max(1, len(p_words))) * 65.0

        # Exact phrase similarity
        seq_ratio = difflib.SequenceMatcher(None, p_clean, t_clean[:len(p_clean) * 2]).ratio() * 20.0

        # URL keyword bonus
        url_overlap = sum(1 for w in p_words if len(w) > 3 and w in u_clean)
        url_bonus = min(url_overlap * 3.0, 10.0)

        # Severe penalties for social banners, opengraph cards, logos, and irrelevant site graphics
        penalty = 0.0
        if any(bad in u_clean for bad in ['opengraph', 'og.png', 'og.jpg', 'og_image', 'twitter', 'facebook', 'share-image', 'banner', 'logo', 'icon', 'placeholder', 'avatar', 'nitroindex', 'pixel']):
            penalty += 70.0
        if any(bad in t_clean for bad in ['vector', 'clipart', 'illustration', 'vs', 'versus', 'rumor', 'leak']):
            penalty += 20.0

        # Direct image format check
        bonus = 0.0
        if any(ext in u_clean for ext in ['.jpg', '.jpeg', '.png', '.webp', '.avif']):
            bonus += 10.0
        if any(site in u_clean for site in ['amazon', 'walmart', 'apple', 'nike', 'target', 'bestbuy', 'media-amazon', 'shopify', 'static', 'product', 'images']):
            bonus += 15.0

        final_score = overlap_score + seq_ratio + url_bonus + bonus - penalty
        return max(5.0, min(99.5, round(final_score, 1)))

    def search_bing(self, query: str, count: int = 8) -> List[Dict[str, Any]]:
        results = []
        try:
            encoded_query = urllib.parse.quote(query)
            url = f"https://www.bing.com/images/search?q={encoded_query}&form=HDRSC2&first=1"
            req = urllib.request.Request(url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=8) as response:
                html = response.read().decode('utf-8', errors='ignore')

            # Extract structured JSON blobs from Bing image results
            matches = re.findall(r'class="iusc"[^>]*m="([^"]+)"', html)
            for m in matches:
                try:
                    decoded = m.replace('&quot;', '"').replace('&amp;', '&').replace('&#39;', "'")
                    data = json.loads(decoded)
                    murl = data.get("murl")
                    turl = data.get("turl") or murl
                    title = data.get("t", "")
                    desc = data.get("desc", "")
                    if murl and murl.startswith("http"):
                        score = self._calculate_match_score(query, title, murl, desc)
                        results.append({
                            "image_url": murl,
                            "thumbnail_url": turl,
                            "title": title or query,
                            "source": "Bing",
                            "score": score
                        })
                except Exception:
                    continue

            # Fallback regex if class pattern didn't match
            if not results:
                murls = re.findall(r'\"murl\":\"(http[^\"]+)\"', html)
                for u in murls:
                    score = self._calculate_match_score(query, query, u)
                    results.append({
                        "image_url": u,
                        "thumbnail_url": u,
                        "title": query,
                        "source": "Bing",
                        "score": score
                    })
        except Exception as e:
            print(f"Bing search error for '{query}': {e}")
        return results[:count]

    def search_google_fallback(self, query: str, count: int = 8) -> List[Dict[str, Any]]:
        results = []
        try:
            encoded_query = urllib.parse.quote(query)
            url = f"https://www.google.com/search?q={encoded_query}&tbm=isch&udm=2"
            req = urllib.request.Request(url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=8) as response:
                html = response.read().decode('utf-8', errors='ignore')

            # Extract high-res image URLs in Google scripts/data
            found_urls = re.findall(r'\"(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)\"', html, re.IGNORECASE)
            seen = set()
            for raw_u in found_urls:
                u = raw_u.encode().decode('unicode_escape')
                if u not in seen and 'gstatic.com' not in u and 'google.com' not in u and 'googleusercontent' not in u:
                    seen.add(u)
                    score = self._calculate_match_score(query, query, u)
                    results.append({
                        "image_url": u,
                        "thumbnail_url": u,
                        "title": query,
                        "source": "Google",
                        "score": score
                    })
                    if len(results) >= count:
                        break
        except Exception as e:
            print(f"Google fallback error for '{query}': {e}")
        return results

    def find_best_images(self, product_name: str, count: int = 6) -> Dict[str, Any]:
        """
        Finds candidate images and ranks them by exact match score.
        Returns the top matching image and alternate candidates.
        """
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

        candidates = []
        # 1. Search clean product name
        candidates.extend(self.search_bing(clean_name, count=10))
        
        # 2. If needed or to get higher quality e-commerce images, search with product keywords
        if len(candidates) < 5:
            candidates.extend(self.search_bing(f"{clean_name} product photo", count=6))
            candidates.extend(self.search_google_fallback(clean_name, count=6))

        # Deduplicate candidates by image_url
        unique_candidates = []
        seen_urls = set()
        for c in candidates:
            url = c.get("image_url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_candidates.append(c)

        # Sort candidates by relevance score descending
        unique_candidates.sort(key=lambda x: x.get("score", 0), reverse=True)

        best_image = unique_candidates[0] if unique_candidates else None

        return {
            "product_name": clean_name,
            "best_image_url": best_image["image_url"] if best_image else "",
            "best_thumbnail_url": best_image["thumbnail_url"] if best_image else "",
            "best_title": best_image["title"] if best_image else "",
            "match_score": best_image["score"] if best_image else 0,
            "candidates": unique_candidates[:count],
            "status": "success" if best_image else "not_found"
        }

matcher = ProductImageMatcher()
