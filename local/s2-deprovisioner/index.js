const axios = require('axios');

const internals = {};

internals.printEnv = () => {
  console.log('Environment Variables of interest follow.\nS2_PROVISIONING_TIMEOUT should be 2 seconds less than AWS_LAMBDA_FUNCTION_TIMEOUT: ', {
    NODE_ENV: process.env.NODE_ENV,
    S2_PROVISIONING_TIMEOUT: process.env.S2_PROVISIONING_TIMEOUT,
    AWS_LAMBDA_FUNCTION_TIMEOUT: process.env.AWS_LAMBDA_FUNCTION_TIMEOUT // Only used in local.
  });
};


internals.promiseAllTimeout = async (promises, timeout, resolvePartial = true) => new Promise(((resolve, reject) => {
  const results = [];
  let finished = 0;
  const numPromises = promises.length;
  let onFinish = () => {
    if (finished < numPromises) {
      if (resolvePartial) {
        (resolve)(results);
      } else {
        throw new Error('Not all promises completed within the specified time');
      }
    } else {
      (resolve)(results);
    }
    onFinish = null;
  };

  const fulfilAPromise = (i) => {
    promises[i].then(
      (res) => {
        results[i] = res;
        finished += 1;
        if (finished === numPromises && onFinish) {
          onFinish();
        }
      },
      reject
    );
  };

  for (let i = 0; i < numPromises; i += 1) {
    results[i] = undefined;
    fulfilAPromise(i);
  }

  setTimeout(() => { if (onFinish) onFinish(); }, timeout);
}));


internals.downContainers = async (containerNames) => {
  const { promiseAllTimeout, s2ProvisioningTimeout } = internals;
  const http = axios.create({ /* default is 0 (no timeout) */ baseURL: 'http://docker-compose-ui:5000/api/v1', headers: { 'Content-type': 'application/json' } });
  const s2ProjectNames = [...containerNames];

  const promisedResponses = s2ProjectNames.map(pN => http.post('/down', { id: pN }));
  const resolved = await promiseAllTimeout(promisedResponses, s2ProvisioningTimeout);

  return resolved.every(e => !!e)
    ? { item: `Stage Two projects (${s2ProjectNames}) have been brought down.` }
    : { error: `Timeout exceeded while attempting to bring the Stage Two projects (${s2ProjectNames}) down. One or more may still be running.` };
};

exports.deprovisionS2Containers = async (event, context) => { // eslint-disable-line no-unused-vars
  internals.s2ProvisioningTimeout = process.env.S2_PROVISIONING_TIMEOUT * 1000;
  const { deprovisionViaLambdaDto: { items: containerNames } } = event;
  const { downContainers, printEnv } = internals;
  printEnv();
  const result = await downContainers(containerNames);

  const response = {
    // 'statusCode': 200,
    body: { deprovisionedViaLambdaDto: result }
  };

  return response;
};
