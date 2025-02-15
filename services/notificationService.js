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
          // Show a subtle notification popup
          this.showSubtleNotification(notification.message);
        }
      } catch (error) {
        console.error("Error checking popup state:", error);
        this.showSubtleNotification(notification.message); // Fallback in case of error
      }
      return new Promise(resolve => setTimeout(resolve, 2000)); // Simulate display time
    }

    showSubtleNotification(message) {
        const notificationDiv = document.createElement('div');
        notificationDiv.classList.add('subtle-notification');
        notificationDiv.textContent = message;

        // Style the notification
        notificationDiv.style.position = 'fixed';
        notificationDiv.style.top = '10px';
        notificationDiv.style.right = '10px';
        notificationDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notificationDiv.style.color = 'white';
        notificationDiv.style.padding = '10px';
        notificationDiv.style.borderRadius = '5px';
        notificationDiv.style.zIndex = '10000';
        notificationDiv.style.display = 'block';

        document.body.appendChild(notificationDiv);

        // Remove the notification after 4 seconds
        setTimeout(() => {
            notificationDiv.style.display = 'none';
            notificationDiv.remove();
        }, 4000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}