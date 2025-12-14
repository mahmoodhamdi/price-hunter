import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export interface EmbedWidgetData {
  productId: string;
  productName: string;
  productSlug: string;
  image?: string | null;
  brand?: string | null;
  category?: string | null;
  stores: {
    name: string;
    slug: string;
    price: number;
    currency: Currency;
    url: string;
    inStock: boolean;
    discount?: number | null;
  }[];
  lowestPrice: number;
  highestPrice: number;
  currency: Currency;
  priceRange: string;
  lastUpdated: Date;
}

export interface EmbedConfig {
  theme: "light" | "dark" | "auto";
  primaryColor: string;
  showLogo: boolean;
  showPriceHistory: boolean;
  showStoreLogos: boolean;
  maxStores: number;
  width: string;
  height: string;
  borderRadius: string;
  language: "en" | "ar";
}

export interface EmbedCode {
  html: string;
  javascript: string;
  iframe: string;
}

// Get embed widget data for a product
export async function getEmbedWidgetData(
  productSlug: string
): Promise<EmbedWidgetData | null> {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    include: {
      storeProducts: {
        include: {
          store: true,
        },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!product || product.storeProducts.length === 0) {
    return null;
  }

  const prices = product.storeProducts.map((sp) => Number(sp.price));
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const currency = product.storeProducts[0].currency;

  return {
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    image: product.image,
    brand: product.brand,
    category: product.category,
    stores: product.storeProducts.map((sp) => ({
      name: sp.store.name,
      slug: sp.store.slug,
      price: Number(sp.price),
      currency: sp.currency,
      url: sp.url,
      inStock: sp.inStock,
      discount: sp.discount,
    })),
    lowestPrice,
    highestPrice,
    currency,
    priceRange: `${lowestPrice.toFixed(2)} - ${highestPrice.toFixed(2)} ${currency}`,
    lastUpdated: product.updatedAt,
  };
}

// Get embed widget data by product ID
export async function getEmbedWidgetDataById(
  productId: string
): Promise<EmbedWidgetData | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      storeProducts: {
        include: {
          store: true,
        },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!product || product.storeProducts.length === 0) {
    return null;
  }

  const prices = product.storeProducts.map((sp) => Number(sp.price));
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const currency = product.storeProducts[0].currency;

  return {
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    image: product.image,
    brand: product.brand,
    category: product.category,
    stores: product.storeProducts.map((sp) => ({
      name: sp.store.name,
      slug: sp.store.slug,
      price: Number(sp.price),
      currency: sp.currency,
      url: sp.url,
      inStock: sp.inStock,
      discount: sp.discount,
    })),
    lowestPrice,
    highestPrice,
    currency,
    priceRange: `${lowestPrice.toFixed(2)} - ${highestPrice.toFixed(2)} ${currency}`,
    lastUpdated: product.updatedAt,
  };
}

// Generate embed code for a product
export function generateEmbedCode(
  productSlug: string,
  config: Partial<EmbedConfig> = {}
): EmbedCode {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pricehunter.app";

  const defaultConfig: EmbedConfig = {
    theme: "light",
    primaryColor: "#3b82f6",
    showLogo: true,
    showPriceHistory: false,
    showStoreLogos: true,
    maxStores: 5,
    width: "100%",
    height: "auto",
    borderRadius: "8px",
    language: "en",
    ...config,
  };

  const configParams = new URLSearchParams({
    theme: defaultConfig.theme,
    color: defaultConfig.primaryColor.replace("#", ""),
    logo: defaultConfig.showLogo ? "1" : "0",
    history: defaultConfig.showPriceHistory ? "1" : "0",
    storeLogos: defaultConfig.showStoreLogos ? "1" : "0",
    maxStores: defaultConfig.maxStores.toString(),
    lang: defaultConfig.language,
  });

  const widgetUrl = `${baseUrl}/embed/${productSlug}?${configParams.toString()}`;
  const scriptUrl = `${baseUrl}/embed.js`;

  const html = `<!-- Price Hunter Widget -->
<div
  class="price-hunter-widget"
  data-product="${productSlug}"
  data-theme="${defaultConfig.theme}"
  data-color="${defaultConfig.primaryColor}"
  data-show-logo="${defaultConfig.showLogo}"
  data-show-history="${defaultConfig.showPriceHistory}"
  data-show-store-logos="${defaultConfig.showStoreLogos}"
  data-max-stores="${defaultConfig.maxStores}"
  data-lang="${defaultConfig.language}"
  style="width: ${defaultConfig.width}; border-radius: ${defaultConfig.borderRadius};"
></div>
<script src="${scriptUrl}" async></script>`;

  const javascript = `// Price Hunter Widget
(function() {
  const widget = document.createElement('div');
  widget.className = 'price-hunter-widget';
  widget.dataset.product = '${productSlug}';
  widget.dataset.theme = '${defaultConfig.theme}';
  widget.dataset.color = '${defaultConfig.primaryColor}';
  widget.dataset.showLogo = '${defaultConfig.showLogo}';
  widget.dataset.showHistory = '${defaultConfig.showPriceHistory}';
  widget.dataset.showStoreLogos = '${defaultConfig.showStoreLogos}';
  widget.dataset.maxStores = '${defaultConfig.maxStores}';
  widget.dataset.lang = '${defaultConfig.language}';
  widget.style.width = '${defaultConfig.width}';
  widget.style.borderRadius = '${defaultConfig.borderRadius}';
  document.currentScript.parentNode.insertBefore(widget, document.currentScript);

  const script = document.createElement('script');
  script.src = '${scriptUrl}';
  script.async = true;
  document.head.appendChild(script);
})();`;

  const iframe = `<iframe
  src="${widgetUrl}"
  width="${defaultConfig.width === "100%" ? "100%" : defaultConfig.width}"
  height="${defaultConfig.height === "auto" ? "400" : defaultConfig.height}"
  frameborder="0"
  style="border-radius: ${defaultConfig.borderRadius}; max-width: 100%;"
  loading="lazy"
  title="Price Hunter - ${productSlug}"
></iframe>`;

  return { html, javascript, iframe };
}

