console.log("Background script loaded");
let snippets = [];

// get snippets from Chrome storage
function getSnippets(callback) {
  chrome.storage.local.get('snippets', (result) => {
    snippets = Array.isArray(result.snippets) ? result.snippets : [];
    logSnippetStorage(snippets,"getSnippets");
    callback(snippets);
  });
}

function checkSnippetsArray (snippets) {
  // filter out null snippets
  snippets = snippets.filter(snippet => snippet !== null);
  // update remaining snippets
  snippets.forEach((snippet, index) => {
    snippet.hotkey = index;
    snippet.content = snippet?.content ?? "";
    snippet.tags = snippet?.tags ?? [];
  });
  return snippets;
}

// set snippets from Chrome storage
function setSnippets(snippets, callback) {
  snippets = checkSnippetsArray(snippets);
  chrome.storage.local.set({snippets}, () => {
    logSnippetStorage(snippets,"setSnippets");
    callback(true);
  });
}

// set snippets from Chrome storage
function addSnippet(snippet, callback) {
  snippets = checkSnippetsArray(snippets);
  snippets.push(snippet);
  chrome.storage.local.set({snippets}, () => {
    logSnippetStorage(snippets,"addSnippets");
    callback(true);
  });
}

// delete snippet from Chrome storage
function deleteSnippet(index, callback) {
  // Check if the index is within bounds
  if (index >= 0 && index < snippets.length) {
    snippets.splice(index, 1); // Remove the specific item at the index
    snippets = checkSnippetsArray(snippets);
    chrome.storage.local.set({snippets}, () => {
      logSnippetStorage(snippets,"deleteSnippets");
      callback(true);
    });
  } else {
    console.error("Invalid index: ", index);
    callback(false);
  }
}

function logSnippetStorage(snippets,caller) {
  console.log(caller + " storage action");
  console.log("******************************************");
  if (snippets) {
    snippets.forEach((snippet, index) => {
      if (snippet) {
        snippet.content = snippet.content ?? "";
        snippet.tags = snippet.tags ?? [];
        console.log("snippet ID: " + snippet.hotkey + " -- snippet content: " + snippet.content + " -- snippet tags: " + JSON.stringify(snippet.tags));
      }
    });
  }
}

// function will fetch snippets, update 
function reloadSnippets() {
  // Notify all tabs about the updated snippets
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && tab.url.includes('mail.google.com')) {
        console.log('Reloading snippets for Gmail tab:', tab.id);
        chrome.tabs.sendMessage(tab.id, { action: 'updateSnippets', snippets }, (response) => {
          if (response && response.success) {
            console.log('tabs notified successfully!');
          } else {
            console.error('Failed to notify tabs.', 'error');
          }
        });
      }
    }
  });
  return true;
}

// This is called only by popup.js to fetch snippets
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSnippets') {
    getSnippets((snippets) => {
      //reloadSnippets();
      sendResponse({ success: true, snippets });
    });
    return true;
  }

  if (request.action === 'updateSnippet') {
    const {index, snippet } = request;
    snippets[index] = snippet;

    setSnippets(snippets, (response) => {
      //reloadSnippets();
      sendResponse({ success: response });
    });
    return true;
  }

  if (request.action === 'addSnippet') {
    const {snippet} = request;

    addSnippet(snippet, (response) => {
      //reloadSnippets();
      sendResponse({ success: response });
    });
    return true;
  }

  if (request.action === 'deleteSnippet') {
    const { index } = request;

    deleteSnippet(index, (response) => {
      //reloadSnippets();
      sendResponse({ success: response });
    });
    return true;
  }

  return false;
});

// On installation of extension, fetch the snippets once
// chrome.runtime.onInstalled.addListener(reloadSnippets);