import NotificationService from './services/notificationService.js';

/*
Future Expansion:
- Add multiple model support via aiConfig.json
- Add model-specific handlers in /models directory
- Add sophisticated prompt templates
- Add retry mechanisms and better error handling
*/

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_K = 40;

const notificationService = new NotificationService();

export default class AIHandler {
  constructor() {
    this.timeout = DEFAULT_TIMEOUT;
    this.loadingIndicator = null;
    this.session = null;
  }

  async initializeSession() {
    // Check if language model is available
    const capabilities = await self.ai.languageModel.capabilities();
    if (capabilities.available === "no") {
      throw new Error('Language model not available on this device');
    }

    // Create session with default parameters
    this.session = await self.ai.languageModel.create({
      systemPrompt: "You are a helpful assistant that improves email snippets to be more professional and context-appropriate.",
      temperature: capabilities.defaultTemperature,
      topK: capabilities.defaultTopK
    });
  }

  async summarizeEmailContext(emailContext) {
    try {
      if (!this.session) {
        await this.initializeSession();
      }

      const prompt = `
        Please summarize the following email context:
        From: ${emailContext.from}
        To: ${emailContext.to}
        Subject: ${emailContext.subject}
        Body: ${emailContext.body}

        Provide a brief summary that captures:
        1. The main topic
        2. The tone/sentiment
        3. Key points or requests
        4. Any specific context that might be relevant
      `;

      const summary = await this.session.prompt(prompt);
      return summary.trim();
    } catch (error) {
      console.error('Failed to summarize email:', error);
      return 'Failed to generate summary';
    }
  }

  async processEmailContext(emailContext) {
    notificationService.showNotification({ 
      message: 'AI analyzing email context...'
    });

    try {
      const summary = await this.summarizeEmailContext(emailContext);
      await chrome.storage.local.set({ 
        currentEmailSummary: summary,
        lastProcessedEmail: emailContext.timestamp
      });

      notificationService.showNotification({ 
        message: 'Email context analyzed and ready'
      });
    } catch (error) {
      console.error('Failed to process email context:', error);
      notificationService.showNotification({ 
        message: 'Failed to analyze email context'
      });
    } 
  }

  async processWithAI(snippet, emailData) {
    try {
      if (!this.session) {
        await this.initializeSession();
      }

      const prompt = `
        Email Summary: ${emailData.summary}
        Original Snippet: ${snippet}
        Task: Modify this snippet to better fit the email context while maintaining the original intent.
        Requirements:
        - Keep professional tone
        - Maintain key information
        - Adapt to conversation context
        - Preserve any formatting
      `;

      console.log('Processing with AI using context:', prompt);
      const result = await this.session.prompt(prompt);
      
      return {
        modified: true,
        content: result.trim()
      };

    } catch (error) {
      console.error('Language model processing error:', error);
      return { modified: false, content: snippet };
    }
  }

  async processSnippet(snippet, emailContext) {
    notificationService.showNotification({message: 'AI Processing...'});
    
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({ modified: false, content: snippet });
      }, this.timeout);

      // Process directly instead of sending message
      this.processWithAI(snippet, emailContext)
        .then(response => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch(() => {
          clearTimeout(timeoutId);
          resolve({ modified: false, content: snippet });
        });
    });
  }

  async extractEmailContext() {
    try {
      const result = await chrome.storage.local.get(['currentEmailSummary', 'currentEmailContext']);
      if (!result.currentEmailSummary) {
        throw new Error('No email summary available');
      }
      return {
        summary: result.currentEmailSummary,
        context: result.currentEmailContext
      };
    } catch (error) {
      console.error('Failed to get email context:', error);
      return { summary: '', context: {} };
    }
  }
}
