/* Price Hunter Noon content-script. */
(function () {
  const titleEl = document.querySelector('[data-qa="pdp-name"]');
  const priceEl = document.querySelector('[data-qa="pdp-price"]');

  if (!titleEl || !priceEl) return;

  try {
    chrome.runtime.sendMessage({
      type: "PH_PRODUCT_DETECTED",
      url: location.href,
      title: (titleEl.textContent || "").trim(),
      priceLabel: (priceEl.textContent || "").trim(),
    });
  } catch {
    /* extension context invalidated — silently ignore */
  }
})();
