chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.executeScript(tabs[0].id, { file: 'content.js' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>
    document.querySelector('p').textContent = JSON.stringify(request));
