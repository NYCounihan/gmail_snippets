export default class SnippetManager {
  constructor() {
    this.snippets = [];
    this.categories = [];
  }

  async handleMessage(action, data = {}) {
    try {
      const response = await chrome.runtime.sendMessage({ action, ...data });
      if (!response.success) throw new Error('Operation failed');
      return response;
    } catch (error) {
      throw new Error(`Failed to ${action}: ${error.message}`);
    }
  }

  async initialize() {
    await this.loadSnippets();
    await this.loadCategories();
  }

  async loadSnippets() {
    const response = await this.handleMessage('getSnippets');
    this.snippets = response.snippets;
  }

  async loadCategories() {
    try {
      const result = await chrome.storage.local.get('categories');
      this.categories = result.categories || ['General']; // Default to ['General'] if no categories exist
    } catch (error) {
      console.warn('Failed to load categories, using default:', error);
      this.categories = ['General']; // Fallback to default category
    }
  }

  // CRUD operations
  async addSnippet(snippet) {
    return await this.handleMessage('addSnippet', { snippet });
  }

  async updateSnippet(index, snippet) {
    return await this.handleMessage('updateSnippet', { index, snippet });
  }

  async deleteSnippet(index) {
    return await this.handleMessage('deleteSnippet', { index });
  }

  async addCategory(category) {
    try {
      const result = await chrome.storage.local.get('categories');
      const categories = result.categories || [];
      if (!categories.includes(category)) {
        categories.push(category);
        await chrome.storage.local.set({ categories });
        this.categories = categories;
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to add category: ${error.message}`);
    }
  }

  async deleteCategory(category) {
    try {
      const result = await chrome.storage.local.get('categories');
      const categories = result.categories || [];
      const index = categories.indexOf(category);
      if (index > -1) {
        categories.splice(index, 1);
        await chrome.storage.local.set({ categories });
        this.categories = categories;
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }
}