import NotificationService from './services/notificationService.js';
const notificationService = new NotificationService();

console.log("Content script loaded");

// Listen for messages from the background script to update snippets or handle snippet insertion
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertSnippet') {
    console.log('Message received in content.js: insertSnippet');
    const snippet = request.snippet;
    const success = insertSnippet(snippet);
    sendResponse({ success });
  } else if (request.action === 'checkGmailTab') {
    console.log('Message received in content.js: checkGmailTab');
    monitorEmailActivity(); // Initialize unified monitoring
  }
  return true; // Required to indicate asynchronous response
});

// Function to insert a snippet into the message body
function insertSnippet(snippet) {
  try {
    const messageBody = document.activeElement;
    if (messageBody && messageBody.matches('div[aria-label="Message Body"]')) {
      insertHTMLAtCursor(messageBody, snippet);
      return true;
    } else {
      console.log("Active Element is not a Gmail Message");
      return false;
    }
  } catch (error) {
    console.error('Error inserting snippet:', error);
  }
  return false;
}

function insertHTMLAtCursor(element, html) {
  console.log('content.js function insertHTMLAtCursor');

  const selection = window.getSelection();
  const range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();

  if (element.contains(range.commonAncestorContainer) || element === range.commonAncestorContainer) {
    range.deleteContents();
  } else {
    range.selectNodeContents(element);
    range.collapse(false);
  }

  const fragment = document.createRange().createContextualFragment(html);
  range.insertNode(fragment);

  // Move the cursor after the inserted fragment
  const firstNode = fragment.firstChild;

  if (firstNode) {
    range.setStartAfter(firstNode);
    range.setEndAfter(firstNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function extractEmailDetails() {
  let messageBody, fromElement, toElement, subjectElement;

  // 1. Prioritize the focused element
  if (document.activeElement && document.activeElement.matches('div[aria-label="Message Body"]')) {
    messageBody = document.activeElement;
  } else {
    // 2. Look for known selectors in the main document
    messageBody = document.querySelector('div[aria-label="Message Body"]');
  }

  fromElement = document.querySelector('[email][name="from"]');
  toElement = document.querySelector('[email][name="to"]');
  subjectElement = document.querySelector('[name="subjectbox"]');

  // 3. Handle popup windows (if elements not found)
  if (!messageBody || !fromElement || !toElement || !subjectElement) {
    // Adjust selectors for popup windows
    messageBody = messageBody || document.querySelector('div[aria-label="Message Body"][contenteditable="true"]');
    fromElement = fromElement || document.querySelector('span[email]'); //span[email]
    toElement = toElement || document.querySelector('div[aria-label="To"]');
    subjectElement = subjectElement || document.querySelector('input[name="subject"]');
  }

  return {
    body: messageBody?.textContent || '',
    from: fromElement?.getAttribute('email') || fromElement?.textContent || '',
    to: toElement?.getAttribute('email') || toElement?.textContent || '',
    subject: subjectElement?.value || '',
    timestamp: new Date().toISOString()
  };
}

// Remove the original monitorGmail function and replace with unified monitoring:
function monitorEmailActivity() {
  let currentEmail = null;

  const observer = new MutationObserver(() => {
    try {
      chrome.runtime.sendMessage({ action: 'getFromStorage', key: 'aiEnabled' }, (response) => {
        if (chrome.runtime.lastError) {
          notificationService.showNotification({ message: `Error getting AI settings: ${chrome.runtime.lastError.message}` });
          console.error("Error getting AI settings:", chrome.runtime.lastError);
          return;
        }

        const aiEnabled = response?.value;
        const messageBody = document.querySelector('div[aria-label="Message Body"]');

        // Check if message body is focused
        if (document.activeElement === messageBody) {
          console.log('Email compose area is active');

          // Only process if AI is enabled
          if (aiEnabled) {
            const emailDetails = extractEmailDetails();

            // Only process if email context has changed
            if (JSON.stringify(emailDetails) !== JSON.stringify(currentEmail)) {
              currentEmail = emailDetails;

              chrome.runtime.sendMessage({
                action: 'updateStatusBar',
                status: 'Extracting email context...'
              });
              notificationService.showNotification({ message: 'Extracting email context...' });

              chrome.runtime.sendMessage({ action: 'setInStorage', key: 'currentEmailContext', value: emailDetails }, (response) => {
                if (chrome.runtime.lastError) {
                  notificationService.showNotification({ message: `Error storing email context: ${chrome.runtime.lastError.message}` });
                  console.error("Error storing email context:", chrome.runtime.lastError);
                } else {
                  chrome.runtime.sendMessage({
                    action: 'processEmailContext',
                    emailContext: emailDetails
                  });
                }
              });
            }
          }
        }
      });
    } catch (error) {
      notificationService.showNotification({ message: error.message });
      console.error("Error accessing chrome.storage:", error);
    }
  });

  // Comprehensive monitoring configuration
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });

  // Monitor focus changes
  document.addEventListener('focus', () => observer.takeRecords(), true);
  document.addEventListener('blur', () => observer.takeRecords(), true);
}

// Initialize monitoring
monitorEmailActivity();