const { declarativeContent, runtime } = chrome;

runtime.onInstalled.addListener(() => {
    const { onPageChanged } = declarativeContent;

    onPageChanged.removeRules(undefined, () =>
        onPageChanged.addRules([{
            conditions: [new declarativeContent.PageStateMatcher({
                pageUrl: { originAndPathMatches: 'https://leetcode\\.com/problemset/' }
            })],
            actions: [new declarativeContent.ShowPageAction()]
        }]));
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: 'summary.html', active: false });

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] });
    });
});
