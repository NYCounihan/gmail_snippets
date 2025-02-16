export default class NotificationService {
    constructor() {
        if (!NotificationService.instance) {
            this.queue = [];
            this.isPopupActive = false;
            NotificationService.instance = this;
        }
        return NotificationService.instance;
    }

    async showNotification(notification) {
        this.queue.push(notification);
        if (!this.isPopupActive) {
            await this.processQueue();
        }
    }

    async processQueue() {
        while (this.queue.length > 0) {
            try {
                const notification = this.queue.shift();
                await this.displayNotification(notification);
                await this.delay(3000); // Timeout between notifications
            } catch (error) {
                console.error('Error displaying notification:', error);
            }
        }
    }

    async displayNotification(notification) {
      try {
          const result = await new Promise((resolve, reject) => {
              chrome.storage.local.get('isPopupActive', (result) => {
                  if (chrome.runtime.lastError) {
                      reject(chrome.runtime.lastError);
                  } else {
                      resolve(result.isPopupActive || false);
                  }
              });
          });

          if (result) {
              // Send message to popup to update status bar
              chrome.runtime.sendMessage({ action: 'updateStatusBar', status: notification.message });
          } else {
              // Send message to content script to show a subtle notification
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs.length > 0) {
                      chrome.tabs.sendMessage(tabs[0].id, { action: 'showSubtleNotification', message: notification.message });
                  }
              });
          }
      } catch (error) {
          console.error("Error checking popup state:", error);
      }
      return new Promise(resolve => setTimeout(resolve, 2000)); // Simulate display time
  }

  delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }
}