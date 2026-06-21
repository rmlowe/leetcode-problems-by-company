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

const FETCHED_PERIODS = ['thirty-days', 'three-months', 'six-months', 'more-than-six-months'];

// Minimum all-time count before we show the recent-intensity ratio. Below this
// the ratio is dominated by small-sample noise (one problem entering the
// 6-month window swings it wildly), so we show "—" instead.
const MIN_FOR_INTENSITY = 20;

const updateProgress = companies => {
    let done = 0;
    for (const company of companies) {
        for (const period of FETCHED_PERIODS) {
            if (company[period] && company[period].value !== undefined) {
                done++;
            }
        }
    }
    const total = companies.length * FETCHED_PERIODS.length;
    const complete = total > 0 && done === total;

    document.querySelector('#progress-label').textContent =
        complete ? `All ${companies.length} companies loaded` : `Loaded ${done} of ${total}`;

    const bar = document.querySelector('#progress-bar');
    bar.style.width = `${total > 0 ? Math.round(100 * done / total) : 0}%`;
    bar.classList.toggle('bg-success', complete);
    // Stop the animated stripes once everything has settled.
    bar.classList.toggle('progress-bar-striped', !complete);
    bar.classList.toggle('progress-bar-animated', !complete);
};

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
        { displayName: 'All', key: 'all', numeric: true },
        // Derived: share of the company's all-time problems asked in the last
        // 6 months (the windows are cumulative, so six-months is a subset of
        // all). High = interview activity concentrated recently.
        { displayName: 'Recent (6mo)', derived: true, numeric: true }
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
    updateProgress(request);
    const table = document.querySelector('table');
    table.innerHTML = '';
    table.append(
        element('thead', [element('tr', columns.map(column => element('th', [column.displayName], 'text-center')))]),
        element('tbody', request.map(company =>
            element('tr', columns.map(column => {
                if (column.derived) {
                    const recent = company['six-months'];
                    const all = company['all'];
                    if (!(recent && recent.value !== undefined && all && all.value !== undefined)) {
                        return element('td', ["…"], "text-center text-muted");
                    }
                    if (all.value < MIN_FOR_INTENSITY) {
                        return element('td', ["—"], "text-center text-muted");
                    }
                    return element('td', [`${Math.round(100 * recent.value / all.value)}%`], className(column));
                }

                const obj = company[column.key];

                if (obj === undefined) {
                    return element('td', ["…"], "text-center text-muted");
                }

                const value = obj.value;

                if (value !== undefined) {
                    return element('td', [value], className(column));
                }

                return element('td', [retryText(obj.retryAt)], 'text-center text-muted', { 'data-retry-at': obj.retryAt });
            })))));
});
