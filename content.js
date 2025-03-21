// document.addEventListener('DOMContentLoaded', () => {
//     createClock();
// });

// function createClock() {
//     console.log("createClock function called");
//     // Create the clock div if it doesn't exist
//     let clockDiv = document.getElementById('clock');
//     if (!clockDiv) {
//         clockDiv = document.createElement('div');
//         clockDiv.id = 'clock'; // Set the ID for styling
//         document.body.appendChild(clockDiv); // Append the clock div to the body
//     }

//     // Make the clock draggable
//     let isDragging = false;
//     let offsetX, offsetY;

//     clockDiv.addEventListener('mousedown', (e) => {
//         isDragging = true;
//         offsetX = e.clientX - clockDiv.getBoundingClientRect().left;
//         offsetY = e.clientY - clockDiv.getBoundingClientRect().top;
//     });

//     document.addEventListener('mousemove', (e) => {
//         if (isDragging) {
//             clockDiv.style.left = `${e.clientX - offsetX}px`;
//             clockDiv.style.top = `${e.clientY - offsetY}px`;
//             clockDiv.style.position = 'fixed'; // Ensure it stays in the viewport
//         }
//     });

//     document.addEventListener('mouseup', () => {
//         isDragging = false;
//     });

//     // Update the clock
//     function updateClock() {
//         const now = new Date();
//         clockDiv.innerText = now.toLocaleTimeString();
//     }

//     setInterval(updateClock, 1000);
//     updateClock(); // Initial call to display clock immediately
// }

// Helper function to safely load data from storage
const safeStorageGet = async (keys) => {
    try {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    console.warn('Storage get warning:', chrome.runtime.lastError);
                    resolve(null);
                } else {
                    resolve(result);
                }
            });
        });
    } catch (error) {
        console.warn('Storage get failed:', error);
        return null;
    }
};

