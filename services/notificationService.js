export default class NotificationService {
    constructor() {
        if (!NotificationService.instance) {
            this.queue = [];
            this.cycleActive = false;
            NotificationService.instance = this;
        }
        return NotificationService.instance;
    }

    async showNotification(notification) {
        this.queue.push(notification);
        if (!this.cycleActive) { // block multiple concurrent loops of notifications
            this.processQueue();
        }
    }

    async processQueue() {
        this.cycleActive = true;

        // cycle through the queue and display each notification
        while (this.queue.length > 0) {
            try {
                const notification = this.queue.shift(); // pop out the first item
                await this.displayNotification(notification);
                await this.delay(3000); // Timeout between notifications
            } catch (error) {
                console.error('Error displaying notification:', error);
            }
        }

        this.cycleActive = false;
    }

    async displayNotification(notification) {
        try {
            const result = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 2000); // 2 seconds timeout
                chrome.runtime.sendMessage({ action: 'updateStatusBar', status: notification.message }, (response) => {
                    if (!response || !response.success) {
                        clearTimeout(timeout);
                        reject(new Error('Failed to update status bar'));
                    } else {
                        clearTimeout(timeout);
                        resolve(true);
                    }
                });
            });

            if (!result) {
                // Send message to content script to show a subtle notification
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs.length > 0) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: 'showSubtleNotification', status: notification.message });
                    }
                });
            }
        } catch (error) {
            console.error("Error displaying notification:", error);
            // Fallback to subtle notification
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'showSubtleNotification', status: notification.message });
                }
            });
        }
        return new Promise(resolve => setTimeout(resolve, 2000)); // Simulate display time
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}