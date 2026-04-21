// Service Worker for Project Spellbook

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true });
  console.log('Project Spellbook installed and enabled');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    chrome.storage.local.get('enabled', (data) => {
      sendResponse({ enabled: data.enabled !== false });
    });
    return true; // Keep the connection open for async response
  }
});
