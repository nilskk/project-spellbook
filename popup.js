// Popup script for Project Spellbook
document.addEventListener('DOMContentLoaded', () => {
  const enableBtn = document.getElementById('enable-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const statusDiv = document.getElementById('status');

  // Load current status
  chrome.storage.local.get('enabled', (data) => {
    const isEnabled = data.enabled !== false;
    enableBtn.textContent = isEnabled ? 'Disable' : 'Enable';
    statusDiv.textContent = isEnabled ? 'Status: Active' : 'Status: Inactive';
    statusDiv.className = isEnabled ? 'status active' : 'status inactive';
  });

  // Enable/Disable button handler
  enableBtn.addEventListener('click', () => {
    chrome.storage.local.get('enabled', (data) => {
      const newState = data.enabled === false;
      chrome.storage.local.set({ enabled: newState });
      enableBtn.textContent = newState ? 'Disable' : 'Enable';
      statusDiv.textContent = newState ? 'Status: Active' : 'Status: Inactive';
      statusDiv.className = newState ? 'status active' : 'status inactive';
    });
  });

  // Settings button handler
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
