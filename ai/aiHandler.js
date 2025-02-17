/*
Future Expansion:
- Add multiple model support via aiConfig.json
- Add model-specific handlers in /models directory
- Add sophisticated prompt templates
- Add retry mechanisms and better error handling
*/

const DEFAULT_TIMEOUT = 10000;
let controller = new AbortController();
const DEFAULT_TEMPERATURE = 0.5; // lower temperature to reduce variability
const DEFAULT_TOP_K = 6; // higher K to increase range of word replacements

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
      temperature: DEFAULT_TEMPERATURE,
      topK: DEFAULT_TOP_K
    });

    console.log('aiHandler: class initialized');
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
        Summarize the following email exchange concisely. Extract only the most relevant details.

        ### **Summary Structure:**
        1. **Sender's First Name:** The first name of the most recent email sender. The response will be addressed to this person.
        2. **Last Email Purpose:** A short phrase summarizing the primary purpose of the most recent email sent.
        3. **Key Points & Requests:** The most important details, requests, or actions mentioned.
        4. **Relevant Context:** Any prior discussions or background information needed to draft a contextual response.

        **Output format:**
        - Keep it professional and structured.
        - Ensure clarity, avoiding unnecessary details.
        - Use bullet points where appropriate.

        ---

        **Email Context:**
        - **From:** ${from}
        - **To:** ${to}
        - **Subject:** ${subject}
        - **Body:** ${body}

        ---

        This summary will be used to generate a tailored reply. Begin summarizing the email context:
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

        You are generating a **professional email reply** to the last email based on a provided email template and summary of the last email. **Follow these instructions strictly**:

        - Modify the **Email Template** as little as possible while crafting the response.
        - Do **not** introduce any new topics.
        - Replace placeholders in [BRACKETS] with the correct information.
        - Output **only the email text**—no explanations, disclaimers, or extra commentary.
        - **Do not repeat the email summary** in your response.
        - Use <br> for line breaks to ensure proper email formatting.
        - Address the **original sender by their first name** (never "Julian").
        - Ensure the email remains professional and in context.
        - **End with:**  
            best,<br>Julian

        ---

        **Original Email:**  
        ${snippet}

        **Email Summary:**  
        ${emailSummary}

        ---

        Now, craft the email response:
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