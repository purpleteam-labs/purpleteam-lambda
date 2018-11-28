const axios = require('axios');
const internals = {};

internals.seleniumHubServiceName = 'selenium-hub';

internals.developmentDeploySeleniumHubAndNodes = async (seleniumNodes) => {
  const numberOfRequestedNodes = seleniumNodes.length;
  if (numberOfRequestedNodes < 1 || numberOfRequestedNodes > 12) throw new Error(`The number of selenium nodes requested was: ${numberOfRequestedNodes}. The supported number of testSessions is from 1-12`);

  const http = axios.create({baseURL: 'http://docker-compose-ui:5000/api/v1', headers: {'Content-type': 'application/json'}});


  const responseForHub = await http.put('/services', {service: internals.seleniumHubServiceName, project: 'selenium-hub-nodes', num: 1});

  const browserCounts = {};
  for (var i = 0; i < seleniumNodes.length; i += 1) {
    browserCounts[seleniumNodes[i]] = 1 + (browserCounts[seleniumNodes[i]] || 0);
  }    

  const promisedResponses = Object.keys(browserCounts).map(b => http.put('/services', {service: b, project: 'selenium-hub-nodes', num: browserCounts[b]}));
  let successful;
  await Promise.all(promisedResponses).then((responses) => {
    successful = responseForHub.status === 200 && responses.every(e => e.status === 200);
  });
  return successful;
};

internals.productionDeploySeleniumHubAndNodes = async (event) => {
  throw new Error('Not Implemented');
  // Todo: KC: Deploy ECS Task
};

exports.provisionSeleniumHubNodes = async (event, context) => {
  const env = process.env.NODE_ENV;
  const { seleniumHubServiceName } = internals;
  //const response = {};
  //try {
    const result = await internals[`${env}DeploySeleniumHubAndNodes`](event);

  //} catch (error) {
  //  return { body: error };
  //}
  const response = {
    //'statusCode': 200,
    body: { seleniumHubServiceName, requestedSeleniumHubAndNodesWereProvisioned: result }
  };

  return response
};
