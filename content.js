console.log("Content script loaded");

const utils = {
  sendMessage(action, data) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(`Error in ${action}:`, chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
};

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
    // 1. Prioritize the focused element
    if (document.activeElement && document.activeElement.matches('div[aria-label="Message Body"]')) {
      messageBody = document.activeElement;
    } elseif (document.querySelector('div[aria-label="Message Body"]')) {
      // 2. Look for known selectors in the main document
      messageBody = document.querySelector('div[aria-label="Message Body"]');
    } else {
      console.log("contentjs: cannot find Gmail Message");
      return false;
    }

    insertHTMLAtCursor(messageBody, snippet);
    return true;
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
    messageBody = document.querySelector('div[role="textbox"][contenteditable="true"]');
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
      utils.sendMessage('getFromStorage', { key: 'aiEnabled' })
        .then(response => {
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

                utils.sendMessage({
                  action: 'updateStatusBar',
                  status: 'Extracting email context...'
                });

                utils.sendMessage('setInStorage', { key: 'currentEmailContext', value: emailDetails })
                  .then(() => {
                    utils.sendMessage({
                      action: 'processEmailContext',
                      emailContext: emailDetails
                    });
                  })
                  .catch(error => {
                    console.error("Error storing email context:", error);
                  });
              }
            }
          }
        })
        .catch(error => {
          console.error("Error accessing chrome.storage:", error);
        });
    } catch (error) {
      console.error("Error accessing chrome.storage:", error);
    }
  });

  // Comprehensive monitoring configuration - removed 'DOMNodeInserted'
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