/* global chrome */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "clip") {
    handleClip(message.payload, message.settings)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    // Return true to indicate async response
    return true;
  }
});

async function handleClip(payload, settings) {
  const baseUrl = settings.url.replace(/\/+$/, "");
  const endpoint = `${baseUrl}/api/v1/clip`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}
