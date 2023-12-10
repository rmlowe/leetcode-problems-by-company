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
