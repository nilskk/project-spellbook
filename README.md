# Project Spellbook

A Chrome Extension aiming to improve the D&D Beyond Character Tool UI.

## Installation

### Development Installation (Unpacked Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `project-spellbook` directory
5. The extension will now be loaded and active

## File Structure

```
project-spellbook/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html            # Popup UI for the extension
├── popup.js              # Popup functionality
├── background.js         # Service Worker for background tasks
├── content.js            # Content script for D&D Beyond pages
├── styles.css            # Styling for popup and page modifications
├── images/               # Extension icons directory
│   ├── icon-16.png       # 16x16 icon
│   ├── icon-48.png       # 48x48 icon
│   └── icon-128.png      # 128x128 icon
└── README.md             # This file
```

## Features

- **Popup UI**: Enable/disable enhancements and access settings
- **Service Worker**: Background operations and storage management
- **Content Script**: Modifies D&D Beyond character tool UI
- **Easy Toggle**: Simple enable/disable from popup

## Development

To make changes:

1. Edit the relevant files (e.g., `content.js`, `styles.css`)
2. Go to `chrome://extensions/`
3. Click the refresh button on the Project Spellbook extension
4. Test your changes on D&D Beyond

## Permissions

This extension requests:
- **scripting**: To inject scripts into D&D Beyond
- **activeTab**: To access the current tab
- **host_permissions**: Read/modify pages on D&D Beyond

## Next Steps

1. Add custom icons to the `images/` directory (16x16, 48x48, 128x128)
2. Customize `content.js` with specific UI modifications
3. Update `styles.css` with custom styling
4. Test on D&D Beyond character tool pages
