const productCatalog = [
  {
    canonical: "iphone 15 128gb",
    synonyms: ["iphone15", "apple iphone 15", "iphone 15"],
    amazon: {
      name: "Apple iPhone 15 (128GB) - Black",
      price: 71999,
      url: "https://www.amazon.in/s?k=iphone+15+128gb"
    },
    flipkart: {
      name: "Apple iPhone 15 (Black, 128 GB)",
      price: 71499,
      url: "https://www.flipkart.com/search?q=iphone+15+128gb"
    }
  },
  {
    canonical: "samsung galaxy s24 256gb",
    synonyms: ["galaxy s24", "s24", "samsung s24"],
    amazon: {
      name: "Samsung Galaxy S24 5G (256GB)",
      price: 73999,
      url: "https://www.amazon.in/s?k=samsung+galaxy+s24+256gb"
    },
    flipkart: {
      name: "SAMSUNG Galaxy S24 5G (256 GB)",
      price: 72999,
      url: "https://www.flipkart.com/search?q=samsung+galaxy+s24+256gb"
    }
  },
  {
    canonical: "sony wh-1000xm5",
    synonyms: ["sony xm5", "wh1000xm5", "sony headphones"],
    amazon: {
      name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
      price: 28990,
      url: "https://www.amazon.in/s?k=sony+wh-1000xm5"
    },
    flipkart: {
      name: "Sony WH-1000XM5 Bluetooth Headset",
      price: 27990,
      url: "https://www.flipkart.com/search?q=sony+wh-1000xm5"
    }
  },
  {
    canonical: "boat airdopes 141",
    synonyms: ["airdopes", "boat earbuds", "boat airdopes"],
    amazon: {
      name: "boAt Airdopes 141 TWS Earbuds",
      price: 1199,
      url: "https://www.amazon.in/s?k=boat+airdopes+141"
    },
    flipkart: {
      name: "boAt Airdopes 141 Bluetooth Headset",
      price: 1099,
      url: "https://www.flipkart.com/search?q=boat+airdopes+141"
    }
  },
  {
    canonical: "philips air fryer hd9200",
    synonyms: ["air fryer", "philips fryer", "hd9200"],
    amazon: {
      name: "PHILIPS Air Fryer HD9200/90",
      price: 5999,
      url: "https://www.amazon.in/s?k=philips+air+fryer+hd9200"
    },
    flipkart: {
      name: "PHILIPS HD9200/90 Air Fryer",
      price: 5699,
      url: "https://www.flipkart.com/search?q=philips+air+fryer+hd9200"
    }
  }
];

const stopWords = new Set(["the", "a", "an", "for", "and", "with", "to", "of", "on", "in"]);

const searchForm = document.getElementById("search-form");
const productInput = document.getElementById("product-input");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter((token) => token && !stopWords.has(token));
}

function keywordScore(queryTokens, candidateTokens) {
  const candidateSet = new Set(candidateTokens);
  const overlap = queryTokens.filter((token) => candidateSet.has(token)).length;
  const coverage = overlap / Math.max(queryTokens.length, 1);
  const precision = overlap / Math.max(candidateTokens.length, 1);
  return (coverage * 0.7) + (precision * 0.3);
}

function findBestProduct(query) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;

  let best = null;

  for (const product of productCatalog) {
    const candidateText = [product.canonical, ...(product.synonyms || [])].join(" ");
    const candidateTokens = tokenize(candidateText);
    const score = keywordScore(queryTokens, candidateTokens);

    if (!best || score > best.score) {
      best = { product, score };
    }
  }

  return best && best.score >= 0.45 ? best : null;
}

function formatINR(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(price);
}

function paintResult(product) {
  document.getElementById("amazon-name").textContent = product.amazon.name;
  document.getElementById("amazon-price").textContent = formatINR(product.amazon.price);
  document.getElementById("amazon-link").href = product.amazon.url;

  document.getElementById("flipkart-name").textContent = product.flipkart.name;
  document.getElementById("flipkart-price").textContent = formatINR(product.flipkart.price);
  document.getElementById("flipkart-link").href = product.flipkart.url;

  resultsEl.hidden = false;
  statusEl.classList.remove("warning");
  statusEl.textContent = "Matched best product using keyword analysis. Click Buy Now to open store listing.";
}

function showNotFound() {
  resultsEl.hidden = true;
  statusEl.classList.add("warning");
  statusEl.textContent = "Item not found. Try a more specific name (brand + model + storage/capacity).";
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = productInput.value;

  const match = findBestProduct(query);
  if (!match) {
    showNotFound();
    return;
  }

  paintResult(match.product);
});
