const axios = require('axios');

const internals = {};

internals.developmentDeploySeleniumStandalones = async (dTOItems) => {
  // Todo: Put timeout in config
  const timeout = 3000;
  const numberOfRequestedStandalones = dTOItems.length;
  if (numberOfRequestedStandalones < 1 || numberOfRequestedStandalones > 12) throw new Error(`The number of selenium nodes requested was: ${numberOfRequestedStandalones}. The supported number of testSessions is from 1-12`);

  const http = axios.create({ timeout /* default is 0 (no timeout) */, baseURL: 'http://docker-compose-ui:5000/api/v1', headers: { 'Content-type': 'application/json' } });

  const browserCounts = dTOItems.map(cV => cV.browser).reduce((accumulator, currentValue) => {
    accumulator[currentValue] = 1 + (accumulator[currentValue] || 0);
    return accumulator;
  }, {});

  const promisedResponses = Object.keys(browserCounts).map(b => http.put('/services', { service: b, project: 'selenium-standalone', num: browserCounts[b] }));
  await Promise.all(promisedResponses)
    .catch((e) => {
      if (e.message === `timeout of ${timeout}ms exceeded`) throw new Error('timeout exceeded');
      throw e;
    });

  const numberOfSeleniumStandaloneServiceNamesToAdd = { ...browserCounts };
  const runningCountOfSeleniumStandaloneServiceNamesLeftToAdd = { ...browserCounts };

  return dTOItems.map((cV) => {
    const itemClone = { ...cV };
    const browserNumber = numberOfSeleniumStandaloneServiceNamesToAdd[itemClone.browser]
      - (runningCountOfSeleniumStandaloneServiceNamesLeftToAdd[itemClone.browser] - 1);
    runningCountOfSeleniumStandaloneServiceNamesLeftToAdd[itemClone.browser] -= 1;
    itemClone.seleniumContainerName = `seleniumstandalone_${itemClone.browser}_${browserNumber}`;
    return itemClone;
  });
};

internals.productionDeploySeleniumStandalones = async () => {
  throw new Error('Not Implemented');
  // Todo: KC: Deploy ECS Task
};

exports.provisionSeleniumStandalones = async (event, context) => { // eslint-disable-line no-unused-vars
  const env = process.env.NODE_ENV;
  const { provisionViaLambdaDto: { items } } = event;
  let result;
  try {
    result = await internals[`${env}DeploySeleniumStandalones`](items);
  } catch (e) {
    if (e.message === 'timeout exceeded') result = 'Timeout exceeded: Selenium Standalone container(s) took too long to start.';
  }

  const response = {
    // 'statusCode': 200,
    body: { provisionViaLambdaDto: { items: result } }
  };

  return response;
};
