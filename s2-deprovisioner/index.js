const axios = require('axios');

const internals = {};

internals.internalTimeout = () => (internals.lambdaTimeout - 2) * 1000;

internals.developmentDownContainers = async (dTOItems) => {
  const timeout = internals.internalTimeout();

  const http = axios.create({ timeout /* default is 0 (no timeout) */, baseURL: 'http://docker-compose-ui:5000/api/v1', headers: { 'Content-type': 'application/json' } });

  const promisedResponses = ['app-slave', 'selenium-standalone'].map(c => http.post('/down', { id: c }));
  await Promise.all(promisedResponses)
    .catch((e) => {
      if (e.message === `timeout of ${timeout}ms exceeded`) throw new Error('timeout exceeded');
      throw e;
    });

  return 'Stage Two containers have been brought down.';
};

internals.productionDownContainers = async () => {
  throw new Error('Not Implemented');
  // Todo: KC: Deploy ECS Task
};

exports.deprovisionS2Containers = async (event, context) => { // eslint-disable-line no-unused-vars
  const env = process.env.NODE_ENV;
  internals.lambdaTimeout = process.env.LAMBDA_TIMEOUT;
  // const { provisionViaLambdaDto: { items } } = event;
  let result;
  try {
    result = await internals[`${env}DownContainers`](items);
  } catch (e) {
    if (e.message === 'timeout exceeded') result = 'Timeout exceeded: Stage Two container(s) took too long to bring down.';
  }

  const response = {
    // 'statusCode': 200,
    body: { provisionViaLambdaDto: { items: result } }
  };

  return response;
};
