/* global chrome */

const titleInput = document.getElementById("clip-title");
const excerptInput = document.getElementById("clip-excerpt");
const typeSelect = document.getElementById("clip-type");
const campaignGroup = document.getElementById("campaign-group");
const campaignInput = document.getElementById("clip-campaign");
const clipBtn = document.getElementById("clip-btn");
const statusDiv = document.getElementById("status");

// Show/hide campaign ID field based on type
typeSelect.addEventListener("change", () => {
  campaignGroup.style.display = typeSelect.value === "idea" ? "block" : "none";
});

// Pre-fill title and excerpt from the active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab && tab.title) {
    titleInput.value = tab.title;
  }

  // Try to get selected text from the page
  if (tab && tab.id) {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString(),
      })
      .then((results) => {
        if (results && results[0] && results[0].result) {
          excerptInput.value = results[0].result.trim();
        }
      })
      .catch(() => {
        // Permission denied on some pages (e.g. chrome://) — ignore
      });
  }
});

clipBtn.addEventListener("click", async () => {
  statusDiv.className = "status";
  statusDiv.style.display = "none";
  clipBtn.disabled = true;
  clipBtn.textContent = "Clipping...";

  try {
    const settings = await chrome.storage.sync.get(["igniteUrl", "apiKey"]);
    if (!settings.igniteUrl || !settings.apiKey) {
      showStatus("error", "Please configure your Ignite URL and API key in Settings.");
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0]?.url;
    if (!currentUrl) {
      showStatus("error", "Cannot determine the current page URL.");
      return;
    }

    const payload = {
      url: currentUrl,
      title: titleInput.value.trim(),
      excerpt: excerptInput.value.trim() || undefined,
      type: typeSelect.value,
    };

    if (typeSelect.value === "idea") {
      const cid = campaignInput.value.trim();
      if (!cid) {
        showStatus("error", "Campaign ID is required for ideas.");
        return;
      }
      payload.campaignId = cid;
    }

    const response = await chrome.runtime.sendMessage({
      action: "clip",
      payload,
      settings: { url: settings.igniteUrl, apiKey: settings.apiKey },
    });

    if (response.success) {
      showStatus("success", `Clipped as ${response.data.type}! View in Ignite.`);
    } else {
      showStatus("error", response.error || "Failed to clip.");
    }
  } catch (err) {
    showStatus("error", "Unexpected error: " + err.message);
  }
});

function showStatus(type, message) {
  statusDiv.className = "status " + type;
  statusDiv.textContent = message;
  statusDiv.style.display = "block";
  clipBtn.disabled = false;
  clipBtn.textContent = "Clip to Ignite";
}
