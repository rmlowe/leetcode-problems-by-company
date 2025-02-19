(() => {
  // For old version
  const companiesFromOldVersion = Object.fromEntries(
    [...document.querySelectorAll('.lg-company,.sm-company')].map(a => [a.href.split('/')[4], {
      'display-name': a.querySelector('.text-gray').textContent.trim(),
      'all': parseInt(a.querySelector('.badge').textContent, 10),
    }]));
  console.log(companiesFromOldVersion);

  // For new version
  const companiesFromNewVersion = Object.fromEntries(
    [...document.querySelectorAll('.swiper-slide a.mb-4')].map(a => [a.href.split('/')[4], {
      'display-name': a.querySelector('span span:first-child').textContent,
      'all': parseInt(a.querySelector('span span:last-child').textContent, 10)
    }]));
  console.log(companiesFromNewVersion);

  const allCompanies = { ...companiesFromOldVersion, ...companiesFromNewVersion };
  const companies = Object.fromEntries(Object.entries(allCompanies).slice(0, 500))
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
        questions {
          difficulty
          id
          paidOnly
          questionFrontendId
          status
          title
          titleSlug
          translatedTitle
          isInMyFavorites
          frequency
          acRate
          topicTags {
            name
            nameTranslated
            slug
          }
        }
        totalLength
        hasMore
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
        limit: 100,
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

  const periods = ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all']

  const compareFunction =
    (company1, company2) => {
      for (const period of periods) {
        const value1 = company1[period];
        const value2 = company2[period];

        if (value1 !== undefined && value2 !== undefined) {
          const diff = value2 - value1;

          if (diff !== 0) {
            return diff;
          }
        }
      }

      return 0;
    }

  const sendUpdate = () => {
    console.log(companies);

    const message = Object.values(companies);
    message.sort(compareFunction);
    chrome.runtime.sendMessage(message);
  };

  let calls = 0;
  let successes = 0;

  async function updateProblemCounts(company, period) {
    try {
      companies[company][period] = await getQuestionCount(company, period)

      successes++;

      sendUpdate();
    } catch (ignore) {
      console.log(`Failed to fetch counts for ${company}, ${period}; retrying ...`);
      updateProblemCounts(company, period);
    }

    calls++;

    console.log('');
    console.log('calls:', calls);
    console.log('successes:', successes);
    console.log('success ratio: ', successes / calls);
  }

  sendUpdate();

  for (const company of Object.keys(companies)) {
    for (const period of periods) {
      updateProblemCounts(company, period);
    }
  }
})();