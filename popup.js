/*
Function Index
=============

Initialization & Page Rendering
-----------------------------
checkSnippetsAndRender() - Initialize popup and load data
renderMainPage() - Render main interface
renderCategories() - Display category filter buttons

Snippet Management
----------------
addNewSnippet() - Create new snippet
updateSnippet(index) - Update existing snippet
filterSnippetsByCategory() - Filter snippets by selected tags
displaySnippets(snippetsToDisplay) - Render snippet list

Row Creation & Styling
--------------------
createSnippetRow(snippet, index) - Create full snippet row
rowStyle(snippetRow, style) - Apply editable/compact styling
addRowEventListeners(...) - Setup row click handling

Cell Creation
------------
createHotkeyCell(index) - Create hotkey number cell
createSnippetCell(snippet) - Create content cell
createTagsCell(snippet, index) - Create tags cell
createActionCell(...) - Create action buttons cell

UI Components
-----------
createFormattingButton(...) - Create text formatting button
createFormatContainer() - Create formatting toolbar
createInsertButton(snippet) - Create insert button
createDeleteButton(snippet, index) - Create delete button
*/

//==============================================
// IMPORTS AND GLOBAL STATE
//==============================================

import { renderSettingsPage } from './settings.html.js';
import { mainPageHtml } from './main.html.js';
import SnippetManager from './services/snippetObject.js';

let activeRow = null;
const snippetManager = new SnippetManager();

//==============================================
// UTILITY FUNCTIONS
//==============================================
const utils = {
  handleError(error, message) {
    console.error(message, error);
    alert(`${message}. Please try again.`);
  },
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

function createFormattingButton(innerHTML, title, command, promptText = null) {
  const button = document.createElement('button');
  button.innerHTML = innerHTML;
  button.title = title;
  button.onclick = () => {
    if (promptText) {
      const url = prompt(promptText);
      if (url) {
        document.execCommand(command, false, url);
      }
    } else {
      document.execCommand(command);
    }
  };
  return button;
}

//==============================================
// UI COMPONENT CREATION
//==============================================
function createFormatContainer() {
  const formatContainer = document.createElement('div');
  formatContainer.style.display = 'none';
  formatContainer.classList.add('formatting-options', 'toolbar');

  const boldButton = createFormattingButton('<strong>B</strong>', 'Bold', 'bold');
  const italicButton = createFormattingButton('<em>I</em>', 'Italic', 'italic');
  const linkButton = createFormattingButton('&#128279;', 'Link', 'createLink', 'Enter the URL:');

  formatContainer.appendChild(boldButton);
  formatContainer.appendChild(italicButton);
  formatContainer.appendChild(linkButton);

  return formatContainer;
}

function createInsertButton(snippet) {
  const insertButton = document.createElement('button');
  insertButton.className = 'snippet-button';
  insertButton.innerHTML = `
    <svg class="snippet-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4Z"/>
    </svg> Insert
  `;

  insertButton.onclick = () => {
    insertButton.disabled = true;
    setTimeout(() => {
      insertButton.disabled = false;
    }, 1000);
  };

  insertButton.addEventListener('click', async () => {
    const aiEnabled = await chrome.storage.local.get('aiEnabled');
    
    if (aiEnabled?.aiEnabled) {
      try {
        // Send message to background script to extract email context
        const response = await utils.sendMessage('extractEmailContext');

        if (response && response.summary) {
          // Send message to background script to process snippet
          const aiResponse = await utils.sendMessage('processSnippet', { snippet: snippet.content, emailData: response });

          if (aiResponse && aiResponse.modified) {
            if (confirm('AI has modified the snippet based on email context. Use modified version?')) {
              snippet.content = aiResponse.content;
            }
          }
        } else {
          console.warn('No email context available for AI processing');
        }
      } catch (error) {
        console.error('AI processing failed:', error);
        // Continue with original snippet
      }
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'insertSnippet', snippet: snippet.content }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            console.error('Failed to insert snippet:', chrome.runtime.lastError);
          } else {
            console.log('Snippet inserted successfully');
          }
        });
      }
    });
  });

  return insertButton;
}

function createDeleteButton(snippet, index) {
  const deleteButton = document.createElement('button');
  deleteButton.className = 'snippet-button';
  deleteButton.innerHTML = `
    <svg class="snippet-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M9 2h6a1 1 0 0 1 1 1v1h5v2H3V4h5V3a1 1 0 0 1 1-1Zm10 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z"/>
    </svg> Delete
  `;

  deleteButton.addEventListener('click', async () => {
    try {
      await snippetManager.deleteSnippet(index);
      checkSnippetsAndRender();
    } catch (error) {
      utils.handleError(error, 'Failed to delete snippet');
    }
  });

  return deleteButton;
}

//==============================================
// CELL CREATION
//==============================================
function createHotkeyCell(index) {
  const hotkeyCell = document.createElement('td');
  hotkeyCell.textContent = index;
  return hotkeyCell;
}

