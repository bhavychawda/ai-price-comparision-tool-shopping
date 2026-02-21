const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(payload));
}

function normalizePrice(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanText(htmlText) {
  return decodeHtmlEntities(htmlText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: COMMON_HEADERS, redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  }
  return res.text();
}

function parseAmazon(html) {
  const itemMatch = html.match(/<div[^>]*data-component-type="s-search-result"[\s\S]*?<\/div>\s*<\/div>/i);
  if (!itemMatch) return null;
  const block = itemMatch[0];

  const nameMatch = block.match(/<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
  const linkMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/i);
  const priceMatch = block.match(/a-offscreen">([^<]+)</i) || block.match(/a-price-whole">([^<]+)</i);

  const name = nameMatch ? cleanText(nameMatch[1]) : null;
  const link = linkMatch ? linkMatch[1] : null;
  const price = priceMatch ? normalizePrice(priceMatch[1]) : null;

  if (!name || !link || !price) return null;

  return {
    store: 'Amazon',
    name,
    price,
    url: link.startsWith('http') ? link : `https://www.amazon.in${link}`
  };
}

function parseFlipkart(html) {
  const productPattern = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = productPattern.exec(html)) !== null) {
    const href = match[1] || '';
    const inner = match[2] || '';

    if (!href.includes('/p/') && !href.includes('/itm')) continue;

    const text = cleanText(inner);
    if (!text || text.length < 8) continue;

    const nearby = html.slice(match.index, match.index + 1800);
    const priceMatch = nearby.match(/₹\s?([\d,]+)/) || nearby.match(/_30jeq3[^>]*>\s*₹\s?([\d,]+)/i);
    const price = priceMatch ? normalizePrice(priceMatch[1]) : null;

    if (price) {
      return {
        store: 'Flipkart',
        name: text,
        price,
        url: href.startsWith('http') ? href : `https://www.flipkart.com${href}`
      };
    }
  }

  return null;
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ROOT, path.normalize(safePath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

    if (reqUrl.pathname === '/api/compare') {
      const query = (reqUrl.searchParams.get('q') || '').trim();
      if (!query) {
        return sendJson(res, 400, { error: 'Query parameter q is required.' });
      }

      const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
      const flipkartUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;

      const [amazonResp, flipkartResp] = await Promise.allSettled([
        fetchHtml(amazonUrl).then(parseAmazon),
        fetchHtml(flipkartUrl).then(parseFlipkart)
      ]);

      const amazon = amazonResp.status === 'fulfilled' ? amazonResp.value : null;
      const flipkart = flipkartResp.status === 'fulfilled' ? flipkartResp.value : null;

      if (!amazon && !flipkart) {
        return sendJson(res, 404, {
          query,
          message: 'Item not found on Amazon and Flipkart for this query. Try a more specific keyword.'
        });
      }

      return sendJson(res, 200, { query, amazon, flipkart });
    }

    return serveStatic(req, res, reqUrl.pathname);
  } catch (err) {
    return sendJson(res, 500, {
      error: 'Unexpected server error.',
      details: err.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
