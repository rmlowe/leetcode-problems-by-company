(() => {
  const companies = {};

  // For old version
  for (const a of document.querySelectorAll('.lg-company,.sm-company')) {
    companies[a.href.split('/')[4]] = {
      Company: a.querySelector('.text-gray').textContent.trim(),
      'All time': parseInt(a.querySelector('.badge').textContent, 10)
    };
  }

  // // For new version
  // for (const a of document.querySelectorAll('.swiper-slide a.mb-4')) {
  //   companies[a.href.split('/')[4]] = {};
  // }

  // console.log(companies);

  const csrftoken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken'))
    .split('=')[1];

  const query = `query getCompanyTag($slug: String!) {
  companyTag(slug: $slug) {
    name
    translatedName
    frequencies
    questions {
      ...questionFields
      __typename
    }
    __typename
  }
  favoritesLists {
    publicFavorites {
      ...favoriteFields
      __typename
    }
    privateFavorites {
      ...favoriteFields
      __typename
    }
    __typename
  }
}

fragment favoriteFields on FavoriteNode {
  idHash
  id
  name
  isPublicFavorite
  viewCount
  creator
  isWatched
  questions {
    questionId
    title
    titleSlug
    __typename
  }
  __typename
}

fragment questionFields on QuestionNode {
  status
  questionId
  questionFrontendId
  title
  titleSlug
  translatedTitle
  stats
  difficulty
  isPaidOnly
  topicTags {
    name
    translatedName
    slug
    __typename
  }
  frequencyTimePeriod
  __typename
}
`;

  const compareFunction = (c1, c2) => {
    for (const key of ['6 months', '1 year', '2 years', 'All time']) {
      const v1 = c1[key];
      const v2 = c2[key];

      if (v1 !== undefined && v2 !== undefined) {
        const diff = v2 - v1;

        if (diff !== 0) {
          return diff;
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

  async function updateProblemCounts(slug) {
    const value = {
      operationName: 'getCompanyTag',
      query,
      variables: {
        slug
      }
    };

    const { data } = await fetch('https://leetcode.com/graphql', {
      method: 'post',
      headers: {
        "content-type": "application/json",
        "x-csrftoken": csrftoken
      },
      body: JSON.stringify(value)
    })
      .then(response => response.json());

    const questionCountByFrequencyTimePeriod = frequencyTimePeriod =>
      data.companyTag.questions.filter(question => question.frequencyTimePeriod <= frequencyTimePeriod).length;

    companies[slug] = {
      Company: data.companyTag.name,
      '6 months': questionCountByFrequencyTimePeriod(1),
      '1 year': questionCountByFrequencyTimePeriod(2),
      '2 years': questionCountByFrequencyTimePeriod(3),
      'All time': questionCountByFrequencyTimePeriod(4)
    };

    sendUpdate();
  }

  sendUpdate();

  for (const slug of Object.keys(companies)) {
    updateProblemCounts(slug);
  }
})();