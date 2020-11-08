const slugs = Array.from(document.querySelectorAll('.lg-company,.sm-company')).map(a => a.href.split('/')[4]);

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

async function getProblemCounts(slug) {
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

    return {
        companyName: data.companyTag.name, counts: {
            '6 months': questionCountByFrequencyTimePeriod(1),
            '1 year': questionCountByFrequencyTimePeriod(2),
            '2 years': questionCountByFrequencyTimePeriod(3),
            'All time': questionCountByFrequencyTimePeriod(4)
        }
    };
}

async function getData(end) {
    const data = await Promise.all(slugs.slice(0, 10).map(getProblemCounts));
    const lines = data.map(company =>
        `${company.companyName},${company.counts['6 months']},${company.counts['1 year']},${company.counts['2 years']},${company.counts['All time']}`);
    return ['Company,6 months,1 year,2 years,All time', ...lines].join('\r\n');
}

getData(10).then(result => console.log(result));
