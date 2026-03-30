// Content script -- adds a floating "Read" button when text is selected

let floatingBtn = null;

function removeBtn() {
  if (floatingBtn) {
    floatingBtn.remove();
    floatingBtn = null;
  }
}

document.addEventListener('mouseup', (e) => {
  removeBtn();

  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text || text.length < 20) return; // ignore tiny selections

  // Create floating button near selection
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  floatingBtn = document.createElement('button');
  floatingBtn.id = 'flowreader-float-btn';
  floatingBtn.textContent = 'Read';
  floatingBtn.style.top = `${window.scrollY + rect.top - 36}px`;
  floatingBtn.style.left = `${window.scrollX + rect.left + rect.width / 2}px`;
  document.body.appendChild(floatingBtn);

  floatingBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    chrome.runtime.sendMessage({
      type: 'read-selection',
      text,
      source: `Selected from ${document.title}`,
    });
    removeBtn();
  });
});

document.addEventListener('mousedown', (e) => {
  if (floatingBtn && !floatingBtn.contains(e.target)) {
    removeBtn();
  }
});

// Listen for the side panel to request selected text
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'read-selection') {
    // Forward to side panel
    chrome.runtime.sendMessage({
      type: 'load-text',
      text: message.text,
      source: message.source,
    });
  }
});
