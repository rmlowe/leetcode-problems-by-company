chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const columns = [
        { displayName: 'Company', key: 'display-name', numeric: false },
        { displayName: '30 days', key: 'thirty-days', numeric: true },
        { displayName: '3 months', key: 'three-months', numeric: true },
        { displayName: '6 months', key: 'six-months', numeric: true },
        { displayName: 'More than 6 months', key: 'more-than-six-months', numeric: true },
        { displayName: 'All', key: 'all', numeric: true }
    ];
    const element = (tagName, nodes, className) => {
        const result = document.createElement(tagName);
        result.className = className;
        result.append(...nodes);
        return result;
    };
    const className = column => column.numeric ? "text-right" : "text-left";
    const table = document.querySelector('table');
    table.innerHTML = '';
    table.append(
        element('thead', [element('tr', columns.map(column => element('th', [column.displayName], className(column))))]),
        element('tbody', request.map(company =>
            element('tr', columns.map(column => {
                const value = company[column.key];
                return element('td', [value === undefined ? "" : value], className(column));
            })))));
});
