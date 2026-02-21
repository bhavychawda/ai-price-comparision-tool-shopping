# Amazon vs Flipkart Price Comparator

A lightweight web app that lets you search any product keyword and compare top matching results from **Amazon** and **Flipkart** side by side (name, price, and buy link).

## Prerequisites

- Node.js 18+ (Node 22 recommended)

## Run locally

1. Install dependencies (none required currently, but keep command for future updates):
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open in browser:
   - `http://localhost:3000`

## How it works

- Frontend (`index.html`, `script.js`, `styles.css`) provides a search bar and result cards.
- Backend (`server.js`) serves static files and exposes:
  - `GET /api/compare?q=<keyword>`
- On search submit, frontend calls `/api/compare`, then renders:
  - Amazon result card
  - Flipkart result card
  - Status message for full match, partial match, or not found.

## Test locally

### 1) Syntax checks

```bash
node --check server.js
node --check script.js
```

### 2) Start app and verify root page

```bash
npm start
```

In another terminal:

```bash
curl -i http://127.0.0.1:3000/
```

Expected: `HTTP/1.1 200 OK`.

### 3) Verify compare API

```bash
curl -i "http://127.0.0.1:3000/api/compare?q=iphone%2015%20128gb"
```

Expected behavior:
- `200` when at least one store result is parsed.
- `404` with a helpful message when both stores are unavailable/unmatched.

## Notes

- Live result quality depends on Amazon/Flipkart page markup and anti-bot restrictions.
- If your network/proxy blocks outbound access to these websites, API may return not-found even with valid keywords.
