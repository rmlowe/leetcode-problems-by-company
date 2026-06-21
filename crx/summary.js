const formatDuration = totalSeconds => {
    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) {
        return `${totalMinutes}m ${seconds}s`;
    }
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    return `${hours}h ${minutes}m ${seconds}s`;
};

const retryText = retryAt =>
    `Retrying in ${formatDuration(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)))}`;

setInterval(() => {
    for (const td of document.querySelectorAll('td[data-retry-at]')) {
        td.textContent = retryText(parseInt(td.dataset.retryAt, 10));
    }
}, 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const columns = [
        { displayName: 'Company', key: 'display-name', numeric: false },
        { displayName: '30 days', key: 'thirty-days', numeric: true },
        { displayName: '3 months', key: 'three-months', numeric: true },
        { displayName: '6 months', key: 'six-months', numeric: true },
        { displayName: 'More than 6 months', key: 'more-than-six-months', numeric: true },
        { displayName: 'All', key: 'all', numeric: true }
    ];
    const element = (tagName, nodes, className, attrs) => {
        const result = document.createElement(tagName);
        result.className = className;
        if (attrs) {
            for (const [name, value] of Object.entries(attrs)) {
                result.setAttribute(name, value);
            }
        }
        result.append(...nodes);
        return result;
    };
    const className = column => column.numeric ? "text-right" : "text-left";
    const table = document.querySelector('table');
    table.innerHTML = '';
    table.append(
        element('thead', [element('tr', columns.map(column => element('th', [column.displayName], 'text-center')))]),
        element('tbody', request.map(company =>
            element('tr', columns.map(column => {
                const obj = company[column.key];

                if (obj === undefined) {
                    return element('td', "", "text-center");
                }

                const value = obj.value;

                if (value !== undefined) {
                    return element('td', [value], className(column));
                }

                return element('td', [retryText(obj.retryAt)], 'text-center text-muted', { 'data-retry-at': obj.retryAt });
            })))));
});
