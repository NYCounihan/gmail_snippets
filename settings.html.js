const settingsPageHtml = `
  <h1>Settings</h1>
  <div class="settings-container">
    <div class="settings-section">
      <h2>AI Enhancement</h2>
      <div class="ai-toggle">
        <input type="checkbox" id="aiEnabled" />
        <label for="aiEnabled">Enable AI snippet enhancement</label>
        <p class="ai-description">When enabled, AI will analyze email context and suggest improvements to snippets before insertion.</p>
      </div>
    </div>

    <div class="settings-section">
      <h2>Categories</h2>
      <div class="category-list"></div>
      <div class="category-input">
        <input type="text" id="newCategory" placeholder="New category">
        <button id="addCategory">Add Category</button>
      </div>
    </div>
  </div>
  <div class="button-container">
    <button id="backToMain">Back</button>
  </div>
`;

function displayCategories(snippetManager) {
  const categoryList = document.querySelector('.category-list');
  categoryList.innerHTML = '';

  snippetManager.categories.forEach(category => {
    const categoryElement = document.createElement('div');
    categoryElement.className = 'category';
    categoryElement.textContent = category;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '×';
    deleteButton.onclick = async () => {
      await snippetManager.deleteCategory(category);
      displayCategories(snippetManager);
    };

    categoryElement.appendChild(deleteButton);
    categoryList.appendChild(categoryElement);
  });

  const addCategoryButton = document.getElementById('addCategory');
  const newCategoryInput = document.getElementById('newCategory');

  addCategoryButton.onclick = async () => {
    const category = newCategoryInput.value.trim();
    if (category) {
      await snippetManager.addCategory(category);
      newCategoryInput.value = '';
      displayCategories(snippetManager);
    }
  };
}

export function renderSettingsPage(snippetManager, onBack) {
  document.body.innerHTML = settingsPageHtml;
  
  // Initialize AI checkbox state
  chrome.storage.local.get('aiEnabled', (result) => {
    const checkbox = document.getElementById('aiEnabled');
    checkbox.checked = result.aiEnabled || false;
    
    checkbox.addEventListener('change', (e) => {
      chrome.storage.local.set({ aiEnabled: e.target.checked });
    });
  });

  displayCategories(snippetManager);
  document.getElementById('backToMain').addEventListener('click', onBack);
}