// Generate the widget JavaScript file content
export function generateWidgetScript(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pricehunter.app";

  return `// Price Hunter Embed Widget
(function() {
  'use strict';

  const WIDGET_API = '${baseUrl}/api/embed/widget';
  const WIDGET_STYLES = \`
    .ph-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: 1px solid #e5e7eb;
      border-radius: var(--ph-radius, 8px);
      overflow: hidden;
      background: var(--ph-bg, #ffffff);
      color: var(--ph-text, #1f2937);
    }
    .ph-widget.ph-dark {
      --ph-bg: #1f2937;
      --ph-text: #f9fafb;
      border-color: #374151;
    }
    .ph-widget-header {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .ph-dark .ph-widget-header { border-color: #374151; }
    .ph-widget-image {
      width: 80px;
      height: 80px;
      object-fit: contain;
      border-radius: 4px;
      background: #f9fafb;
    }
    .ph-dark .ph-widget-image { background: #374151; }
    .ph-widget-title {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 600;
    }
    .ph-widget-brand {
      margin: 0;
      font-size: 12px;
      color: #6b7280;
    }
    .ph-widget-prices {
      padding: 12px 16px;
    }
    .ph-widget-store {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .ph-dark .ph-widget-store { border-color: #374151; }
    .ph-widget-store:last-child { border-bottom: none; }
    .ph-widget-store-name {
      font-size: 14px;
      font-weight: 500;
    }
    .ph-widget-price {
      font-size: 16px;
      font-weight: 700;
      color: var(--ph-primary, #3b82f6);
    }
    .ph-widget-lowest .ph-widget-price {
      color: #16a34a;
    }
    .ph-widget-out-of-stock {
      color: #ef4444;
      font-size: 12px;
    }
    .ph-widget-footer {
      padding: 12px 16px;
      background: #f9fafb;
      text-align: center;
      font-size: 12px;
    }
    .ph-dark .ph-widget-footer { background: #374151; }
    .ph-widget-footer a {
      color: var(--ph-primary, #3b82f6);
      text-decoration: none;
    }
    .ph-widget-footer a:hover { text-decoration: underline; }
    .ph-widget-loading {
      padding: 40px;
      text-align: center;
      color: #6b7280;
    }
    .ph-widget-error {
      padding: 20px;
      text-align: center;
      color: #ef4444;
    }
  \`;

  function initWidget(container) {
    const product = container.dataset.product;
    const theme = container.dataset.theme || 'light';
    const primaryColor = container.dataset.color || '#3b82f6';
    const showLogo = container.dataset.showLogo !== 'false';
    const maxStores = parseInt(container.dataset.maxStores) || 5;
    const lang = container.dataset.lang || 'en';

    container.innerHTML = '<div class="ph-widget-loading">' +
      (lang === 'ar' ? 'جاري التحميل...' : 'Loading...') + '</div>';

    fetch(WIDGET_API + '?slug=' + encodeURIComponent(product))
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderWidget(container, data, { theme, primaryColor, showLogo, maxStores, lang });
      })
      .catch(err => {
        container.innerHTML = '<div class="ph-widget-error">' +
          (lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data') + '</div>';
      });
  }

  function renderWidget(container, data, config) {
    const { theme, primaryColor, showLogo, maxStores, lang } = config;
    const stores = data.stores.slice(0, maxStores);

    let html = '<div class="ph-widget' + (theme === 'dark' ? ' ph-dark' : '') +
      '" style="--ph-primary: ' + primaryColor + '">';

    html += '<div class="ph-widget-header">';
    if (data.image) {
      html += '<img src="' + data.image + '" alt="' + data.productName + '" class="ph-widget-image">';
    }
    html += '<div>';
    html += '<h3 class="ph-widget-title">' + data.productName + '</h3>';
    if (data.brand) {
      html += '<p class="ph-widget-brand">' + data.brand + '</p>';
    }
    html += '</div></div>';

    html += '<div class="ph-widget-prices">';
    stores.forEach((store, index) => {
      const isLowest = index === 0;
      html += '<div class="ph-widget-store' + (isLowest ? ' ph-widget-lowest' : '') + '">';
      html += '<span class="ph-widget-store-name">' + store.name + '</span>';
      if (store.inStock) {
        html += '<a href="' + store.url + '" target="_blank" rel="noopener" class="ph-widget-price">';
        html += store.price.toFixed(2) + ' ' + store.currency;
        if (store.discount) html += ' <small>(-' + store.discount + '%)</small>';
        html += '</a>';
      } else {
        html += '<span class="ph-widget-out-of-stock">' +
          (lang === 'ar' ? 'غير متوفر' : 'Out of Stock') + '</span>';
      }
      html += '</div>';
    });
    html += '</div>';

    if (showLogo) {
      html += '<div class="ph-widget-footer">';
      html += (lang === 'ar' ? 'مقارنة بواسطة ' : 'Powered by ');
      html += '<a href="${baseUrl}/product/' + data.productSlug + '" target="_blank">Price Hunter</a>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function injectStyles() {
    if (document.getElementById('ph-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'ph-widget-styles';
    style.textContent = WIDGET_STYLES;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    document.querySelectorAll('.price-hunter-widget:not([data-initialized])').forEach(widget => {
      widget.dataset.initialized = 'true';
      initWidget(widget);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init for dynamically added widgets
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(init).observe(document.body, { childList: true, subtree: true });
  }
})();`;
}

