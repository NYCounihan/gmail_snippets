let snippets = [];
let categories = [];

// Function to check if snippets exist and render the main page
function checkSnippetsAndRender() {
  chrome.storage.local.get('snippets', (result) => {
    snippets = Array.isArray(result.snippets) ? result.snippets : [];

    snippets.forEach((snippet, index) => {
      if (!snippet || typeof snippet.hotkey === 'undefined' || typeof snippet.content === 'undefined') {
        snippets.splice(index, 1);
      }
    });
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
}

// Function to render the settings page
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

function addNewSnippetRow() {
  const snippetsContainer = document.getElementById('snippets');
  const newSnippetRow = document.createElement('tr');

  // Hotkey cell
  const hotkeyCell = document.createElement('td');
  const hotkeyInput = document.createElement('div');
  hotkeyInput.setAttribute('contenteditable', 'true');
  hotkeyInput.textContent = snippets.length;
  hotkeyCell.appendChild(hotkeyInput);
  newSnippetRow.appendChild(hotkeyCell);

  // Snippet content cell
  const snippetCell = document.createElement('td');
  const snippetContent = document.createElement('div');
  snippetContent.setAttribute('contenteditable', 'true');
  snippetContent.classList.add('snippet-content');
  snippetContent.textContent = 'Enter snippet content';
  snippetCell.appendChild(snippetContent);
  newSnippetRow.appendChild(snippetCell);

  // Save button cell
  const actionCell = document.createElement('td');
  const saveButton = document.createElement('button');
  saveButton.className = 'snippet-button';
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', () => {
    const newHotKey = hotkeyInput.textContent;
    const newContent = snippetContent.innerHTML.trim();

    if (newHotKey && newContent) {
      const newSnippet = {
        hotkey: newHotKey,
        content: newContent,
        tags: []
      };
      snippets.push(newSnippet);

      // Save the new snippet to chrome.storage
      chrome.storage.local.set({ snippets }, () => {
        displaySnippets(snippets);
      });
    } else {
      alert('Both hotkey and content are required to add a new snippet.');
    }
  });

  actionCell.appendChild(saveButton);
  newSnippetRow.appendChild(actionCell);
  snippetsContainer.appendChild(newSnippetRow);
}

function saveSnippet(index){
  // Save the updated snippet to chrome.storage
  chrome.runtime.sendMessage({ action: 'saveSnippet', index, snippet: snippets[index] }, (response) => {
    if (response.success) {
      console.log('Snippet saved successfully!');
    } else {
      console.error('Failed to save snippet. Please try again.', 'error');
    }
  });
}

