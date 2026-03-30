// Side panel script -- bridges extension messages to the FlowReader iframe

const iframe = document.getElementById('app');

// Wait for iframe to load
iframe.addEventListener('load', () => {
  // Check if there's a pending message
  if (pendingMessage) {
    sendToApp(pendingMessage);
    pendingMessage = null;
  }
});

let pendingMessage = null;

function sendToApp(msg) {
  iframe.contentWindow.postMessage(msg, '*');
}

// Listen for messages from background / content scripts
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'load-text') {
    const msg = { type: 'flowreader-load', text: message.text, source: message.source };
    if (iframe.contentWindow) {
      sendToApp(msg);
    } else {
      pendingMessage = msg;
    }
  }

  if (message.type === 'load-html') {
    // Parse HTML with Readability in the side panel context
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, 'text/html');
    // Try to extract article text
    const article = extractText(doc);
    const text = article || doc.body?.textContent || '';
    const msg = {
      type: 'flowreader-load',
      text: text.trim(),
      source: message.url,
    };
    if (iframe.contentWindow) {
      sendToApp(msg);
    } else {
      pendingMessage = msg;
    }
  }

  if (message.type === 'load-error') {
    console.error(message.error);
  }
});

// Simple article text extraction (lightweight, no Readability dependency)
function extractText(doc) {
  // Try common article selectors
  const selectors = [
    'article',
    '[role="main"]',
    '.post-content',
    '.article-body',
    '.entry-content',
    '.story-body',
    'main',
  ];
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (el && el.textContent.trim().length > 200) {
      return el.textContent;
    }
  }
  // Fallback: largest text block
  const paragraphs = doc.querySelectorAll('p');
  if (paragraphs.length > 3) {
    return Array.from(paragraphs).map(p => p.textContent).join('\n\n');
  }
  return null;
}

// Also handle fetch-url requests from the iframe (for URL input in the web app)
window.addEventListener('message', async (e) => {
  if (e.data?.type === 'flowreader-fetch-url') {
    const response = await chrome.runtime.sendMessage({
      type: 'fetch-url',
      url: e.data.url,
    });
    iframe.contentWindow.postMessage({
      type: 'flowreader-fetch-response',
      ...response,
    }, '*');
  }
});
