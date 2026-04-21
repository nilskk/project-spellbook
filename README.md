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
├── background.js          # Service Worker for background tasks
├── content.js             # Content script that shows info window on character pages
├── styles.css             # Styling for popup and page modifications
├── images/                # Extension icons directory (optional)
│   └── README.md          # Icon placement guide
└── README.md              # This file
```

## Features

- **Auto-Activation**: When visiting a D&D Beyond character page with ID (e.g., `/characters/50882753`), an info window automatically appears
- **Service Worker**: Background operations and storage management
- **Content Script**: Displays info window on valid character pages
- **No Popup**: Simple, streamlined design with info window instead of popup UI

## How It Works

1. When you visit a character sheet page like `https://www.dndbeyond.com/characters/50882753/`
2. The extension detects the valid URL pattern
3. An info window appears in the top-right corner
4. You can close the window by clicking the ✕ button

The extension is enabled by default and only runs on character sheet pages.

## Development

To make changes:

1. Edit the relevant files (e.g., `content.js` to modify the info window)
2. Go to `chrome://extensions/`
3. Click the refresh button on the Project Spellbook extension
4. Navigate to a character sheet to see your changes

### Customizing the Info Window

Edit the `showInfoWindow()` function in [content.js](content.js) to:
- Change the window position or size
- Modify the content and styling
- Add interactive features

## Permissions

This extension requests:
- **scripting**: To inject scripts into D&D Beyond
- **activeTab**: To access the current tab
- **storage**: To manage extension state
- **host_permissions**: Read/modify pages on D&D Beyond

## Next Steps

1. Add custom content to the info window in `content.js`
2. Implement character sheet enhancements
3. Test on D&D Beyond character tool pages
