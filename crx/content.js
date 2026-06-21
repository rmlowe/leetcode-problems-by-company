(() => {
  const BASE_DELAY_SECONDS = 5;
  const MAX_DELAY_SECONDS = 300;
  const CONCURRENCY = 6;

  const companies = Object.fromEntries(
    [...document.querySelectorAll('.swiper-slide a.mb-4')].flatMap(a => {
      const count = parseInt(a.querySelector('span span:last-child').textContent, 10);

      if (count <= 0) {
        return [];
      }

      return [[a.href.split('/')[4], {
        'display-name': { value: a.querySelector('span span:first-child').textContent },
        'all': { value: count }
      }]];
    }));
  console.log(companies);
  console.log(Object.keys(companies).length);

  const csrftoken = document.cookie.split('; ')
    .find(row => row.startsWith('csrftoken'))
    .split('=')[1];

  async function getQuestionCount(company, period) {
    const query = `
    query favoriteQuestionList($favoriteSlug: String!, $filter: FavoriteQuestionFilterInput, $filtersV2: QuestionFilterInput, $searchKeyword: String, $sortBy: QuestionSortByInput, $limit: Int, $skip: Int, $version: String = \"v2\") {
      favoriteQuestionList(
        favoriteSlug: $favoriteSlug
        filter: $filter
        filtersV2: $filtersV2
        searchKeyword: $searchKeyword
        sortBy: $sortBy
        limit: $limit
        skip: $skip
        version: $version
      ) {
        totalLength
      }
    }
    `;

    const favoriteSlug = [company, period].join('-');

    const value = {
      operationName: 'favoriteQuestionList',
      query,
      variables: {
        favoriteSlug,
        filtersV2: {
          acceptanceFilter: {},
          companyFilter: {
            companySlugs: [],
            operator: 'IS'
          },
          difficultyFilter: {
            difficulties: [],
            operator: 'IS'
          },
          filterCombineType: 'ALL',
          frequencyFilter: {},
          languageFilter: {
            languageSlugs: [],
            operator: 'IS'
          },
          lastSubmittedFilter: {},
          positionFilter: {
            operator: 'IS',
            positionSlugs: []
          },
          premiumFilter: {
            operator: 'IS',
            premiumStatus: []
          },
          publishedFilter: {},
          statusFilter: {
            operator: 'IS',
            questionStatuses: []
          },
          topicFilter: {
            operator: 'IS',
            topicSlugs: []
          }
        },
        limit: 1,
        searchKeyword: '',
        skip: 0,
        sortBy: {
          sortField: 'CUSTOM',
          sortOrder: 'ASCENDING'
        }
      }
    };

    const response =
      await fetch('https://leetcode.com/graphql', {
        method: 'post',
        headers:
          { 'content-type': 'application/json', 'x-csrftoken': csrftoken },
        body: JSON.stringify(value)
      });

    const json = await response.json();

    return json.data.favoriteQuestionList.totalLength;
  }

  const compareFunction =
    (company1, company2) => {
      for (const period of ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all']) {
        const obj1 = company1[period];
        const obj2 = company2[period];

        if (obj1 !== undefined && obj2 !== undefined) {
          const value1 = obj1.value;
          const value2 = obj2.value;

          if (value1 !== undefined && value2 !== undefined) {
            const diff = value2 - value1;

            if (diff !== 0) {
              return diff;
            }
          }
        }
      }

      return 0;
    }

  const sendUpdate = () => {
    const message = Object.values(companies);
    message.sort(compareFunction);
    chrome.runtime.sendMessage(message);
  };

  let calls = 0;
  let successes = 0;

  async function updateProblemCounts(company, period, nextDelaySeconds) {
    try {
      companies[company][period] = { value: await getQuestionCount(company, period) };

      successes++;

      sendUpdate();
    } catch (ignore) {
      console.log(`Failed to fetch counts for ${company}, ${period}; retrying ...`);
      scheduleRetry(company, period, nextDelaySeconds);
    }

    calls++;

    console.log('');
    console.log('calls:', calls);
    console.log('successes:', successes);
    console.log('success ratio: ', successes / calls);
  }

  function scheduleRetry(company, period, delaySeconds) {
    // Jitter ±20% so the many parallel retries don't fire in lockstep.
    const jitteredDelay = delaySeconds * (0.8 + 0.4 * Math.random());
    const nextDelay = Math.min(2 * delaySeconds, MAX_DELAY_SECONDS);

    companies[company][period] = { retryAt: Date.now() + jitteredDelay * 1000 };

    sendUpdate();

    setTimeout(() => updateProblemCounts(company, period, nextDelay), jitteredDelay * 1000);
  }

  sendUpdate();

  const tasks = [];
  for (const company of Object.keys(companies)) {
    for (const period of ['thirty-days', 'three-months', 'six-months', 'more-than-six-months']) {
      tasks.push([company, period]);
    }
  }

  // Drain the initial fan-out through a fixed-size pool so we don't fire
  // hundreds of requests at once. Retries are scheduled separately (and are
  // jittered/capped), so they stay outside the pool.
  let nextTask = 0;
  const worker = async () => {
    while (nextTask < tasks.length) {
      const [company, period] = tasks[nextTask++];
      await updateProblemCounts(company, period, BASE_DELAY_SECONDS);
    }
  };

  for (let i = 0; i < CONCURRENCY; i++) {
    worker();
  }
})();