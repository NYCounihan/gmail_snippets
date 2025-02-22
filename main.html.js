export const mainPageHtml = `
  <h1>Snippet Inserter</h1>
  <div class="button-container">
    <button id="fetchSnippets">Fetch Snippets</button>
    <button id="newSnippet">Add Snippet</button>
    <button id="openSettings">Settings</button>
  </div>
  <div class="category-container">
  </div>
  <table id="snippetsTable">
    <thead>
      <tr>
        <th>ID</th>
        <th>Snippet</th>
        <th>Tags</th>
        <th>Action</th>
      </tr>
    </thead>
    </tbody>
    <tbody id="snippets">
      <!-- Snippets will be displayed here -->
    </tbody>
  </table>
  <div id="statusBar"></div>
`;