function createSnippetCell(snippet) {
  const snippetValue = snippet?.content ?? "";

  const snippetCell = document.createElement('td');
  const snippetContent = document.createElement('div');
  snippetContent.innerHTML = snippetValue;
  snippetContent.setAttribute('contenteditable', 'false');
  snippetContent.classList.add('snippet-content');

  const formatContainer = createFormatContainer();
  snippetCell.appendChild(snippetContent);
  snippetCell.appendChild(formatContainer);

  return snippetCell;
}

function createTagsCell(snippet, index) {
  const tagsCell = document.createElement('td');
  const tagContainer = document.createElement('div');
  tagContainer.classList.add('tag-container');

  if (snippet){
    snippet.tags = snippet?.tags ?? [];
    snippet.hotkey = snippet?.hotkey ?? [];
  }

  snippetManager.categories.forEach((category) => {
    const tagDiv = document.createElement('div');
    tagDiv.classList.add('tag');
    tagDiv.textContent = category;
    

    if (snippet && snippet.tags && snippet.tags.includes(category)) {
      tagDiv.classList.add('selected'); // Mark as selected if already tagged
    }

    tagDiv.addEventListener('click', () => {
      if (tagDiv.classList.contains('selected')) {
        tagDiv.classList.remove('selected');
        snippet.tags = snippet.tags.filter(tag => tag !== category);
      } else {
        tagDiv.classList.add('selected');
        snippet.tags = snippet?.tags ?? [];
        snippet.tags.push(category);
      }
      updateSnippet(snippet.hotkey);
    });

    tagContainer.appendChild(tagDiv);
  });

  tagsCell.appendChild(tagContainer);
  return tagsCell;
}

function createActionCell(snippet, index, snippetRow, snippetCell) {
  const actionCell = document.createElement('td');
  actionCell.className = 'action-cell';

  const insertButton = createInsertButton(snippet);
  const deleteButton = createDeleteButton(snippet, index);

  actionCell.appendChild(insertButton);
  actionCell.appendChild(deleteButton);

  return actionCell;
}

//==============================================
// ROW MANAGEMENT
//==============================================
function rowStyle(snippetRow, style) {
  const snippetContent = snippetRow.querySelector('.snippet-content');
  const snippetCell = snippetRow.children[1];
  const actionCell = snippetRow.children[3];
  const tagContainer = snippetRow.querySelector('.tag-container');
  const formatContainer = snippetRow.querySelector('.formatting-options');

  if (style === 'editable') {
    snippetContent.setAttribute('contenteditable', 'true');
    snippetContent.style.border = '2px dashed #007BFF'; // Highlight editable state
    snippetContent.style.height = 'auto';
    snippetCell.style.height = 'auto';
    actionCell.style.flexDirection = 'column';
    tagContainer.style.height = 'auto';
    snippetContent.focus();
    formatContainer.style.display = 'block';  // Show formatting options
  } else if (style === 'compact') {
    snippetContent.setAttribute('contenteditable', 'false');
    snippetContent.style.border = ''; // Remove inline border style to revert to base style
    snippetContent.style.height = '100%';
    snippetCell.style.height = '100%';
    actionCell.style.flexDirection = 'row';
    tagContainer.style.height = '20px';
    tagContainer.style.overflowY = 'hidden'; // Hide tags if they overflow
    formatContainer.style.display = 'none'; // Hide formatting options
  }
}

function createSnippetRow(snippet, index) {
  const snippetRow = document.createElement('tr');

  const hotkeyCell = createHotkeyCell(index);
  const snippetCell = createSnippetCell(snippet);
  const tagsCell = createTagsCell(snippet, index);
  const actionCell = createActionCell(snippet, index, snippetRow, snippetCell);

  snippetRow.appendChild(hotkeyCell);
  snippetRow.appendChild(snippetCell);
  snippetRow.appendChild(tagsCell);
  snippetRow.appendChild(actionCell);

  addRowEventListeners(snippetRow, snippetCell, snippet, actionCell, tagsCell, index);

  return snippetRow;
}

function addRowEventListeners(snippetRow, snippetCell, snippet, actionCell, tagsCell, index) {
  const snippetContent = snippetCell.querySelector('.snippet-content');
  
  const handleRowClick = (event) => {
    event.stopPropagation();
    if (activeRow === snippetRow) return;
    
    if (activeRow) {
      saveActiveRowContent();
      rowStyle(activeRow, 'compact');
    }
    
    rowStyle(snippetRow, 'editable');
    activeRow = snippetRow;
  };

  const saveActiveRowContent = () => {
    if (!activeRow) return;
    const content = activeRow.querySelector('.snippet-content').innerHTML;
    const index = parseInt(activeRow.querySelector('td').innerHTML, 10);
    if (snippetManager.snippets[index]) {
      snippetManager.snippets[index].content = content;
      updateSnippet(index);
    }
  };

  snippetRow.addEventListener('click', handleRowClick);
  
  // Store cleanup function for potential future use
  snippetRow._cleanup = () => {
    snippetRow.removeEventListener('click', handleRowClick);
  };
}

