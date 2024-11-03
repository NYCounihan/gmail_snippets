/*document.addEventListener('DOMContentLoaded', () => {
  // Load previously saved settings
  chrome.storage.local.get(['spreadsheetId', 'range', 'clientId'], (result) => {
    // Display current values
    if (result.spreadsheetId) {
      document.getElementById('currentSpreadsheetId').textContent = result.spreadsheetId;
      document.getElementById('spreadsheetId').value = result.spreadsheetId;
    }
  });

  // Save settings when the form is submitted
  document.getElementById('settingsForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const spreadsheetId = document.getElementById('spreadsheetId').value;
    const range = document.getElementById('range').value;
    const clientId = document.getElementById('clientId').value;

    chrome.storage.local.set({
      spreadsheetId,
      range,
      clientId
    }, () => {
      alert('Settings saved!');
      // Update displayed current values
      document.getElementById('currentSpreadsheetId').textContent = spreadsheetId || 'No value set';
      document.getElementById('currentRange').textContent = range || 'No value set';
      document.getElementById('currentClientId').textContent = clientId || 'No value set';
    });
  });
});*/
