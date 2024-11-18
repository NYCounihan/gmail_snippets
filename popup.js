let snippets = [];
let categories = [];
let activeRow = null;

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

function checkSnippetsAndRender() {

  chrome.runtime.sendMessage({ action: 'getSnippets', }, (response) => {
    if (response.success) {
      console.log('Retrieved Snippets');
      snippets = response.snippets;
      renderMainPage();
    } else {
      console.error('Failed to retrieve snippets', 'error');
    }
  });

  // Load available categories from storage
  chrome.storage.local.get('categories', (result) => {
    categories = Array.isArray(result.categories) ? result.categories : [];
    categories.forEach((category, index) => {
      if (!category || typeof category === 'undefined') {
        categories.splice(index, 1);
      }
    });
  });            
};

// Create a div for each category inside the div with class "category-container"
function renderCategories() {
  const categoryContainer = document.querySelector('.category-container');
  const selectedCategories = new Set();

  categories.forEach((category) => {
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

function filterSnippetsByCategory() {
  const selectedCategories = new Set(
    Array.from(document.querySelectorAll('.category.selected')).map(categoryDiv => categoryDiv.textContent)
  );
  const filteredSnippets = snippets.filter(snippet => {
    return Array.from(selectedCategories).every(category => snippet.tags.includes(category));
  });
  displaySnippets(filteredSnippets);
}

function renderSettingsPage() {
  const mainContainer = document.body; // Main container for the popup
  mainContainer.innerHTML = settingsPageHtml; // Load settings HTML

  // Load categories (tags) from storage and display them
  chrome.storage.local.get('categories', (result) => {
      const categories = result.categories || [];
      const categoryList = document.getElementById('categoryList');

      // Render existing categories
      categories.forEach((category) => {
          const listItem = document.createElement('li');
          listItem.textContent = category;

          // Delete button for each category
          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Delete';
          deleteButton.addEventListener('click', () => {
              deleteCategory(category);
          });
          listItem.appendChild(deleteButton);
          categoryList.appendChild(listItem);
      });
  });

  // Add new category
  document.getElementById('addCategoryForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const newCategory = document.getElementById('newCategory').value.trim();

      if (newCategory) {
          chrome.storage.local.get('categories', (result) => {
              const categories = result.categories || [];
              if (!categories.includes(newCategory)) {
                  categories.push(newCategory);
                  chrome.storage.local.set({ categories }, () => {
                      alert('Category added!');
                      renderSettingsPage(); // Re-render to show the updated list
                  });
              } else {
                  alert('Category already exists.');
              }
          });
      }
  });

  // Function to delete a category
function deleteCategory(category) {
  chrome.storage.local.get('categories', (result) => {
      const categories = result.categories || [];
      const index = categories.indexOf(category);

      if (index > -1) {
          categories.splice(index, 1);
          chrome.storage.local.set({ categories }, () => {
              alert('Category deleted!');
              renderSettingsPage(); // Re-render to show the updated list
          });
      }
  });}

  document.getElementById('exampleId').value = exampleId;

  // Add event listener to the form submission for saving settings
  document.getElementById('settingsForm').addEventListener('submit', (event) => {
    event.preventDefault();
    spreadsheetId = document.getElementById('exampleID').value;

    if (!exampletId) {
      alert('All fields are required.');
      return;
    }

    chrome.storage.local.set({exampletId}, () => {
      alert('Settings saved!');
      renderMainPage(); // After saving, go back to the main page
    });
  });

// Add event listener to return to main
document.getElementById('backToMain').addEventListener('click', (event) => {
  renderMainPage();
});
 
  
}

function addNewSnippet() {
  const snippetsContainer = document.getElementById('snippets');
  const newSnippet = {
    hotkey: snippets.length,
    content: 'Enter snippet content',
    tags: []
  };

  chrome.runtime.sendMessage({ action: 'addSnippet', snippet: newSnippet}, (response) => {
    if (response.success) {
      console.log('Snippet saved successfully!');
    } else {
      console.error('Failed to save snippet. Please try again.', 'error');
    }
  });

  const newSnippetRow = createSnippetRow(newSnippet, newSnippet.hotkey);
  snippets.push(newSnippet);

  if (newSnippetRow) {
    snippetsContainer.appendChild(newSnippetRow);
    rowStyle(newSnippetRow, 'editable');
    activeRow = newSnippetRow;
  }
}

function updateSnippet(index){
  // Save the updated snippet to chrome.storage
  chrome.runtime.sendMessage({ action: 'updateSnippet', index, snippet: snippets[index] }, (response) => {
    if (response.success) {
      console.log('Snippet saved successfully!');
    } else {
      console.error('Failed to save snippet. Please try again.', 'error');
    }
  });
}

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

function displaySnippets(snippets) {
  const snippetsContainer = document.getElementById('snippets');
  snippetsContainer.innerHTML = ''; // Clear any existing snippets

  snippets.forEach((snippet, index) => {
    const snippetRow = createSnippetRow(snippet, snippet.hotkey);
    rowStyle (snippetRow, 'compact');
    snippetsContainer.appendChild(snippetRow);
  });
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

function createTagsCell(snippet, index) {
  const tagsCell = document.createElement('td');
  const tagContainer = document.createElement('div');
  tagContainer.classList.add('tag-container');

  if (snippet){
    snippet.tags = snippet?.tags ?? [];
    snippet.hotkey = snippet?.hotkey ?? [];
  }

  categories.forEach((category) => {
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

  insertButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'insertSnippet', snippet: snippet.content }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            console.error('Failed to insert snippet:', chrome.runtime.lastError);
            alert('Failed to insert snippet. Please ensure you have an open Gmail draft.');
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

  deleteButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'deleteSnippet', index, snippet: snippets[index] }, (response) => {
      if (response.success) {
        console.log('Snippet deleted successfully!');
        checkSnippetsAndRender();
      } else {
        console.error('Failed to delete snippet. Please try again.', 'error');
      }
    });
  });

  return deleteButton;
}

