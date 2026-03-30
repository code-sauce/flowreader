// Background service worker -- handles CORS-free fetching and context menu

// Context menu: "Read in FlowReader"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'flowreader-selection',
    title: 'Read in FlowReader',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'flowreader-page',
    title: 'Read this page in FlowReader',
    contexts: ['page'],
  });
});

// Click extension icon -> open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'flowreader-selection' && info.selectionText) {
    await chrome.sidePanel.open({ tabId: tab.id });
    // Wait for panel to be ready, then send text
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'load-text',
        text: info.selectionText,
        source: `Selected from ${tab.title || tab.url}`,
      });
    }, 500);
  }

  if (info.menuItemId === 'flowreader-page' && tab.url) {
    await chrome.sidePanel.open({ tabId: tab.id });
    // Fetch the page CORS-free from background
    try {
      const response = await fetch(tab.url);
      const html = await response.text();
      chrome.runtime.sendMessage({
        type: 'load-html',
        html,
        url: tab.url,
        title: tab.title,
      });
    } catch (err) {
      chrome.runtime.sendMessage({
        type: 'load-error',
        error: `Failed to fetch page: ${err.message}`,
      });
    }
  }
});

// Handle fetch requests from the side panel (for URL input)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetch-url') {
    fetch(message.url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(html => sendResponse({ ok: true, html }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
});
