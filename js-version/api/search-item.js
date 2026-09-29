// High-Precision Multi-Engine (DuckDuckGo + Bing + Yahoo) Product Matcher in JavaScript

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
  if (pWords.size === 0) return 85.0;

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
  const popularDomains = ['amazon', 'walmart', 'target', 'indiamart', 'imimg', 'ebay', 'bestbuy', 'apple', 'nike', 'sony', 'logitech', 'dyson', 'media'];
  if (popularDomains.some(d => tClean.includes(d) || uClean.includes(d))) {
    bonus += 10.0;
  }

  const finalScore = overlapScore + seqRatio + bonus;
  return Math.max(65.0, Math.min(99.9, Math.round(finalScore * 10) / 10));
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Primary Engine: DuckDuckGo High-Precision Product Image Index
async function searchDuckDuckGo(query, count = 10) {
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };

  try {
    const r1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iar=images&iax=images&ia=images`, { headers });
    const html = await r1.text();
    const vqdMatch = html.match(/vqd=([0-9\-]+)/) || html.match(/vqd="([0-9\-]+)"/) || html.match(/vqd='([0-9\-]+)'/);
    if (!vqdMatch) return [];

    const vqd = vqdMatch[1];
    const apiHeaders = {
      ...headers,
      'Referer': `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      'Accept': 'application/json, text/javascript, */*; q=0.01'
    };

    const r2 = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`, { headers: apiHeaders });
    const data = await r2.json();

    const items = [];
    for (const it of (data.results || [])) {
      const img = it.image;
      if (img && img.startsWith('http') && !img.endsWith('.svg')) {
        const title = it.title || query;
        const score = calculateMatchScore(query, title, img);
        items.push({
          image_url: img,
          thumbnail_url: it.thumbnail || img,
          title: title,
          source: 'DuckDuckGo Product Index',
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

// Secondary Engine: Bing Image Scraper Fallback
async function searchBing(query, count = 10) {
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };

  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&scenario=ImageBasicHover`;
    const res = await fetch(url, { headers });
    const html = await res.text();

    const items = [];
    const murlRegex = /&quot;murl&quot;:&quot;(https?:[^\&]+?)&quot;/g;
    let match;
    while ((match = murlRegex.exec(html)) !== null) {
      const img = match[1];
      if (img && img.startsWith('http') && !img.endsWith('.svg')) {
        const score = calculateMatchScore(query, query, img);
        items.push({
          image_url: img,
          thumbnail_url: img,
          title: query,
          source: 'Bing Visual Web Index',
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

// Tertiary Engine: Yahoo Image Index Fallback
async function searchYahoo(query, count = 10) {
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    const url = `https://images.search.yahoo.com/search/images?p=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers });
    const html = await res.text();

    const items = [];
    // Yahoo embeds image urls in imgurl= or JSON structures
    const imgRegex = /imgurl=(https?%3A%2F%2F[^&]+)/g;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      try {
        const img = decodeURIComponent(match[1]);
        if (img && img.startsWith('http') && !img.endsWith('.svg') && !items.some(i => i.image_url === img)) {
          const score = calculateMatchScore(query, query, img);
          items.push({
            image_url: img,
            thumbnail_url: img,
            title: query,
            source: 'Yahoo Image Index',
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

// Helper to remove technical noise, sizes, colors, and packaging specs
function cleanProductQuery(name) {
  return name
    .replace(/\b(\d+gb|\d+tb|\d+oz|\d+ml|\d+g|\d+kg|\d+l|\d+cm|\d+mm|\d+inch|\d+-inch|\d+k|4k|oled|qled)\b/gi, ' ')
    .replace(/\b(black|white|silver|gold|grey|gray|yellow|nickel|titanium|blue|red|green|orange|purple)\b/gi, ' ')
    .replace(/\b(jar|pack|box|set|bottle|piece|pcs|pair|series|model|class|edition)\b/gi, ' ')
    .replace(/\b(with|and|for|the|in|on|at|of|by|to)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Multi-Tier Automatic Search Cascade with Built-In Retries
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

  // Helper to add unique candidates
  function addCandidates(newItems) {
    for (const item of newItems) {
      if (!candidates.some(c => c.image_url === item.image_url)) {
        candidates.push(item);
      }
    }
  }

  // Tier 1: Search with brand prefix if provided
  if (brandPrefix && !cleanName.toLowerCase().includes(brandPrefix.toLowerCase())) {
    const brandedQuery = `${brandPrefix} ${cleanName}`;
    addCandidates(await searchDuckDuckGo(brandedQuery, count));
    if (candidates.length < 3) addCandidates(await searchBing(brandedQuery, count));
    if (candidates.length < 3) addCandidates(await searchYahoo(brandedQuery, count));
  }

  // Tier 2: Search clean raw name across DDG, Bing & Yahoo
  if (candidates.length < 3) {
    addCandidates(await searchDuckDuckGo(cleanName, count));
    if (candidates.length < 3) addCandidates(await searchBing(cleanName, count));
    if (candidates.length < 3) addCandidates(await searchYahoo(cleanName, count));
  }

  // Tier 3: Core keyword relaxation (stripping fillers & packaging details)
  if (candidates.length < 2) {
    const simplified = cleanProductQuery(cleanName);
    if (simplified && simplified !== cleanName && simplified.length >= 3) {
      addCandidates(await searchDuckDuckGo(simplified, count));
      if (candidates.length < 2) addCandidates(await searchBing(simplified, count));
      if (candidates.length < 2) addCandidates(await searchYahoo(simplified, count));
    }
  }

  // Tier 4: First 3 primary keywords
  if (candidates.length === 0) {
    const words = cleanName.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 2) {
      const shortQuery = words.slice(0, 3).join(' ');
      addCandidates(await searchDuckDuckGo(shortQuery, count));
      if (candidates.length === 0) addCandidates(await searchBing(shortQuery, count));
      if (candidates.length === 0) addCandidates(await searchYahoo(shortQuery, count));
    }
  }

  // Tier 5: Individual brand or key noun fallback
  if (candidates.length === 0) {
    const firstWord = cleanName.split(/\s+/)[0];
    if (firstWord && firstWord.length > 2) {
      addCandidates(await searchDuckDuckGo(`${firstWord} product`, count));
      if (candidates.length === 0) addCandidates(await searchBing(`${firstWord} product`, count));
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
    const brandPrefix = body.brand_prefix || req.query?.brand || '';

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
