/* Price Hunter Amazon content-script.
 *
 * Detects a product page and posts a message to the background worker so the
 * popup can offer "Add to wishlist" / "Set alert" on click. Lightweight —
 * does not modify the host page DOM.
 */
(function () {
  const titleEl = document.querySelector("#productTitle");
  const priceEl =
    document.querySelector(".a-price-whole") ||
    document.querySelector(".a-price .a-offscreen");

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