function addRowEventListeners(snippetRow, snippetCell, snippet, actionCell, tagsCell, index) {
  const snippetContent = snippetCell.querySelector('.snippet-content');
  
  snippetRow.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent the event from bubbling up to the document
      if (activeRow != snippetRow){
      rowStyle(snippetRow, 'editable');
      if (activeRow){
        rowStyle(activeRow, 'compact');
          const activeSnippetContent = activeRow.querySelector('.snippet-content').innerHTML;
          const activeIndex = parseInt(activeRow.querySelector('td').innerHTML, 10);
          if (snippets[activeIndex]){
            snippets[activeIndex].content = snippets[activeIndex].content ?? "";
            snippets[activeIndex].content = activeSnippetContent;
            updateSnippet(snippets[activeIndex].hotkey);
          }
        }
      }
      activeRow = snippetRow;
  });

}

// Event listener for clicks on the document
document.addEventListener('click', () => {
  if (activeRow) {
    rowStyle(activeRow, 'compact');
    const activeSnippetContent = activeRow.querySelector('.snippet-content').innerHTML;
    const activeIndex = parseInt(activeRow.querySelector('td').innerHTML, 10);
      if (snippets[activeIndex]){
        snippets[activeIndex].content = snippets[activeIndex].content ?? "";
        snippets[activeIndex].content = activeSnippetContent;
        updateSnippet(activeIndex);
      }
    activeRow = null;
  }
});

// Event listener for when the document loses focus
window.addEventListener('blur', () => {
  if (activeRow) {
    rowStyle(activeRow, 'compact');
    const activeSnippetContent = activeRow.querySelector('.snippet-content').innerHTML;
    const activeIndex = parseInt(activeRow.querySelector('td').innerHTML, 10);
      if (snippets[activeIndex]){
        snippets[activeIndex].content = snippets[activeIndex].content ?? "";
        snippets[activeIndex].content = activeSnippetContent;
        updateSnippet(activeIndex);
      }
    activeRow = null;
  }
});

// Function to render the main popup page
function renderMainPage() {
  const mainContainer = document.body; // Main container for the popup
  mainContainer.innerHTML = mainPageHtml;
  
  setTimeout(() => {
    displaySnippets(snippets);
  }, 500);

  document.getElementById('openSettings').addEventListener('click', () => {
    renderSettingsPage(); // Render the settings page when "Settings" button is clicked
  });

  document.getElementById('fetchSnippets').addEventListener('click', () => {
    checkSnippetsAndRender();
  });

  document.getElementById('newSnippet').addEventListener('click', () => {
    addNewSnippet();
  });

  renderCategories();
}

document.addEventListener('DOMContentLoaded', () => {
  // Initially check snippets when the popup loads
  checkSnippetsAndRender();
});
