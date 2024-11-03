console.log("Background script loaded");

// Store snippets globally
let snippets = [];

// Fetch snippets from Chrome storage
function fetchSnippets(callback) {
  chrome.storage.local.get('snippets', (result) => {
    snippets = result.snippets || [];
    callback(snippets);
  });
}

// Reload snippets from Chrome storage
const reloadSnippets = () => {
  console.log('Inside reload snippets');
  fetchSnippets((snippets) => {
    chrome.storage.local.set({ snippets }, () => {
      console.log('Snippets stored:', snippets);
      // Notify all tabs about the updated snippets
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.url && tab.url.includes('mail.google.com')) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateSnippets', snippets });
          }
        }
      });
    });
  });
};

// This is called only by popup.js to fetch snippets
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchSnippets') {
    fetchSnippets((snippets) => {
      sendResponse({ success: true, snippets });
    });
    return true; // Required to indicate that sendResponse will be called asynchronously
  }

  if (request.action === 'saveSnippet') {
    const { index, snippet } = request;
    snippets[index] = snippet;

    chrome.storage.local.set({ snippets }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });

    return true; // Indicate that the response will be sent asynchronously
  }

  if (request.action === 'deleteSnippet') {
    const { index, snippet } = request;
    console.log("background.js deleting " + index + " and snippet " + snippet.content);
  
    // Fetch the latest snippets from chrome.storage.local before modifying
    chrome.storage.local.get('snippets', (result) => {
      let snippets = result.snippets || [];
  
      // Check if the index is within bounds
      if (index >= 0 && index < snippets.length) {
        snippets.splice(index, 1); // Remove the specific item at the index
      } else {
        console.error("Invalid index: ", index);
        sendResponse({ success: false, error: "Invalid index" });
        return;
      }
  
      // Log each snippet after deletion for debugging
      snippets.forEach((snippetX, x) => {
        console.log("background.js :: snippet " + x + " is " + snippetX.content);
      });
  
      // Save the updated snippets array back to chrome.storage.local
      chrome.storage.local.set({ snippets }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
    });

    return true; // Indicate that the response will be sent asynchronously
  }
});

// On installation of extension, fetch the snippets once
chrome.runtime.onInstalled.addListener(reloadSnippets);