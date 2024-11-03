console.log("Content script loaded");

// Store snippets globally
let snippets = [];

// Listen for messages from the background script to update snippets or handle snippet insertion
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSnippets') {
    console.log('Message received in content.js: updateSnippets');
    // Update the snippets from the background script
    snippets = request.snippets || [];
    sendResponse({ success: true });
  } else if (request.action === 'insertSnippet') {
    console.log('Message received in content.js: insertSnippet');
    const snippet = request.snippet;
    const success = insertSnippet(snippet);
    sendResponse({ success });
  } else if (request.action === 'checkGmailTab') {
    console.log('Message received in content.js: checkGmailTab');
    monitorGmail(); // Start monitoring Gmail if it's a Gmail tab
  }
  return true; // Required to indicate asynchronous response
});

// Function to monitor Gmail for new message divs
function monitorGmail() {
  const observer = new MutationObserver(() => {
    checkActiveElement();
  });

  // Observe changes in the document body
  observer.observe(document.body, { childList: true, subtree: true });

  // Function to check if the active element is the target div
  function checkActiveElement() {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.matches('div[aria-label="Message Body"]')) {
      console.log('monitorGmail function: active element is the new message div');
    }
  }

  // Add event listeners for focus and blur events to monitor active element changes
  document.addEventListener('focus', checkActiveElement, true);
  document.addEventListener('blur', checkActiveElement, true);
}

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