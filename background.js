import NotificationService from './services/notificationService.js';
import AIHandler from './ai/aiHandler.js';

console.log("Background script loaded");
let snippets = [];
let aiEnabled = false;
let aiHandler;
const notificationService = new NotificationService();


async function initializeAIHandler() {
  try {
    aiHandler = new AIHandler();
    await aiHandler.initializeSession();
    console.log('background.js: AI initialized');
    notificationService.showNotification({ message: 'AI Initialized' });
  } catch (error) {
    console.error('Error instantiating AIHandler', error);
  }
}

initializeAIHandler();

//***************************************** */
//*******GENERAL CRUD LOCAL STORAGE ACTIONS ******** */
//***************************************** */

// Get a value from Chrome storage
function getFromStorage(key, callback) {
  chrome.storage.local.get(key, (result) => {
    callback(result[key]);
  });
}

// Set a value in Chrome storage
function setInStorage(key, value, callback) {
  chrome.storage.local.set({ [key]: value }, () => {
    callback(true);
  });
}

// Update a value in Chrome storage
function updateStorage(key, updateFunction, callback) {
  chrome.storage.local.get(key, (result) => {
    const oldValue = result[key];
    const newValue = updateFunction(oldValue);
    chrome.storage.local.set({ [key]: newValue }, () => {
      callback(true);
    });
  });
}

// Delete a value from Chrome storage
function deleteFromStorage(key, callback) {
  chrome.storage.local.remove(key, () => {
    callback(true);
  });
}

//***************************************** */
//*******SNIIPPETS ACTIONS******** */
//***************************************** */

function checkSnippetsArray(snippets) {
  // Ensure snippets is an array before attempting to filter
  if (!Array.isArray(snippets)) {
    console.warn('Snippets data is not an array. Initializing as an empty array.');
    snippets = []; // Initialize as an empty array
  }

  // Ensure each snippet has content and tags initialized
  if (snippets) {
    snippets.forEach((snippet) => {
      snippet.content = snippet.content ?? "";
      snippet.tags = snippet.tags ?? [];
    });
  }

  return snippets;
}

// get snippets from Chrome storage
function getSnippets(callback) {
  chrome.storage.local.get('snippets', (result) => {
    snippets = checkSnippetsArray(result.snippets);
    logSnippetStorage(snippets, "getSnippets");
    callback(snippets);
  });
}

// set snippets from Chrome storage
function setSnippets(snippets, callback) {
  snippets = checkSnippetsArray(snippets);
  if (snippets) {
    chrome.storage.local.set({ snippets }, () => {
      logSnippetStorage(snippets, "setSnippets");
      notificationService.showNotification({ message: 'Snippets updated successfully!' });
      callback(true);
    });
  }
}

// delete snippet from Chrome storage
function deleteSnippet(index, callback) {
  // Check if the index is within bounds
  if (index >= 0 && index < snippets.length) {
    snippets.splice(index, 1); // Remove the specific item at the index
    setSnippets(snippets, (response) => {
      notificationService.showNotification({ message: 'Snippet deleted successfully!' });
      callback(response);
    });
  } else {
    console.error("Invalid index: ", index);
    callback(false);
  }
}

function logSnippetStorage(snippets, caller) {
  console.log(caller + " start data action");
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
  console.log(caller + " end data action");
  console.log("******************************************");
}

// This is called only by popup.js to fetch snippets
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSnippets') {
    getSnippets((snippets) => {
      sendResponse({ success: true, snippets });
    });
    return true;
  }

  if (request.action === 'updateSnippet') {
    const { index, snippet } = request;
    snippets[index] = snippet;

    setSnippets(snippets, (response) => {
      sendResponse({ success: response });
    });
    return true;
  }

  if (request.action === 'addSnippet') {
    const { snippet } = request;
    if (snippet) {
      snippets.push(snippet);
    }
    setSnippets(snippets, (response) => {
      notificationService.showNotification({ message: 'Snippet added successfully!' });
      sendResponse({ success: response });
    });
    return true;
  }

  if (request.action === 'deleteSnippet') {
    const { index } = request;

    deleteSnippet(index, (response) => {
      sendResponse({ success: response });
    });
    return true;
  }

  // Generic get from storage
  if (request.action === 'getFromStorage') {
    getFromStorage(request.key, (value) => {
      sendResponse({ success: true, value: value });
    });
    return true; // Required for asynchronous response
  }

  // Generic set in storage
  if (request.action === 'setInStorage') {
    setInStorage(request.key, request.value, (success) => {
      sendResponse({ success: success });
    });
    return true; // Required for asynchronous response
  }

  // Generic update in storage
  if (request.action === 'updateStorage') {
    updateStorage(request.key, request.updateFunction, (success) => {
      sendResponse({ success: success });
    });
    return true; // Required for asynchronous response
  }

  // Generic delete from storage
  if (request.action === 'deleteFromStorage') {
    deleteFromStorage(request.key, (success) => {
      sendResponse({ success: success });
    });
    return true; // Required for asynchronous response
  }

  // Handle AI processing requests
  if (request.action === 'processEmailContext') {
    if (aiHandler){
      aiHandler.processEmailContext(request.rawEmail);
      notificationService.showNotification({ message: 'Email Summary Initiated' });
      sendResponse({ success: true });
      return true;
    } else {
      sendResponse({ success: false });
      return false;
    }
  }

  if (request.action === 'extractEmailContext') {
    chrome.storage.local.get(['currentEmailSummary', 'currentRawEmail'], (result) => {
      let currentEmailSummary = result.currentEmailSummary || '';
      let currentRawEmail = result.currentRawEmail || '';
      sendResponse({ summary: currentEmailSummary, rawEmail: currentRawEmail });
    });
    return true; // Required for asynchronous response
  }

  // Handle AI process snippet requests
  if (request.action === 'AIprocessSnippet') {
    if (aiHandler) {
      notificationService.showNotification({ message: 'Snippet AI-Update Initiated' });
      aiHandler.processSnippet(request.snippet, request.emailSummary, (response) => {
        notificationService.showNotification({ message: 'Snippet AI-Update Complete' });
        sendResponse(response);
      });
      return true; // Required for asynchronous response
    } else {
      sendResponse({ modified: false, content: request.snippet });
      return false;
    }
  }

  // Handle AI process snippet requests
  if (request.action === 'notification') {
    notificationService.showNotification({message: request});
    return true;
  }

});

function onBackgroundLoad() {
  console.log("Background script initialized/reloaded.");
  if (!snippets) {
    getSnippets((snippets) => {
      console.log('Snippets loaded on background load');
    });
  }
}

onBackgroundLoad();

