let snippets = [];
let categories = [];

// updating for monday meeting


// Function to create a formatting button
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

// Function to check if snippets exist and render the main page
function checkSnippetsAndRender() {
  chrome.storage.local.get('snippets', (result) => {
    snippets = Array.isArray(result.snippets) ? result.snippets : [];

    snippets.forEach((snippet, index) => {
      if (!snippet) {
        snippets.splice(index, 1);
      } else {
        snippet.hotkey = snippet.hotkey ? snippet.hotkey : snippets.length;
        snippet.content = snippet.content ? snippet.content : "";
      }
    });

    renderMainPage();
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

  // Formatting buttons for editing (initially hidden)
  const formatContainer = document.createElement('div');
  formatContainer.classList.add('formatting-options', 'toolbar');

  // Create and add formatting buttons
  const boldButton = createFormattingButton('<strong>B</strong>', 'Bold', 'bold');
  const italicButton = createFormattingButton('<em>I</em>', 'Italic', 'italic');
  const linkButton = createFormattingButton('&#128279;', 'Link', 'createLink', 'Enter the URL:');

  // Add buttons to the formatting container
  formatContainer.appendChild(boldButton);
  formatContainer.appendChild(italicButton);
  formatContainer.appendChild(linkButton);
  snippetCell.appendChild(formatContainer);
  newSnippetRow.appendChild(snippetCell);

  // Save button cell
  const actionCell = document.createElement('td');
  const saveButton = document.createElement('button');
  saveButton.className = 'snippet-button';
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', () => {

    formatContainer.style.display = 'none';
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
        checkSnippetsAndRender();
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

    // Create and add formatting buttons
    const boldButton = createFormattingButton('<strong>B</strong>', 'Bold', 'bold');
    const italicButton = createFormattingButton('<em>I</em>', 'Italic', 'italic');
    const linkButton = createFormattingButton('&#128279;', 'Link', 'createLink', 'Enter the URL:');

    // Add buttons to the formatting container
    formatContainer.appendChild(boldButton);
    formatContainer.appendChild(italicButton);
    formatContainer.appendChild(linkButton);
    snippetCell.appendChild(formatContainer);
    snippetRow.appendChild(snippetCell);

    // Tags cell with multi-select dropdown
    const tagsCell = document.createElement('td');
    const tagSelect = document.createElement('select');
    tagSelect.size = 1;
    tagSelect.setAttribute('multiple', 'multiple');
    tagSelect.classList.add('styled-multiselect'); // Add this line

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
    let saveButtonClicked = false;
    saveButtonClicked = false;
    saveButton.addEventListener('click', () => {
      console.log('inside save :: saveButtonClicked is ' + saveButtonClicked);
      saveButtonClicked = true; // Set flag to true when save button is clicked
      console.log('inside save :: saveButtonClicked is ' + saveButtonClicked);
      const updatedSnippet = snippetContent.innerHTML;
      snippets[index].content = updatedSnippet;
      saveSnippet(index);
      snippetContent.setAttribute('contenteditable', 'false'); // Make read-only
      snippetContent.style.border = 'none'; // Remove highlight
      saveButton.style.display = 'none';
      formatContainer.style.display = 'none';   // Hide formatting options after saving
    });

    actionCell.appendChild(saveButton);
    snippetRow.appendChild(actionCell);

      // Make snippet content editable on click
  snippetRow.addEventListener('click', () => {
    snippetContent.setAttribute('contenteditable', 'true');
    snippetContent.style.border = '2px dashed #007BFF'; // Highlight editable state
    snippetContent.style.height = '80px';
    snippetCell.style.height = '120px'; 
    actionCell.style.flexDirection = 'column';
    tagSelect.size = 6;
    snippetContent.focus();
    saveButton.style.display = 'inline-block'; // Show Save button
    formatContainer.style.display = 'block';  // Show formatting options
  });

  // Handle focusout event to save changes and hide formatting options
  snippetRow.addEventListener('focusout', (event) => {
    console.log('Focus out event and saveButtonClicked is ' + saveButtonClicked);
    // Check if the new focused element is still within the snippetRow
    if (!snippetRow.contains(event.relatedTarget) || !saveButtonClicked) {
      snippetContent.setAttribute('contenteditable', 'false');
      snippetContent.style.border = ''; // Remove inline border style to revert to base style
      snippetContent.style.height = '100%';
      snippetCell.style.height = '100%';
      actionCell.style.flexDirection = 'row';
      tagSelect.size = 1;
      saveButton.style.display = 'none'; // Hide Save button
      formatContainer.style.display = 'none'; // Hide formatting options
      // Save the updated content
      snippet.content = snippetContent.innerHTML;
      saveSnippet(index);
    }
    saveButtonClicked = false; // Reset flag after handling focusout
    console.log('reset :: saveButtonClicked is ' + saveButtonClicked);
  });

    snippetsContainer.appendChild(snippetRow);
  }); // end of snippets for each loop
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
});

