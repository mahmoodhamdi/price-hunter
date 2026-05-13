/* Price Hunter popup — MV3 service-worker friendly.
 * Reads the user's API key from chrome.storage.local, hits the
 * Price Hunter extension API, and renders search results or
 * product-page actions.
 *
 * Configure base URL in chrome.storage.local under "baseUrl"
 * (defaults to https://pricehunter.app).
 */

const DEFAULT_BASE_URL = "https://pricehunter.app";

async function getConfig() {
  const { baseUrl, apiKey } = await chrome.storage.local.get([
    "baseUrl",
    "apiKey",
  ]);
  return {
    baseUrl: baseUrl || DEFAULT_BASE_URL,
    apiKey: apiKey || null,
  };
}

function apiHeaders(apiKey) {
  return {
    "x-api-key": apiKey,
    "content-type": "application/json",
  };
}

async function whoami(cfg) {
  if (!cfg.apiKey) return null;
  try {
    const res = await fetch(`${cfg.baseUrl}/api/extension/whoami`, {
      headers: apiHeaders(cfg.apiKey),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function search(cfg, q) {
  const res = await fetch(
    `${cfg.baseUrl}/api/extension/search?q=${encodeURIComponent(q)}`,
    { headers: apiHeaders(cfg.apiKey) }
  );
  if (!res.ok) return [];
  return res.json();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderResults(items) {
  const root = document.getElementById("results");
  if (!items || items.length === 0) {
    root.innerHTML = `<p class="muted">No results.</p>`;
    return;
  }
  root.innerHTML = items
    .slice(0, 10)
    .map(
      (it) => `
      <a class="result-item" href="${escapeHtml(it.url || "#")}" target="_blank" rel="noopener">
        <div>${escapeHtml(it.name)}</div>
        <div class="price">${escapeHtml(it.priceLabel || "")}</div>
      </a>
    `
    )
    .join("");
}

async function getActiveTabHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    return tab && tab.url ? new URL(tab.url).hostname : null;
  } catch {
    return null;
  }
}

const SUPPORTED_HOSTS = [
  "amazon.sa",
  "amazon.eg",
  "amazon.ae",
  "noon.com",
  "jarir.com",
  "extra.com",
  "jumia.com.eg",
  "btech.com",
  "2b.com.eg",
  "sharafdg.com",
  "carrefouruae.com",
  "luluhypermarket.com",
];

async function init() {
  const cfg = await getConfig();
  const status = document.getElementById("status");
  const me = await whoami(cfg);

  if (!me) {
    document.getElementById("not-signed-in").hidden = false;
    status.textContent = "Not signed in";
    return;
  }

  document.getElementById("signed-in").hidden = false;
  status.textContent = me.email || "signed in";

  // Form
  const form = document.getElementById("search-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = document.getElementById("q").value.trim();
    if (!q) return;
    try {
      const items = await search(cfg, q);
      renderResults(items);
    } catch (err) {
      document.getElementById("results").innerHTML =
        '<p class="muted">Search failed.</p>';
    }
  });

  // Active-tab product detection
  const host = await getActiveTabHost();
  if (host && SUPPORTED_HOSTS.some((h) => host.endsWith(h))) {
    document.getElementById("current-product").hidden = false;
  }
}

document.addEventListener("DOMContentLoaded", init);
