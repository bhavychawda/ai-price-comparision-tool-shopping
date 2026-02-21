const searchForm = document.getElementById('search-form');
const productInput = document.getElementById('product-input');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

function formatINR(price) {
  if (typeof price !== 'number') return 'Price unavailable';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
}

function paintStore(cardPrefix, data) {
  const nameEl = document.getElementById(`${cardPrefix}-name`);
  const priceEl = document.getElementById(`${cardPrefix}-price`);
  const linkEl = document.getElementById(`${cardPrefix}-link`);

  if (!data) {
    nameEl.textContent = 'Item not found';
    priceEl.textContent = '—';
    linkEl.removeAttribute('href');
    linkEl.setAttribute('aria-disabled', 'true');
    linkEl.textContent = 'Not Available';
    return;
  }

  nameEl.textContent = data.name;
  priceEl.textContent = formatINR(data.price);
  linkEl.href = data.url;
  linkEl.removeAttribute('aria-disabled');
  linkEl.textContent = 'Buy Now';
}

async function compareProducts(query) {
  const response = await fetch(`/api/compare?q=${encodeURIComponent(query)}`);
  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to fetch product data right now.';
    throw new Error(message);
  }

  return payload;
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = productInput.value.trim();

  if (!query) {
    statusEl.classList.add('warning');
    statusEl.textContent = 'Please enter a product keyword.';
    return;
  }

  statusEl.classList.remove('warning');
  statusEl.textContent = 'Searching Amazon and Flipkart...';
  resultsEl.hidden = true;

  try {
    const data = await compareProducts(query);

    paintStore('amazon', data.amazon);
    paintStore('flipkart', data.flipkart);

    resultsEl.hidden = false;

    if (!data.amazon || !data.flipkart) {
      statusEl.classList.add('warning');
      statusEl.textContent = 'Found partial results. One store may not have a close match.';
    } else {
      statusEl.classList.remove('warning');
      statusEl.textContent = 'Found matching products from both stores.';
    }
  } catch (error) {
    resultsEl.hidden = true;
    statusEl.classList.add('warning');
    statusEl.textContent = error.message || 'Item not found.';
  }
});
