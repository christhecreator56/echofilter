document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const userIdInput = document.getElementById('userId');
  const userApiKeyInput = document.getElementById('userApiKey');
  const saveBtn = document.getElementById('saveBtn');
  const successMsg = document.getElementById('successMsg');

  // Load existing values from chrome storage
  chrome.storage.local.get(['apiUrl', 'userId', 'userApiKey'], (items) => {
    if (items.apiUrl) {
      apiUrlInput.value = items.apiUrl;
    }
    if (items.userId) {
      userIdInput.value = items.userId;
    }
    if (items.userApiKey) {
      userApiKeyInput.value = items.userApiKey;
    }
  });

  saveBtn.addEventListener('click', () => {
    let apiUrl = apiUrlInput.value.trim();
    let userId = userIdInput.value.trim();
    const userApiKey = userApiKeyInput.value.trim();

    // Clean trailing slash
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1);
    }

    // Apply defaults if empty
    if (!apiUrl) {
      apiUrl = 'http://localhost:3000';
    }
    if (!userId) {
      userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    }

    chrome.storage.local.set({ apiUrl, userId, userApiKey }, () => {
      apiUrlInput.value = apiUrl;
      userIdInput.value = userId;
      userApiKeyInput.value = userApiKey;

      // Show success notification
      successMsg.style.display = 'block';
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 2000);
    });
  });
});

