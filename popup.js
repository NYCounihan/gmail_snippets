document.addEventListener('DOMContentLoaded', () => {
  const mainContainer = document.body; // Main container for the popup
  let snippets = [];

  // Function to check if snippets exist and render the main page
  function checkSnippetsAndRender() {
    chrome.storage.local.get('snippets', (result) => {
      snippets = Array.isArray(result.snippets) ? result.snippets : [];

      snippets.forEach((snippet, index) => {
        if (!snippet || typeof snippet.hotkey === 'undefined' || typeof snippet.content === 'undefined') {
          snippets.splice(index, 1);
        }
      });

      renderMainPage();
    });
  }

  // Function to render the main popup page
  function renderMainPage() {
    mainContainer.innerHTML = mainPageHtml;
    // displayLoadingAnimation(); // Commented out as the function is not defined
    setTimeout(() => {
      displaySnippets(snippets);
      // removeLoadingAnimation(); // Commented out as the function is not defined
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

  // Function to render the settings page
  function renderSettingsPage() {
    mainContainer.innerHTML = settingsPageHtml; // Load settings HTML

    document.getElementById('spreadsheetId').value = spreadsheetId;
    document.getElementById('range').value = range;
    document.getElementById('clientId').value = clientId;

    // Add event listener to the form submission for saving settings
    document.getElementById('settingsForm').addEventListener('submit', (event) => {
      event.preventDefault();
      spreadsheetId = document.getElementById('spreadsheetId').value;
      range = document.getElementById('range').value;
      clientId = document.getElementById('clientId').value;

      if (!spreadsheetId || !range || !clientId) {
        alert('All fields are required.');
        return;
      }
    
      if (!/^[a-zA-Z0-9-_]+$/.test(spreadsheetId)) {
        alert('Invalid Spreadsheet ID.');
        return;
      }
    
      if (!/^([a-zA-Z0-9]+)!([A-Z]+:[A-Z]+)$/.test(range)) {
        alert('Invalid range format. Expected format: Sheet1!A:B');
        return;
      }

      chrome.storage.local.set({ spreadsheetId, range, clientId }, () => {
        alert('Settings saved!');
        renderMainPage(); // After saving, go back to the main page
      });
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
        const newSnippet = { hotkey: newHotKey, content: newContent };
        snippets.push(newSnippet);

        // Save the new snippet to chrome.storage
        chrome.storage.local.set({ snippets }, () => {
          displaySnippets(snippets);
          alert('New snippet added successfully!');
        });
      } else {
        alert('Both hotkey and content are required to add a new snippet.');
      }
    });
    actionCell.appendChild(saveButton);
    newSnippetRow.appendChild(actionCell);

    snippetsContainer.appendChild(newSnippetRow);
  }

function displaySnippets(snippets) {
    const snippetsContainer = document.getElementById('snippets');
    snippetsContainer.innerHTML = '<p>Loading snippets...</p>';
    snippetsContainer.innerHTML = ''; // Clear any existing snippets

    snippets.forEach((snippet, index) => {

      if (!snippet || typeof snippet.hotkey === 'undefined' || typeof snippet.content === 'undefined') {
        console.warn(`Invalid snippet at index ${index}:`, snippet);
        return; // Skip this iteration if the snippet is not valid
      }


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

        // Save the updated snippet to chrome.storage
        chrome.runtime.sendMessage({ action: 'saveSnippet', index, snippet: snippets[index] }, (response) => {
          if (response.success) {
            console.log('Snippet saved successfully!');
          } else {
            console.error('Failed to save snippet. Please try again.', 'error');
          }
        });

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

  // Initially check snippets when the popup loads
  checkSnippetsAndRender();
});