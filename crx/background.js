const { declarativeContent, runtime } = chrome;

runtime.onInstalled.addListener(() => {
    const { onPageChanged } = declarativeContent;

    onPageChanged.removeRules(undefined, () =>
        onPageChanged.addRules([{
            conditions: [new declarativeContent.PageStateMatcher({
                pageUrl: { originAndPathMatches: 'https://leetcode\\.com/problemset/all/' }
            })],
            actions: [new declarativeContent.ShowPageAction()]
        }]));
});

//chrome.pageAction.onClicked.addListener(tab => chrome.tabs.executeScript(tab.id, { file: 'content.js' }));

//runtime.onMessage.addListener((request, sender, sendResponse) => console.log(request));