//==============================================
// SNIPPET CRUD OPERATIONS
//==============================================
async function updateSnippet(index) {
  try {
    await snippetManager.updateSnippet(index, snippetManager.snippets[index]);
  } catch (error) {
    utils.handleError(error, 'Failed to update snippet');
  }
}

function addNewSnippet() {
  const snippetsContainer = document.getElementById('snippets');
  const newSnippet = {
    hotkey: snippetManager.snippets.length,
    content: 'Enter snippet content',
    tags: []
  };

  // Should use snippetManager instead of direct message
  snippetManager.addSnippet(newSnippet).then(response => {
    if (response.success) {
      const newSnippetRow = createSnippetRow(newSnippet, newSnippet.hotkey);
      snippetManager.snippets.push(newSnippet);
      
      if (newSnippetRow) {
        snippetsContainer.appendChild(newSnippetRow);
        rowStyle(newSnippetRow, 'editable');
        activeRow = newSnippetRow;
      }
    } else {
      utils.handleError(new Error('Failed to add snippet'));
    }
  });
}

function filterSnippetsByCategory() {
  const selectedCategories = new Set(
    Array.from(document.querySelectorAll('.category.selected')).map(categoryDiv => categoryDiv.textContent)
  );
  const filteredSnippets = snippetManager.snippets.filter(snippet => {
    return Array.from(selectedCategories).every(category => snippet.tags.includes(category));
  });
  displaySnippets(filteredSnippets);
}

function displaySnippets(snippetsToDisplay) {
  const snippetsContainer = document.getElementById('snippets');
  snippetsContainer.innerHTML = ''; // Clear any existing snippets

  snippetsToDisplay.forEach((snippet, index) => {
    const snippetRow = createSnippetRow(snippet, snippet.hotkey);
    rowStyle (snippetRow, 'compact');
    snippetsContainer.appendChild(snippetRow);
  });
}

//==============================================
// INITIALIZATION AND PAGE RENDERING
//==============================================
function renderCategories() {
  const categoryContainer = document.querySelector('.category-container');
  const selectedCategories = new Set();

  snippetManager.categories.forEach((category) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.classList.add('category');
    categoryDiv.textContent = category;

    categoryDiv.addEventListener('click', () => {
      if (categoryDiv.classList.contains('selected')) {
        categoryDiv.classList.remove('selected');
        selectedCategories.delete(category);
      } else {
        categoryDiv.classList.add('selected');
        selectedCategories.add(category);
      }
      filterSnippetsByCategory();
    });

    categoryContainer.appendChild(categoryDiv);
  });
}

function renderMainPage() {
  const mainContainer = document.body; // Main container for the popup
  mainContainer.innerHTML = mainPageHtml;
  
  setTimeout(() => {
    displaySnippets(snippetManager.snippets);
  }, 500);

  document.getElementById('openSettings').addEventListener('click', () => {
    renderSettingsPage(snippetManager, renderMainPage);
  });

  document.getElementById('fetchSnippets').addEventListener('click', () => {
    checkSnippetsAndRender();
  });

  document.getElementById('newSnippet').addEventListener('click', () => {
    addNewSnippet();
  });

  renderCategories();
}

async function checkSnippetsAndRender() {
  try {
    await snippetManager.initialize();
    renderMainPage();
  } catch (error) {
    utils.handleError(error, 'Failed to load snippets');
  }
}

//==============================================
// GLOBAL EVENT LISTENERS
//==============================================
document.addEventListener('DOMContentLoaded', () => {
  // Initially check snippets when the popup loads
  checkSnippetsAndRender();
});

document.addEventListener('click', () => {
  if (activeRow) {
    rowStyle(activeRow, 'compact');
    const activeSnippetContent = activeRow.querySelector('.snippet-content').innerHTML;
    const activeIndex = parseInt(activeRow.querySelector('td').innerHTML, 10);
      if (snippetManager.snippets[activeIndex]){
        snippetManager.snippets[activeIndex].content = snippetManager.snippets[activeIndex].content ?? "";
        snippetManager.snippets[activeIndex].content = activeSnippetContent;
        updateSnippet(activeIndex);
      }
    activeRow = null;
  }
});

window.addEventListener('blur', () => {
  if (activeRow) {
    rowStyle(activeRow, 'compact');
    const activeSnippetContent = activeRow.querySelector('.snippet-content').innerHTML;
    const activeIndex = parseInt(activeRow.querySelector('td').innerHTML, 10);
      if (snippetManager.snippets[activeIndex]){
        snippetManager.snippets[activeIndex].content = snippetManager.snippets[activeIndex].content ?? "";
        snippetManager.snippets[activeIndex].content = activeSnippetContent;
        updateSnippet(activeIndex);
      }
    activeRow = null;
  }
});

function updateStatusBar(status) {
  const statusBar = document.getElementById('statusBar');
  if (statusBar) {
    statusBar.textContent = status;
    statusBar.style.display = status ? 'block' : 'none';
  }
}

// Add to the existing message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStatusBar') {
    updateStatusBar(request.status);
  } else if (request.action === 'processEmailContext') {
    aiHandler.processEmailContext(request.emailContext);
  }
});
