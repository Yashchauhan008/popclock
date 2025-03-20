# PopClock - Floating Timer Extension

A sleek and versatile floating clock and timer Chrome extension that stays on top of your browser window. Perfect for time management and productivity tracking.

## Features

### Floating Clock
- Draggable clock interface that stays visible on any webpage
- Customizable 12/24 hour format
- Optional seconds display
- Elegant, minimalist design with hover effects

### Timer Functionality
- Quick-access preset timers (1, 2, 5, 10, 20, 30 minutes, and 1 hour)
- Custom timer duration support
- Timer state persistence across page refreshes
- Pause/Resume functionality
- Visual progress indicator
- Timer completion notifications

### User Interface
- Context menu for easy access to settings and timer presets
- Smooth animations and transitions
- Visual feedback for timer states (running, paused)
- Notification system with sound alerts

### Technical Features
- State persistence using Chrome's local storage
- Isolated CSS styling to prevent interference from webpage styles
- Responsive and adaptive design
- Non-intrusive overlay notifications

## Usage

1. **Clock Display**:
   - Click and drag to move the clock anywhere on the page
   - Right-click to access the context menu

2. **Timer Controls**:
   - Right-click and select a preset timer duration
   - Choose "Custom Timer" for specific durations
   - Use the play/pause/stop controls in the timer interface
   - Timer continues even after page refresh

3. **Settings**:
   - Toggle between 12/24 hour format
   - Show/hide seconds
   - Access through the context menu

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Development

The extension is built using vanilla JavaScript and CSS, with the following structure:

- `manifest.json`: Extension configuration
- `content.js`: Core functionality and timer logic
- `styles.css`: UI styling with isolation from webpage styles
- `popup.js`: Popup interface handling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
