/*
Future Expansion:
- Add multiple model support via aiConfig.json
- Add model-specific handlers in /models directory
- Add sophisticated prompt templates
- Add retry mechanisms and better error handling
*/

const DEFAULT_TIMEOUT = 10000;
let controller = new AbortController();
//const DEFAULT_TEMPERATURE = 0.7;
//const DEFAULT_TOP_K = 40;

export default class AIHandler {
  constructor() {
    this.timeout = DEFAULT_TIMEOUT;
    this.loadingIndicator = null;
    this.session = null;
    this.aiNamespace = self.ai || chrome.aiOriginTrial || chrome.ai;
  }

  async initializeSession() {
    // Check if language model is available
    const capabilities = await this.aiNamespace.languageModel.capabilities();
    if (capabilities.available === "no") {
      throw new Error('Language model not available on this device');
    }

    // Create session with default parameters
    this.session = await this.aiNamespace.languageModel.create({
      systemPrompt: "You are a helpful assistant that improves email snippets to be more professional and context-appropriate.",
      temperature: capabilities.defaultTemperature,
      topK: capabilities.defaultTopK
    });

    console.log('aiHandler: class initialized');
    console.log(await this.session.prompt("say hello in a random fashion"));
  }

  async summarizeEmailContext(rawEmail) {
    try {
      if (!this.session) {
        await this.initializeSession();
        console.log('aiHandler.js: session re-initialized');
      }

      console.log('aiHandler.js '+`${this.session.tokensSoFar}/${this.session.maxTokens} (${this.session.tokensLeft} left)`);

      const from = rawEmail.from ?? "";
      const to = rawEmail.to ?? "";
      const subject = rawEmail.subject ?? "";
      let body = rawEmail.body ?? "";

      // Check if all values are empty
      if (!from && !to && !subject && !body) {
        console.log('aihandler.js: All rawEmail values are empty. Skipping prompt.');
        return 'No email content to summarize';
      }

      // Limit the body (e.g., 500 characters)
      const maxLength = 1500;
      if (body.length > maxLength) {
        body = body.substring(0, maxLength) + '...';
      }

      const prompt = `
        Please summarize the following email context:
        From: ${from}
        To: ${to}
        Subject: ${subject}
        Body: ${body}

        Provide a very brief summary that captures:
        1. The person's first name who sent the most recent email. This is the name of the person who the next response should be addressed to.
        2. The main topic, key points & requests
        3. Any specific context that might be relevant

        This summary will be later used to update email templates to draft a tailored response.
      `;

      console.log('aihandler.js: this is the prompt ' + prompt);

      let summary = '';
      let previousChunk = '';

      controller.abort(); // Abort any previous requests
      controller = new AbortController();

      
      chrome.runtime.sendMessage({ action: 'notification', message: 'AI creating email summary...' });

      // Prompt the model and stream the result:
      const stream = this.session.promptStreaming(prompt, { signal: controller.signal });
      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
            ? chunk.slice(previousChunk.length) : chunk;
        console.log(newChunk);
        summary += newChunk;
        previousChunk = chunk;
      }
      console.log(summary);

      console.log('aihandler.js: complete email summary created from AI ' + summary);
      chrome.runtime.sendMessage({ action: 'notification', message: 'AI succesfully summarized email' });

      // Send notification message to background.js
      chrome.runtime.sendMessage({ action: 'notification', message: 'Email context summarized' });

      return summary.trim();

    } catch (error) {
      chrome.runtime.sendMessage({ action: 'notification', message: 'AI unable to summarize email ' + error.message});
      console.error('aihandler.js: Failed or aborted email summary:' + error.name + ': ' + error.message);
      return summary.trim();
    }
  }

  async processEmailContext(rawEmail) {
    try {
      const summary = await this.summarizeEmailContext(rawEmail);
      chrome.storage.local.set({ currentEmailSummary: summary, lastProcessedEmail: rawEmail.timestamp});
    } catch (error) {
      console.log(error.message);
    } 
  }

  processSnippet(snippet, emailSummary, callback) {
    console.log('aiHandler: processSnippet sent' + snippet + ' // ' + emailSummary);

    // Process directly instead of sending message
    this.modifySnippetAI(snippet, emailSummary)
      .then(response => {
        callback(response);
      })
      .catch(() => {
        callback({ modified: false, content: snippet });
    });
  }

  async modifySnippetAI(snippet, emailSummary) {
    try {
      if (!this.session) {
        await this.initializeSession();
      }

      const prompt = `
      Original Snippet: ${snippet}  
      Email Summary: ${emailSummary}
        Task: Update the original snippet to craft an email response that maintains the original underlying intent and message of the snippet.
              Make as few changes as possible. Do not invent any new information. Only modify the Original Snippet as little as necessary.
              Do not include any other text in your response other than the email reply addressed to the person who sent the last email.
              Your response will be directly inserted into the email. Be sure to address the email to the person who wrote the last email message.
              The email response should include HTML line break characters (<br>) so that it will be formatted correctly when inserted into an email message.
              The email should end with "best, Julian"
        Requirements:
        - Keep professional tone
        - Maintain key information
        - Adapt to conversation context
        - Preserve any formatting
      `;

      console.log('Updating snippet using AI and emailSummary:', prompt);

      chrome.runtime.sendMessage({ action: 'notification', message: 'AI updating snippet...' });
      const result = await this.session.prompt(prompt);
      console.log('aiHandler: modified snippet from AI ' + result.trim());  

      chrome.runtime.sendMessage({ action: 'notification', message: 'Snippet succesfully modified by AI' });

      return {
        modified: true,
        content: result.trim()
      };

    } catch (error) {
      chrome.runtime.sendMessage({ action: 'notification', message: 'Error updating snippet with AI' });
      console.error('aihandler.js: AI error updating snippet : ' + error.name + ': ' + error.message);
      return { modified: false, content: snippet };
    }
  }

} // end of class AIHandler