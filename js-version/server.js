const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const searchHandler = require('./api/search-item');
const proxyHandler = require('./api/proxy-image');
const sampleCsvHandler = require('./api/sample-csv');
const exportCsvHandler = require('./api/export-csv');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.csv': 'text/csv'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Add standard helper methods to res to match serverless function signatures
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  res.send = (data) => {
    res.end(data);
  };
  res.redirect = (code, targetUrl) => {
    res.writeHead(code || 302, { Location: targetUrl });
    res.end();
  };

  req.query = parsedUrl.query;

  // Parse Body for POST requests
  if (req.method === 'POST') {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      try {
        req.body = JSON.parse(bodyData);
      } catch (_) {
        req.body = bodyData;
      }
      handleRoute(pathname, req, res);
    });
  } else {
    handleRoute(pathname, req, res);
  }
});

async function handleRoute(pathname, req, res) {
  try {
    if (pathname === '/api/search-item') {
      return await searchHandler(req, res);
    } else if (pathname === '/api/proxy-image') {
      return await proxyHandler(req, res);
    } else if (pathname === '/api/sample-csv') {
      return sampleCsvHandler(req, res);
    } else if (pathname === '/api/export-csv') {
      return exportCsvHandler(req, res);
    } else if (pathname === '/api/health') {
      return res.status(200).json({ status: 'ok', engine: '100% JavaScript Serverless' });
    }

    // Static file serving
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.statusCode = 403;
      return res.end('Forbidden');
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // Fallback to index.html
          fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, fallbackContent) => {
            if (e2) {
              res.statusCode = 404;
              return res.end('Not Found');
            }
            res.setHeader('Content-Type', 'text/html');
            res.end(fallbackContent);
          });
        } else {
          res.statusCode = 500;
          res.end('Server Error');
        }
      } else {
        const ext = path.extname(filePath).toLowerCase();
        res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
        res.end(content);
      }
    });
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Findr (100% JS Edition) running on http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
