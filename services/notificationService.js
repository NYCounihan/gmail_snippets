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
            this.isPopupActive = true;
            const notification = this.queue.shift();
            try {
                await this.displayNotification(notification);
                await this.delay(3000); // Timeout between notifications
            } catch (error) {
                console.error('Error displaying notification:', error);
            }
        }
        this.isPopupActive = false;
    }

    async displayNotification(notification) {
        // Logic to display notification (status bar or tooltip)
        console.log('Displaying notification:', notification);
        return new Promise(resolve => setTimeout(resolve, 2000)); // Simulate display time
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}