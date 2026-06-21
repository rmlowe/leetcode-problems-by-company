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

const columns = [
    { id: 'display-name', displayName: 'Company', key: 'display-name', numeric: false },
    { id: 'thirty-days', displayName: '30 days', key: 'thirty-days', numeric: true },
    { id: 'three-months', displayName: '3 months', key: 'three-months', numeric: true },
    { id: 'six-months', displayName: '6 months', key: 'six-months', numeric: true },
    { id: 'more-than-six-months', displayName: 'More than 6 months', key: 'more-than-six-months', numeric: true },
    { id: 'all', displayName: 'All', key: 'all', numeric: true },
    // Derived: share of the company's all-time problems asked in the last
    // 6 months (the windows are cumulative, so six-months is a subset of
    // all). High = interview activity concentrated recently.
    { id: 'recent', displayName: 'Recent (6mo)', derived: true, numeric: true }
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

// The value a company sorts by for a column, or null when there's nothing
// meaningful to sort on (still loading, retrying, or a suppressed low-volume
// ratio). Null always sorts to the bottom regardless of direction.
const sortValue = (company, column) => {
    if (column.derived) {
        const recent = company['six-months'];
        const all = company['all'];
        if (recent && recent.value !== undefined && all && all.value >= MIN_FOR_INTENSITY) {
            return recent.value / all.value;
        }
        return null;
    }
    const obj = company[column.key];
    return obj && obj.value !== undefined ? obj.value : null;
};

let latestCompanies = [];
let sort = { id: 'all', dir: -1 }; // default: All, descending

const sortedCompanies = () => {
    const column = columns.find(c => c.id === sort.id);
    return [...latestCompanies].sort((a, b) => {
        const av = sortValue(a, column);
        const bv = sortValue(b, column);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return sort.dir * (column.numeric ? av - bv : String(av).localeCompare(String(bv)));
    });
};

const headerCell = column =>
    element('th', [column.displayName], 'text-center',
        { 'data-column-id': column.id, style: 'cursor: pointer; user-select: none;' });

const dataCell = (company, column) => {
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

    if (obj.value !== undefined) {
        return element('td', [obj.value], className(column));
    }

    return element('td', [retryText(obj.retryAt)], 'text-center text-muted', { 'data-retry-at': obj.retryAt });
};

// Build the header once. It is never destroyed, so clicks on it can't be
// interrupted by a body re-render. Only the tbody is swapped on each update.
const table = document.querySelector('table');
const thead = element('thead', [element('tr', columns.map(headerCell))]);
let tbody = element('tbody', []);
table.append(thead, tbody);

// Reflect the current sort in the persistent header cells.
const updateArrows = () => {
    for (const th of thead.querySelectorAll('th[data-column-id]')) {
        const column = columns.find(c => c.id === th.dataset.columnId);
        const arrow = sort.id === column.id ? (sort.dir === 1 ? ' ▲' : ' ▼') : '';
        th.textContent = column.displayName + arrow;
    }
};

const render = () => {
    updateProgress(latestCompanies);
    updateArrows();
    const newBody = element('tbody', sortedCompanies().map(company =>
        element('tr', columns.map(column => dataCell(company, column)))));
    table.replaceChild(newBody, tbody);
    tbody = newBody;
};

// Header clicks: same column toggles direction; a new column starts descending
// for numbers (biggest first) and ascending for the name.
thead.addEventListener('click', event => {
    const th = event.target.closest('th[data-column-id]');
    if (!th) {
        return;
    }
    const column = columns.find(c => c.id === th.dataset.columnId);
    sort = sort.id === column.id
        ? { id: column.id, dir: -sort.dir }
        : { id: column.id, dir: column.numeric ? -1 : 1 };
    render();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    latestCompanies = request;
    render();
});
