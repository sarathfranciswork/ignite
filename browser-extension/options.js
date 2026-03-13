/* global chrome */

const urlInput = document.getElementById("ignite-url");
const keyInput = document.getElementById("api-key");
const saveBtn = document.getElementById("save-btn");
const savedMsg = document.getElementById("saved-msg");

// Load saved settings
chrome.storage.sync.get(["igniteUrl", "apiKey"], (items) => {
  if (items.igniteUrl) urlInput.value = items.igniteUrl;
  if (items.apiKey) keyInput.value = items.apiKey;
});

saveBtn.addEventListener("click", () => {
  const igniteUrl = urlInput.value.trim().replace(/\/+$/, "");
  const apiKey = keyInput.value.trim();

  if (!igniteUrl) {
    urlInput.focus();
    return;
  }

  if (!apiKey) {
    keyInput.focus();
    return;
  }

  chrome.storage.sync.set({ igniteUrl, apiKey }, () => {
    savedMsg.classList.add("show");
    setTimeout(() => savedMsg.classList.remove("show"), 2000);
  });
});
