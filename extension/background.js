// Chrome Extension Background Service Worker
// Proxies fetch requests to bypass HTTPS -> HTTP mixed content security blocks in the browser

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_API') {
    const fetchOptions = {
      method: request.method || 'GET',
      headers: request.headers || {},
    };

    if (request.body) {
      fetchOptions.body = JSON.stringify(request.body);
    }

    fetch(request.url, fetchOptions)
      .then(async (res) => {
        let data = null;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          data = await res.text();
        }

        sendResponse({
          success: true,
          result: {
            ok: res.ok,
            status: res.status,
            data,
          },
        });
      })
      .catch((error) => {
        console.error('Fetch proxy failed in background:', error);
        sendResponse({
          success: false,
          error: error.message,
        });
      });

    return true; // Keep message channel open for async sendResponse
  }
});
