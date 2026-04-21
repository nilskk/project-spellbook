// Content script for Project Spellbook
// This script runs on D&D Beyond pages and can modify the UI

console.log('Project Spellbook content script loaded');

// Check if extension is enabled
chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  if (response && response.enabled) {
    initializeEnhancements();
  }
});

// Listen for changes to extension enabled status
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.enabled) {
    if (changes.enabled.newValue) {
      initializeEnhancements();
    } else {
      removeEnhancements();
    }
  }
});

function initializeEnhancements() {
  console.log('Initializing Project Spellbook enhancements');
  
  // Add your UI modifications here
  // Example: modify character sheet styling, add features, etc.
  document.body.classList.add('project-spellbook-active');
}

function removeEnhancements() {
  console.log('Removing Project Spellbook enhancements');
  document.body.classList.remove('project-spellbook-active');
}
