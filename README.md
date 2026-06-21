# LeetCode problem counts by company

A Chrome extension (in the [**crx/** directory](crx/)) that compiles a table of
LeetCode problem counts broken down by company and by recency window (last 30
days / 3 months / 6 months / more than 6 months / all time), sourced from
[the problemset page](https://leetcode.com/problemset/).

## Install (load unpacked)

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the [crx/](crx/) directory.

## Usage

1. Sign in to LeetCode and open the [problemset page](https://leetcode.com/problemset/).
   The extension's toolbar icon becomes active on that page.
2. Click the icon. This opens a **summary** tab and starts fetching counts.
3. Watch the progress bar fill in. Cells show `…` while pending, a retry
   countdown if a request failed, and the count once loaded. When everything
   has settled the bar turns green and reads "All N companies loaded".
4. Click any column header to sort by it (click again to reverse). The default
   is **All** descending. The **Recent (6mo)** column shows what share of a
   company's all-time problems were asked in the last 6 months — a rough
   size-normalized "active recently" signal, shown only for companies with
   enough volume to be meaningful.

## How it works

- **content.js** runs on the problemset page. It scrapes the company list from
  the page, then queries LeetCode's GraphQL API once per company × window for the
  problem count, posting results to the summary tab via `chrome.runtime.sendMessage`.
- **summary.js** receives those messages and (re)renders the table and progress
  bar, and owns ordering (click-to-sort). The two communicate through a simple
  per-cell state: a `{value}` once loaded, a `{retryAt}` while a retry is
  pending, or absent while still in flight.
- **background.js** activates the toolbar icon on the problemset page and, on
  click, opens the summary tab and injects the content script.

### Notes / gotchas

- The GraphQL request asks for `limit: 1` and selects only `totalLength`. The
  `limit` caps how many question rows the server returns, **not** `totalLength`,
  which is always the full count — so the counts are correct despite the tiny
  limit. This keeps responses small.
- The initial fan-out is drained through a fixed-size concurrency pool
  (`CONCURRENCY` in content.js) rather than firing every request at once. That
  burst, combined with heavyweight payloads, was previously self-inflicting
  rate-limiting; limiting concurrency and slimming the query largely eliminated it.
- Failed requests retry with exponential backoff, **capped** at
  `MAX_DELAY_SECONDS` (5 min) and jittered ±20% so the parallel retries don't
  fire in lockstep. Retries are scheduled independently of the concurrency pool.
- If rate-limiting ever returns, the next step is to honor the `Retry-After`
  header on 429 responses (see the marker comment in `getQuestionCount`).
