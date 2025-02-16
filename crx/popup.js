chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const columns = [
        { key: 'Company', numeric: false },
        { key: '6 months', numeric: true },
        { key: '1 year', numeric: true },
        { key: '2 years', numeric: true },
        { key: 'All time', numeric: true }
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
        element('thead', [element('tr', columns.map(column => element('th', [column.key], className(column))))]),
        element('tbody', request.map(company =>
            element('tr', columns.map(column => {
                const value = company[column.key];
                return element('td', [value === undefined ? "" : value], className(column));
            })))));
});
