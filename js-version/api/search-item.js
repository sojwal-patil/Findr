// Multi-Engine (Bing + DuckDuckGo) High-Precision Product Image Matcher in JavaScript

function getBigrams(str) {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.slice(i, i + 2));
  }
  return bigrams;
}

function sequenceMatcherRatio(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const pairs1 = getBigrams(s1);
  const pairs2 = getBigrams(s2);
  let intersection = 0;
  const total = pairs1.length + pairs2.length;
  if (total === 0) return 0;
  for (const p of pairs1) {
    const idx = pairs2.indexOf(p);
    if (idx !== -1) {
      intersection++;
      pairs2.splice(idx, 1);
    }
  }
  return (2.0 * intersection) / total;
}

function calculateMatchScore(productName, title, imageUrl) {
  const pClean = (productName || '').toLowerCase().trim();
  const pWords = new Set(pClean.match(/[a-z0-9]+/g) || []);
  if (pWords.size === 0) return 80.0;

  const tClean = (title || '').toLowerCase();
  const tWords = new Set(tClean.match(/[a-z0-9]+/g) || []);
  const uClean = (imageUrl || '').toLowerCase();

  let overlap = 0;
  for (const w of pWords) {
    if (tWords.has(w)) overlap++;
  }

  const overlapScore = (overlap / Math.max(1, pWords.size)) * 70.0;
  const seqRatio = sequenceMatcherRatio(pClean, tClean.slice(0, pClean.length * 2)) * 20.0;

  let bonus = 0.0;
  const brands = ['fischer', 'amazon', 'imimg', 'indiamart', 'ebay', 'hardware', 'media.fischer', 'target', 'walmart'];
  if (brands.some(b => tClean.includes(b) || uClean.includes(b))) {
    bonus += 10.0;
  }

  const finalScore = overlapScore + seqRatio + bonus;
  return Math.max(50.0, Math.min(99.9, Math.round(finalScore * 10) / 10));
}

// Engine 1: Bing Image Index Scraper
async function searchBingImages(query, count = 10) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };

  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    const res = await fetch(url, { headers });
    const html = await res.text();

    const items = [];
    const regex = /m=&quot;(\{.*?\})&quot;/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      try {
        const decoded = match[1].replace(/&quot;/g, '"');
        const obj = JSON.parse(decoded);
        if (obj.murl && obj.murl.startsWith('http')) {
          const title = obj.t || query;
          const score = calculateMatchScore(query, title, obj.murl);
          items.push({
            image_url: obj.murl,
            thumbnail_url: obj.turl || obj.murl,
            title: title,
            source: 'Bing / Web Index',
            score: score
          });
          if (items.length >= count) break;
        }
      } catch (_) {}
    }
    return items;
  } catch (err) {
    return [];
  }
}

// Engine 2: DuckDuckGo Image Index Scraper
async function searchDuckDuckGoImages(query, count = 10) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const r1 = await fetch(url, { headers });
    const text1 = await r1.text();

    const vqdMatch = text1.match(/vqd=([0-9\-]+)/) || text1.match(/vqd="([0-9\-]+)"/);
    if (!vqdMatch) return [];

    const v = vqdMatch[1];
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${v}&f=,,,`;
    const r2 = await fetch(apiUrl, {
      headers: {
        ...headers,
        'Referer': `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
      }
    });
    const data = await r2.json();

    const items = [];
    for (const it of (data.results || [])) {
      const img = it.image;
      if (img && img.startsWith('http')) {
        const title = it.title || query;
        const score = calculateMatchScore(query, title, img);
        items.push({
          image_url: img,
          thumbnail_url: it.thumbnail || img,
          title: title,
          source: 'DuckDuckGo Index',
          score: score
        });
        if (items.length >= count) break;
      }
    }
    return items;
  } catch (err) {
    return [];
  }
}

async function findBestImages(productName, brandPrefix = "", count = 10) {
  const cleanName = (productName || '').trim();
  if (!cleanName) {
    return {
      product_name: productName,
      best_image_url: "",
      best_thumbnail_url: "",
      best_title: "",
      match_score: 0,
      candidates: [],
      status: "empty"
    };
  }

  let candidates = [];

  // 1. If brandPrefix is provided, search with brandPrefix
  if (brandPrefix && !cleanName.toLowerCase().includes(brandPrefix.toLowerCase())) {
    const brandedQuery = `${brandPrefix} ${cleanName}`;
    candidates = await searchBingImages(brandedQuery, count);
    if (candidates.length < 3) {
      const ddg = await searchDuckDuckGoImages(brandedQuery, count);
      for (const d of ddg) {
        if (!candidates.some(c => c.image_url === d.image_url)) {
          candidates.push(d);
        }
      }
    }
  }

  // 2. If no brand prefix OR candidates are low (< 3) OR top score is low, also search exact cleanName
  if (candidates.length < 3 || !brandPrefix || (candidates[0] && candidates[0].score < 70)) {
    const rawCandidates = await searchBingImages(cleanName, count);
    for (const r of rawCandidates) {
      if (!candidates.some(c => c.image_url === r.image_url)) {
        candidates.push(r);
      }
    }
    if (candidates.length < 3) {
      const ddgRaw = await searchDuckDuckGoImages(cleanName, count);
      for (const d of ddgRaw) {
        if (!candidates.some(c => c.image_url === d.image_url)) {
          candidates.push(d);
        }
      }
    }
  }

  // 3. If still empty, simplify long query by taking core significant words
  if (candidates.length === 0) {
    const words = cleanName.split(/\s+/).filter(w => !['with', 'and', 'for', 'the', 'model', 'series', 'class', 'in', 'item'].includes(w.toLowerCase()));
    if (words.length > 2) {
      const relaxedQuery = words.slice(0, 4).join(' ');
      const relaxedCandidates = await searchBingImages(relaxedQuery, count);
      for (const rc of relaxedCandidates) {
        if (!candidates.some(c => c.image_url === rc.image_url)) {
          candidates.push(rc);
        }
      }
    }
  }

  // 4. Final auto-retry fallback: Strip non-alphanumeric and take first 3 words
  if (candidates.length === 0) {
    const alphanumeric = cleanName.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const shortTerms = alphanumeric.split(' ').slice(0, 3).join(' ');
    if (shortTerms && shortTerms.length >= 3) {
      const shortCandidates = await searchBingImages(shortTerms, count);
      for (const sc of shortCandidates) {
        if (!candidates.some(c => c.image_url === sc.image_url)) {
          candidates.push(sc);
        }
      }
    }
  }

  candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
  const bestImage = candidates[0] || null;

  return {
    product_name: cleanName,
    best_image_url: bestImage ? bestImage.image_url : "",
    best_thumbnail_url: bestImage ? bestImage.thumbnail_url : "",
    best_title: bestImage ? bestImage.title : "",
    match_score: bestImage ? bestImage.score : 0,
    candidates: candidates.slice(0, count),
    status: bestImage ? "success" : "not_found"
  };
}

// Serverless Handler (Vercel / Node HTTP / Edge compatible)
module.exports = async function handler(req, res) {
  if (res && res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }
    body = body || req.query || {};

    const productName = body.custom_query || body.product_name || req.query?.q || '';
    const brandPrefix = body.brand_prefix || req.query?.brand || 'fischer';

    const result = await findBestImages(productName, brandPrefix, 10);
    
    if (res && res.status) {
      return res.status(200).json(result);
    }
    return result;
  } catch (err) {
    if (res && res.status) {
      return res.status(500).json({ error: err.message });
    }
    throw err;
  }
};
