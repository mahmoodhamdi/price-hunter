/* Price Hunter background service worker (MV3).
 *
 * Wakes up to:
 *   - Listen for content-script messages reporting a detected product URL
 *   - Surface chrome.notifications when alerts fire (the website pushes via
 *     web-push directly, but we mirror critical ones here for the badge)
 */

chrome.runtime.onInstalled.addListener(() => {
  // Set badge text for first install so the user sees the icon glow.
  chrome.action.setBadgeText({ text: "NEW" });
  chrome.action.setBadgeBackgroundColor({ color: "#0066cc" });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "PH_PRODUCT_DETECTED") {
    chrome.action.setBadgeText({ text: "$$" });
    chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
    sendResponse({ ok: true });
  }
  return true;
});

chrome.tabs.onActivated.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});