function displaySnippets(snippets) {
  const snippetsContainer = document.getElementById('snippets');
  snippetsContainer.innerHTML = ''; // Clear any existing snippets

  snippets.forEach((snippet, index) => {

    const snippetRow = document.createElement('tr');

    // Hotkey cell
    const hotkeyCell = document.createElement('td');
    hotkeyCell.textContent = index;
    snippetRow.appendChild(hotkeyCell);

    // Snippet content cell
    const snippetCell = document.createElement('td');
    const snippetContent = document.createElement('div');
    snippetContent.innerHTML = snippet.content;
    snippetContent.setAttribute('contenteditable', 'false'); // Initially not editable
    snippetContent.classList.add('snippet-content');
    snippetCell.appendChild(snippetContent);

    // Formatting buttons for editing (initially hidden)
    const formatContainer = document.createElement('div');
    formatContainer.style.display = 'none';
    formatContainer.classList.add('formatting-options', 'toolbar');

    const boldButton = document.createElement('button');
    boldButton.innerHTML = '<strong>B</strong>';
    boldButton.title = 'Bold';
    boldButton.onclick = () => document.execCommand('bold');

    const italicButton = document.createElement('button');
    italicButton.innerHTML = '<em>I</em>';
    italicButton.title = 'Italic';
    italicButton.onclick = () => document.execCommand('italic');

    const linkButton = document.createElement('button');
    linkButton.innerHTML = '&#128279;';
    linkButton.title = 'Link';
    linkButton.onclick = () => {
      const url = prompt('Enter the URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    };

    // Add buttons to the formatting container
    formatContainer.appendChild(boldButton);
    formatContainer.appendChild(italicButton);
    formatContainer.appendChild(linkButton);
    snippetCell.appendChild(formatContainer);
    snippetRow.appendChild(snippetCell);

    // Tags cell with multi-select dropdown
    const tagsCell = document.createElement('td');
    const tagSelect = document.createElement('select');
    tagSelect.setAttribute('multiple', 'multiple');

    // Populate dropdown with categories
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;

      if (!category || typeof category === 'undefined') {
        category = Array.isArray(result.category) ? result.category : [];
      }

      if (snippet.tags.includes(category)) {
          option.selected = true; // Mark as selected if already tagged
      }
      tagSelect.appendChild(option);
    });

    // Update snippet tags on selection change
    tagSelect.addEventListener('change', () => {
        snippet.tags = Array.from(tagSelect.selectedOptions).map(option => option.value);
        saveSnippet(index);
    });

    tagsCell.appendChild(tagSelect);
    snippetRow.appendChild(tagsCell);

    // Action buttons cell
    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell'; 

    // Insert button
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
    actionCell.appendChild(insertButton);

    // Edit button
    const editButton = document.createElement('button');
    editButton.className = 'snippet-button';
    editButton.innerHTML = `
    <svg class="snippet-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M14.06 2a2 2 0 0 1 1.414.586l5.94 5.94a2 2 0 0 1 0 2.828L9.874 22.894a2 2 0 0 1-1.414.586H2v-6.46a2 2 0 0 1 .586-1.415L13.646 2.586A2 2 0 0 1 14.06 2Zm0 2.828L3.414 15.476a.5.5 0 0 0-.147.354V21h5.17a.5.5 0 0 0 .353-.146L19.94 9.94Z"/>
    </svg> Edit
  `;

    editButton.addEventListener('click', () => {
      snippetContent.setAttribute('contenteditable', 'true');
      snippetContent.style.border = '2px dashed #007BFF'; // Highlight editable state
      snippetContent.focus();
      editButton.style.display = 'none';
      saveButton.style.display = 'inline-block'; // Show Save button
      formatContainer.style.display = 'block';  // Show formatting options
    });
    actionCell.appendChild(editButton);

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'snippet-button';
    deleteButton.innerHTML = `
    <svg class="snippet-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M9 2h6a1 1 0 0 1 1 1v1h5v2H3V4h5V3a1 1 0 0 1 1-1Zm10 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z"/>
    </svg> Delete
  `;

    deleteButton.addEventListener('click', () => {
      // Delete the snippet in chrome.storage
      chrome.runtime.sendMessage({ action: 'deleteSnippet', index, snippet: snippets[index] }, (response) => {
        if (response.success) {
          console.log('Snippet deleted successfully!');
          checkSnippetsAndRender();
        } else {
          console.error('Failed to delete snippet. Please try again.', 'error');
        }
      });
    });
    actionCell.appendChild(deleteButton);

    // Save button
    const saveButton = document.createElement('button');
    saveButton.className = 'snippet-button';
    saveButton.textContent = 'Save';
    saveButton.style.display = 'none';
    saveButton.addEventListener('click', () => {
      const updatedSnippet = snippetContent.innerHTML;
      snippets[index].content = updatedSnippet;
      saveSnippet(index);
      snippetContent.setAttribute('contenteditable', 'false'); // Make read-only
      snippetContent.style.border = 'none'; // Remove highlight
      saveButton.style.display = 'none';
      editButton.style.display = 'inline-block'; // Show Edit button again
      formatContainer.style.display = 'none';   // Hide formatting options after saving
    });

    actionCell.appendChild(saveButton);
    snippetRow.appendChild(actionCell);
    snippetsContainer.appendChild(snippetRow);
  });
}

// Function to render the main popup page
function renderMainPage() {
  const mainContainer = document.body; // Main container for the popup
  mainContainer.innerHTML = mainPageHtml;
  
  setTimeout(() => {
    displaySnippets(snippets);
  }, 500);

  // Attach event listeners to the buttons after re-rendering
  document.getElementById('openSettings').addEventListener('click', () => {
    renderSettingsPage(); // Render the settings page when "Settings" button is clicked
  });

  document.getElementById('fetchSnippets').addEventListener('click', () => {
    checkSnippetsAndRender();
  });

  document.getElementById('newSnippet').addEventListener('click', () => {
    addNewSnippetRow();
  });
}

document.addEventListener('DOMContentLoaded', () => {

  // Initially check snippets when the popup loads
  checkSnippetsAndRender();
  renderMainPage();
});