// Get compact widget data (for smaller widgets)
export async function getCompactWidgetData(
  productSlug: string
): Promise<{
  name: string;
  lowestPrice: number;
  currency: Currency;
  storeCount: number;
  url: string;
} | null> {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    include: {
      storeProducts: {
        orderBy: { price: "asc" },
        take: 1,
      },
    },
  });

  if (!product || product.storeProducts.length === 0) {
    return null;
  }

  const lowestStore = product.storeProducts[0];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pricehunter.app";

  const storeCount = await prisma.storeProduct.count({
    where: { productId: product.id },
  });

  return {
    name: product.name,
    lowestPrice: Number(lowestStore.price),
    currency: lowestStore.currency,
    storeCount,
    url: `${baseUrl}/product/${product.slug}`,
  };
}

// Track widget impression
export async function trackWidgetImpression(
  productSlug: string,
  referrer: string | null
): Promise<void> {
  // In a real implementation, this would log to an analytics system
  console.log(`Widget impression: ${productSlug} from ${referrer || "direct"}`);
}

// Track widget click
export async function trackWidgetClick(
  productSlug: string,
  storeSlug: string,
  referrer: string | null
): Promise<void> {
  // In a real implementation, this would log to an analytics system
  console.log(
    `Widget click: ${productSlug} -> ${storeSlug} from ${referrer || "direct"}`
  );
}

// Validate embed domain (for widget access control)
export async function validateEmbedDomain(
  domain: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check against blocklist
  const blockedDomains = ["spam.com", "malware.com"];
  if (blockedDomains.some((blocked) => domain.includes(blocked))) {
    return { allowed: false, reason: "Domain is blocked" };
  }

  // In production, you might check against an allowlist or rate limit
  return { allowed: true };
}

// Generate badge/button for quick price display
export function generatePriceBadge(
  price: number,
  currency: Currency,
  storeCount: number,
  config: { style: "minimal" | "detailed"; color: string } = {
    style: "minimal",
    color: "#3b82f6",
  }
): string {
  if (config.style === "minimal") {
    return `<span style="
      display: inline-block;
      background: ${config.color};
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: sans-serif;
      font-size: 14px;
      font-weight: bold;
    ">${price.toFixed(2)} ${currency}</span>`;
  }

  return `<span style="
    display: inline-block;
    background: linear-gradient(135deg, ${config.color} 0%, ${adjustColor(config.color, -20)} 100%);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: sans-serif;
    font-size: 14px;
  ">
    <strong>${price.toFixed(2)} ${currency}</strong>
    <span style="opacity: 0.9; font-size: 12px;"> from ${storeCount} stores</span>
  </span>`;
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
