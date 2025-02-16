console.log("contentjs: content script loaded");
let aiEnabled = false;
let currentEmail = null;

function insertHTMLAtCursor(html) {
  console.log('content.js function insertHTMLAtCursor');

  const selection = window.getSelection();
  const range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();
  let element = document.activeElement;

  if (element && (element.matches('div[contenteditable="true"]') || element.matches('textarea') || element.matches('input[type="text"]'))) {
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
  } else {
    console.log('No active editable element found');
  }
}

/* ===== Extract Email Details ===== */
function extractEmailDetails() {
  let messageEl = null;
  // Try several selectors in order.
  const contentSelectors = [
    'div.a3s', // Standard view container
    'div[role="dialog"] [contenteditable="true"]', // Dialog view (pop-out, reply)
    'div[role="textbox"][contenteditable="true"]' // Fallback: any editable textbox
  ];

  for (const sel of contentSelectors) {
    const candidate = document.querySelector(sel);
    // Check if the candidate exists and appears visible (non-zero width or height)
    if (candidate && (candidate.offsetWidth > 0 || candidate.offsetHeight > 0)) {
      messageEl = candidate;
      break;
    }
  }

  // Extract subject.
  // First try h2.hP (read view) then fall back to the compose-dialog format.
  let subjectElement = document.querySelector('h2.hP') ||
                       document.querySelector('h2.a3E div.aYF span');

  // Extract the sender.
  // Try a span with class "gD" (read view) or "aDr" (compose view), then any span with an email attribute.
  let fromElement = document.querySelector('span.gD[email]') ||
                    document.querySelector('span.aDr[email]') ||
                    document.querySelector('span[email]');

  // Extract the recipient ("to").
  // For a compose window, check for an input with aria-label "To recipients".
  let toValue = '';
  const toInput = document.querySelector('input[aria-label="To recipients"]');
  if (toInput && toInput.value) {
    toValue = toInput.value.trim();
  } else {
    // Fallback: try a container method (often used in read views).
    const toContainer = document.querySelector('div.iw.ajw span.hb');
    if (toContainer) {
      const toSpans = Array.from(toContainer.querySelectorAll('span[email]'));
      toValue = toSpans.map(el => el.getAttribute('email') || el.textContent.trim()).join(', ');
    }
  }

  return {
    body: messageEl ? messageEl.innerText : '',
    html: messageEl ? messageEl.innerHTML : '',
    from: fromElement ? (fromElement.getAttribute('email') || fromElement.textContent.trim()) : '',
    to: toValue,
    subject: subjectElement ? subjectElement.innerText.trim() : '',
    timestamp: new Date().toISOString()
  };
}

/* ===== Existing Monitor Email Activity ===== */
function monitorEmailActivity() {
  console.log("content.js: setting up MutationObserver for email activity");

  chrome.runtime.sendMessage({action: 'getFromStorage', key: 'aiEnabled'}, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError.message);
      return; // Stop further processing if there's an error
    }

    if (response && typeof response.value !== 'undefined') {
      aiEnabled = response.value;
      console.log("content.js: received aiEnabled =", aiEnabled);
    } else {
      aiEnabled = false;
      console.log("content.js: no valid response for aiEnabled, defaulting to false");
    }

    if (aiEnabled) {
      const emailDetails = extractEmailDetails();

      let flag = false;

      if(currentEmail === null){
        flag = true;
      } else if (JSON.stringify(emailDetails.body) !== JSON.stringify(currentEmail.body)){
        flag = true;
      }

      if (flag) {
        currentEmail = emailDetails;
        console.log("content.js: current email updated");
        chrome.runtime.sendMessage({ action: 'setInStorage', key: 'currentRawEmail', value: emailDetails }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError.message);
            return; // Stop further processing if there's an error
          }
          chrome.runtime.sendMessage({ action: 'processEmailContext', rawEmail: emailDetails });
        });
      } else {
        console.log("content.js: email details unchanged - no need to process");
      }
  }});
}

/* ===== Existing Subtle Notification ===== */
function showSubtleNotification(message) {
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

/* ===== Auto-Expand Trimmed Content ===== */
function autoExpandTrimmedContent() {
  // Look for an element with aria-label or data-tooltip of "Show trimmed content"
  const expandSelector = 'div[aria-label="Show trimmed content"], div[data-tooltip="Show trimmed content"]';
  const button = document.querySelector(expandSelector);
  if (button && typeof button.click === 'function') {
    console.log("Auto-expanding trimmed content");
    button.click();
  }
}

/* ===== Setup Auto-Expand Observer ===== */
function setupAutoExpandObserver() {
  autoExpandTrimmedContent();
}

/* ===== Initialize Monitoring and Auto-Expansion ===== */
function init() {
    // Monitor focus changes as well
    document.addEventListener('focus', () => {
      monitorEmailActivity();
      setupAutoExpandObserver();
    }, true);

    document.addEventListener('blur', () => {
      monitorEmailActivity();
      setupAutoExpandObserver();
    }, true);

  try {
    monitorEmailActivity();
    setupAutoExpandObserver();
  } catch (error) {
    console.log('content.js: error in observer setup: ' + error);
  }
}

// If the DOM is already ready, run init immediately; otherwise wait for DOMContentLoaded.
if (document.readyState === "loading") {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'insertSnippet') {
    console.log('Message received in content.js: insertSnippet');
    const snippet = request.snippet;
    const success = insertHTMLAtCursor(snippet);
    sendResponse({ success });

  } else if (request.action === 'showSubtleNotification') {
    console.log('Message received in content.js: subtleNotification');
    showSubtleNotification(request.message);
  }

  return true; // Required to indicate asynchronous response
});