// Helper function to safely save data to storage
const safeStorageSet = async (data) => {
    try {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, () => {
                if (chrome.runtime.lastError) {
                    console.warn('Storage set warning:', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    } catch (error) {
        console.warn('Storage set failed:', error);
        return false;
    }
};

class ClockWidget {
    constructor() {
        this.isDragging = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.clockElement = null;
        this.clockContainer = null;
        this.settings = {
            format24Hour: false,
            showSeconds: true
        };
        this.timer = {
            active: false,
            endTime: null,
            intervalId: null,
            originalDuration: 0,
            paused: false,
            remainingTime: 0
        };

        this.init();
    }

    async init() {
        try {
            this.createClockElement();
            await this.loadSettings();
            this.setupEventListeners();
            await this.loadTimerState();
            this.startClock();
        } catch (error) {
            console.warn('Failed to initialize clock:', error);
        }
    }

    createClockElement() {
        this.clockContainer = document.createElement('div');
        this.clockContainer.id = 'clockdiv';
        this.clockElement = document.createElement('div');
        this.clockElement.className = 'clock';
        this.clockContainer.appendChild(this.clockElement);
        document.body.appendChild(this.clockContainer);

        // Create context menu
        const contextMenu = document.createElement('div');
        contextMenu.id = 'clockContextMenu';
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="menu-item" id="toggleFormat">Toggle 12/24 Hour</div>
            <div class="menu-item" id="toggleSeconds">Toggle Seconds</div>
            <div class="menu-separator"></div>
            <div class="menu-header">Set Timer</div>
            <div class="menu-item timer-option" data-minutes="1">1 Minute</div>
            <div class="menu-item timer-option" data-minutes="2">2 Minutes</div>
            <div class="menu-item timer-option" data-minutes="5">5 Minutes</div>
            <div class="menu-item timer-option" data-minutes="10">10 Minutes</div>
            <div class="menu-item timer-option" data-minutes="20">20 Minutes</div>
            <div class="menu-item timer-option" data-minutes="30">30 Minutes</div>
            <div class="menu-item timer-option" data-minutes="60">1 Hour</div>
            <div class="menu-item" id="customTimer">Custom Timer...</div>
            <div class="menu-item dev-block" id="devBlock">Made by @this guy</div>
            ${this.timer.active ? `
                <div class="menu-separator"></div>
                <div class="menu-item" id="${this.timer.paused ? 'resumeTimer' : 'pauseTimer'}">
                    ${this.timer.paused ? 'Resume Timer' : 'Pause Timer'}
                </div>
                <div class="menu-item" id="cancelTimer">Cancel Timer</div>
            ` : ''}
        `;
        document.body.appendChild(contextMenu);
    }

    async loadSettings() {
        try {
            const result = await safeStorageGet(['clockSettings']);
            if (result?.clockSettings) {
                this.settings = { ...this.settings, ...result.clockSettings };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            await safeStorageSet({ clockSettings: this.settings });
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    setupEventListeners() {
        this.setupTimerControls();
        // Dragging functionality
        this.clockContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Context menu
        this.clockContainer.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        document.addEventListener('click', this.handleDocumentClick.bind(this));

        // Menu items
        document.getElementById('toggleFormat').addEventListener('click', () => {
            this.settings.format24Hour = !this.settings.format24Hour;
            this.saveSettings();
        });

        document.getElementById('toggleSeconds').addEventListener('click', () => {
            this.settings.showSeconds = !this.settings.showSeconds;
            this.saveSettings();
        });

        // Timer options
        document.querySelectorAll('.timer-option').forEach(option => {
            option.addEventListener('click', () => {
                const minutes = parseInt(option.dataset.minutes);
                this.startTimer(minutes);
            });
        });

        // Portfolio link
        document.getElementById('devBlock').addEventListener('click', () => {
            window.open('https://yash-chauhan.vercel.app', '_blank');
        });

        // Custom timer
        document.getElementById('customTimer').addEventListener('click', () => {
            const input = prompt('Enter duration (format: HH:MM or number of minutes):');
            if (input === null) return;

            let minutes = 0;
            if (input.includes(':')) {
                const [hours, mins] = input.split(':').map(num => parseInt(num));
                minutes = (hours * 60) + mins;
            } else {
                minutes = parseInt(input);
            }

            if (isNaN(minutes) || minutes <= 0) {
                alert('Please enter a valid duration');
                return;
            }

            this.startTimer(minutes);
        });

        // Timer controls are now handled in setupTimerControls()
    }

    handleMouseDown(e) {
        if (e.button === 0) { // Left click only
            this.isDragging = true;
            this.offsetX = e.clientX - this.clockContainer.getBoundingClientRect().left;
            this.offsetY = e.clientY - this.clockContainer.getBoundingClientRect().top;
            this.clockContainer.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const x = e.clientX - this.offsetX;
            const y = e.clientY - this.offsetY;
            
            // Keep clock within viewport bounds
            const maxX = window.innerWidth - this.clockContainer.offsetWidth;
            const maxY = window.innerHeight - this.clockContainer.offsetHeight;
            
            this.clockContainer.style.left = `${Math.min(Math.max(0, x), maxX)}px`;
            this.clockContainer.style.top = `${Math.min(Math.max(0, y), maxY)}px`;
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.clockContainer.style.cursor = 'grab';
    }

    handleContextMenu(e) {
        e.preventDefault();
        const contextMenu = document.getElementById('clockContextMenu');
        const rect = this.clockContainer.getBoundingClientRect();
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${rect.left}px`;
        contextMenu.style.top = `${rect.bottom}px`;
    }

    handleDocumentClick(e) {
        const contextMenu = document.getElementById('clockContextMenu');
        if (!contextMenu.contains(e.target) && !this.clockContainer.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    }

    formatTime(date) {
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        if (!this.settings.format24Hour) {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            hours = String(hours).padStart(2, '0');
            return `${hours}:${minutes}${this.settings.showSeconds ? `:${seconds}` : ''} ${ampm}`;
        }

        hours = String(hours).padStart(2, '0');
        return `${hours}:${minutes}${this.settings.showSeconds ? `:${seconds}` : ''}`;
    }

    setupTimerControls() {
        document.addEventListener('click', (e) => {
            const pauseTimer = document.getElementById('pauseTimer');
            const resumeTimer = document.getElementById('resumeTimer');
            const cancelTimer = document.getElementById('cancelTimer');

            if (pauseTimer && e.target === pauseTimer) {
                this.pauseTimer();
            } else if (resumeTimer && e.target === resumeTimer) {
                this.resumeTimer();
            } else if (cancelTimer && e.target === cancelTimer) {
                this.cancelTimer();
            }
        });
    }

    updateClock() {
        const now = new Date();
        if (this.timer.active) {
            let timeLeft;
            if (this.timer.paused) {
                timeLeft = this.timer.remainingTime;
            } else {
                timeLeft = this.timer.endTime - now;
            }

            if (timeLeft <= 0) {
                this.timerComplete();
                return;
            }

            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            const progress = ((this.timer.originalDuration * 60000) - timeLeft) / (this.timer.originalDuration * 60000) * 100;
            
            this.clockElement.innerHTML = `
                <div class="timer-display ${this.timer.paused ? 'paused' : ''}">
                <div class="timer-time">${minutes}:${String(seconds).padStart(2, '0')}</div>
                <div class="timer-controls">
                    ${this.timer.paused ? 
                        '<button class="timer-control play" title="Resume Timer">▶</button>' : 
                        '<button class="timer-control pause" title="Pause Timer">⏸</button>'
                    }
                    <button class="timer-control stop" title="End Timer">⏹</button>
                </div>
                    <div class="timer-progress" style="width: ${progress}%"></div>
                </div>
            `;

            // Add event listeners to the new control buttons
            const controls = this.clockElement.querySelector('.timer-controls');
            if (controls) {
                const pauseBtn = controls.querySelector('.pause');
                const playBtn = controls.querySelector('.play');
                const stopBtn = controls.querySelector('.stop');

                if (pauseBtn) {
                    pauseBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.pauseTimer();
                    });
                }

                if (playBtn) {
                    playBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.resumeTimer();
                    });
                }

                if (stopBtn) {
                    stopBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.cancelTimer();
                    });
                }
            }
        } else {
            this.clockElement.textContent = this.formatTime(now);
        }
    }

    startTimer(minutes) {
        this.timer.active = true;
        this.timer.paused = false;
        this.timer.originalDuration = minutes;
        this.timer.endTime = new Date(Date.now() + minutes * 60000);
        this.timer.remainingTime = minutes * 60000;
        this.updateClock();
        document.getElementById('clockContextMenu').style.display = 'none';
        
        // Save timer state
        this.saveTimerState();

        // Add timer class to clock for styling
        this.clockElement.classList.add('timer-active');
    }

    pauseTimer() {
        if (!this.timer.active || this.timer.paused) return;
        
        this.timer.paused = true;
        this.timer.remainingTime = this.timer.endTime - new Date();
        this.clockElement.classList.add('timer-paused');
        this.saveTimerState();
        document.getElementById('clockContextMenu').style.display = 'none';
    }

    resumeTimer() {
        if (!this.timer.active || !this.timer.paused) return;
        
        this.timer.paused = false;
        this.timer.endTime = new Date(Date.now() + this.timer.remainingTime);
        this.clockElement.classList.remove('timer-paused');
        this.saveTimerState();
        document.getElementById('clockContextMenu').style.display = 'none';
    }

    async saveTimerState() {
        try {
            await safeStorageSet({
                timerState: {
                    active: this.timer.active,
                    endTime: this.timer.endTime?.getTime(),
                    originalDuration: this.timer.originalDuration,
                    paused: this.timer.paused,
                    remainingTime: this.timer.remainingTime
                }
            });
        } catch (error) {
            console.warn('Failed to save timer state:', error);
        }

    }

    cancelTimer() {
        this.timer.active = false;
        this.timer.paused = false;
        this.timer.endTime = null;
        this.timer.remainingTime = 0;
        this.clockElement.classList.remove('timer-active', 'timer-paused');
        document.getElementById('clockContextMenu').style.display = 'none';
        
        // Clear timer state
        chrome.storage.local.remove('timerState');
    }

    timerComplete() {
        this.cancelTimer();
        this.showNotification();
    }

    showNotification() {
        
        try {
            // Create notification overlay
            const overlay = document.createElement('div');
            overlay.className = 'timer-overlay';
            
            const notification = document.createElement('div');
            notification.className = 'timer-notification';
            notification.innerHTML = `
                <div class="notification-title">Timer Complete!</div>
                <div class="notification-message">Your ${this.timer.originalDuration} minute timer has ended</div>
                <button class="notification-close">Close</button>
            `;
            
            overlay.appendChild(notification);
            document.body.appendChild(overlay);

            // Add close button functionality
            const closeButton = notification.querySelector('.notification-close');
            closeButton.addEventListener('click', () => {
                overlay.remove();
            });

            // Create and configure audio
            const audioUrl = chrome.runtime.getURL('notification.mp3');
            const audio = new Audio(audioUrl);
            audio.volume = 0.7;
            audio.preload = 'auto';
            
            // Function to play sound once
            const playSound = async () => {
                if (!document.body.contains(overlay)) return; // Stop if notification was closed
                
                try {
                    await audio.play();
                } catch (error) {
                    console.warn('Could not play notification sound:', error);
                    if (!document.getElementById('playSound') && document.body.contains(overlay)) {
                        const soundButton = document.createElement('button');
                        soundButton.id = 'playSound';
                        soundButton.className = 'notification-sound';
                        soundButton.innerHTML = '🔔 Play Sound';
                        soundButton.onclick = (e) => {
                            e.preventDefault();
                            audio.play().catch(console.warn);
                        };
                        notification.appendChild(soundButton);
                    }
                }
            };
            
            // Play sound once
            playSound().catch(console.warn);

            // Auto-remove notification after 10 seconds if not closed manually
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    overlay.remove();
                }
            }, 10000);
            
        } catch (error) {
            console.warn('Error showing notification:', error);
        }
    }

    async loadTimerState() {
        try {
            const result = await safeStorageGet(['timerState']);
            if (!result) return;
            
            if (result.timerState && result.timerState.active) {
                const now = Date.now();
                const endTime = result.timerState.endTime;
                
                this.timer.active = true;
                this.timer.paused = result.timerState.paused;
                this.timer.originalDuration = result.timerState.originalDuration;
                
                if (this.timer.paused) {
                    this.timer.remainingTime = result.timerState.remainingTime;
                    this.clockElement.classList.add('timer-active', 'timer-paused');
                } else if (endTime > now) {
                    this.timer.endTime = new Date(endTime);
                    this.timer.remainingTime = endTime - now;
                    this.clockElement.classList.add('timer-active');
                } else {
                    this.timerComplete();
                    return;
                }
                this.updateClock(); // Immediately update the display
            }
        } catch (error) {
            console.warn('Failed to load timer state:', error);
        }
    }

    startClock() {
        this.updateClock(); // Initial update
        setInterval(() => this.updateClock(), 1000);
    }
}

// Initialize the clock widget with error handling
try {
    const clockWidget = new ClockWidget();
} catch (error) {
    console.warn('Failed to initialize clock widget:', error);
    // Wait a bit and try to reload the page
    setTimeout(() => window.location.reload(), 1000);
}
