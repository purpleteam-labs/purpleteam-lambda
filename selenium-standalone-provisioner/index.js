const axios = require('axios');
const internals = {};

internals.seleniumHubServiceName = 'selenium-hub';

internals.developmentDeploySeleniumStandalones = async (dTOItems) => {
  const numberOfRequestedStandalones = dTOItems.length;
  if (numberOfRequestedStandalones < 1 || numberOfRequestedStandalones > 12) throw new Error(`The number of selenium nodes requested was: ${numberOfRequestedStandalones}. The supported number of testSessions is from 1-12`);

  const http = axios.create({baseURL: 'http://docker-compose-ui:5000/api/v1', headers: {'Content-type': 'application/json'}});


  // dTOItems is an array of objects, each object containing:
  // testSessionId
  // browser
  // appSlaveContainerName
  // seleniumContainerName

  const browsers = dTOItems.map(i => i.browser);

/*
  const browserCounts = {};
  for (let i = 0; i < dTOItems.length; i += 1) {
    browserCounts[dTOItems[i]] = 1 + (browserCounts[dTOItems[i]] || 0);
  }
*/
  // [{browser}, {}, {}]
  // const browsers = ['chrome', 'firefox', 'chrome', 'chrome'];
  const reducer = (accumulator, currentValue) => {
    accumulator[currentValue] = 1 + (accumulator[currentValue] || 0);
    return accumulator;
  };
  const browserCounts = browsers.reduce(reducer, {})



  const promisedResponses = Object.keys(browserCounts).map(b => http.put('/services', {service: b, project: 'selenium-standalone', num: browserCounts[b]}));

  await Promise.all(promisedResponses);

  // const containers = await http.get('/projects/selenium-standalone');
  // const seleniumStandaloneServiceNames = containers.data.containers.map(c => c.name);

  const numberOfSeleniumStandaloneServiceNamesToAdd = { ...browserCounts };
  const runningCountOfSeleniumStandaloneServiceNamesLeftToAdd = { ...browserCounts };
  //const uniqueBrowsers = Ojbect.keys(browserCounts);
  //const runningCountOfSeleniumStandaloneServiceNamesLeftToAdd = uniqueBrowsers.reduce((accum, curr) => { accum[curr] = 0})
  

  const dTOItemsToReturn = dTOItems.map(i => {
    const itemClone = { ...i };

    // 3 - (3 - 1) = 1
    // 3 - (2 - 1) = 2

    
    const browserNumber = numberOfSeleniumStandaloneServiceNamesToAdd[itemClone.browser] - (runningCountOfSeleniumStandaloneServiceNamesLeftToAdd[itemClone.browser] - 1)
    runningCountOfSeleniumStandaloneServiceNamesLeftToAdd[itemClone.browser] -= 1
    itemClone.seleniumContainerName = `seleniumstandalone_${itemClone.browser}_${browserNumber}`
    return itemClone;

  })

  return dTOItemsToReturn;

};

internals.productionDeploySeleniumStandalones = async (event) => {
  throw new Error('Not Implemented');
  // Todo: KC: Deploy ECS Task
};

exports.provisionSeleniumStandalones = async (event, context) => {
  const env = process.env.NODE_ENV;
  const { seleniumHubServiceName } = internals;
  const { provisionViaLambdaDto: { items } } = event;
  //const response = {};
  //try {
    const result = await internals[`${env}DeploySeleniumStandalones`](items);

  //} catch (error) {
  //  return { body: error };
  //}
  const response = {
    //'statusCode': 200,
    body: { provisionViaLambdaDto: {items: result} }
  };

  return response
};
