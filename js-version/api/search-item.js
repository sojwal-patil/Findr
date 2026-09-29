// Exact Match Scoring & Search Engine in Serverless JavaScript

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
  const brands = ['fischer', 'amazon', 'imimg', 'indiamart', 'ebay', 'hardware', 'media.fischer'];
  if (brands.some(b => tClean.includes(b) || uClean.includes(b))) {
    bonus += 10.0;
  }

  const finalScore = overlapScore + seqRatio + bonus;
  return Math.max(50.0, Math.min(99.9, Math.round(finalScore * 10) / 10));
}

async function searchExactImages(query, brandPrefix = "fischer", count = 10) {
  const qClean = (query || '').trim();
  let fullQuery = qClean;
  if (brandPrefix && !qClean.toLowerCase().includes(brandPrefix.toLowerCase())) {
    fullQuery = `${brandPrefix} ${qClean}`;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': '*/*'
  };

  try {
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(fullQuery)}`;
    const r1 = await fetch(url, { headers });
    const text1 = await r1.text();

    const vqdMatch = text1.match(/vqd=([0-9\-]+)/) || text1.match(/vqd="([0-9\-]+)"/);
    if (!vqdMatch) return [];

    const v = vqdMatch[1];
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(fullQuery)}&vqd=${v}&f=,,,`;
    const r2 = await fetch(apiUrl, { headers });
    const data = await r2.json();

    const items = [];
    for (const it of (data.results || [])) {
      const img = it.image;
      const thumb = it.thumbnail || img;
      const title = it.title || query;

      if (img && img.startsWith('http')) {
        const score = calculateMatchScore(query, title, img);
        items.push({
          image_url: img,
          thumbnail_url: thumb,
          title: title,
          source: 'Web / Google Index',
          score: score
        });
        if (items.length >= count) break;
      }
    }
    return items;
  } catch (err) {
    console.error(`Error fetching images for '${fullQuery}':`, err);
    return [];
  }
}

async function findBestImages(productName, brandPrefix = "fischer", count = 10) {
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

  let candidates = await searchExactImages(cleanName, brandPrefix, count);

  if (candidates.length < 3 && brandPrefix) {
    const extra = await searchExactImages(cleanName, "", count);
    for (const e of extra) {
      if (!candidates.some(c => c.image_url === e.image_url)) {
        candidates.push(e);
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
  // Enable CORS
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
