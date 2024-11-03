const settingsPageHtml = `
  <h2>Settings</h2>
  <div class="container">

  <form id="addCategoryForm">
    <label for="newCategory">Add New Category:</label>
    <input type="text" id="newCategory" required>
    <button type="submit">Add Category</button>
  </form>

  <h2>Existing Categories</h2>
  <ul id="categoryList">
    <!-- Categories will be listed here with delete buttons -->
  </ul>

    <form id="settingsForm">
      <div class="form-group">
        <label for="exampleID">Example ID</label>
        <input type="text" id="exampleId">
      </div>

      <button type="submit" class="save-button">Save Settings</button>
    </form>
    <button id="backToMain" class="back-button">Back to Main</button>
  </div> 

  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      background-color: #ffffff;
      width: 600px;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      font-size: 14px;
    }
    h2 {
      text-align: center;
      color: #333;
      margin-bottom: 20px;
      font-size: 22px;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    label {
      font-size: 14px;
      color: #333;
      margin-bottom: 5px;
    }
    input {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      width: 100%;
      box-sizing: border-box;
    }
    .save-button {
      background-color: #ff385c;
      color: white;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 14px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: background-color 0.3s, transform 0.3s;
      margin-top: 20px;
      width: 100%;
    }
    .save-button:hover {
      background-color: #e91e63;
      transform: translateY(-2px);
    }
    .back-button {
      background-color: #007BFF;
      color: white;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 14px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: background-color 0.3s, transform 0.3s;
      margin-top: 10px;
      width: 100%;
    }
    .back-button:hover {
      background-color: #0056b3;
      transform: translateY(-2px);
    }
    .form-group {
      margin-bottom: 20px;
    }
  </style>
`;