// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

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


internals.deployEmissaries = async (dTOItems) => {
  const { promiseAllTimeout, s2ProvisioningTimeout } = internals;
  const numberOfRequestedEmissaries = dTOItems.length;
  const result = { items: undefined, error: undefined };

  if (numberOfRequestedEmissaries < 1 || numberOfRequestedEmissaries > 12) throw new Error(`The number of app-emissaries requested was: ${numberOfRequestedEmissaries}. The supported number of Test Sessions is from 1-12 inclusive.`);

  // timeout in axios is for response times only, if the end-point is down, it will still take a long time. So we just wrap the actual request.
  const http = axios.create({ /* default is 0 (no timeout) */ baseURL: 'http://docker-compose-ui:5000/api/v1', headers: { 'Content-type': 'application/json' } });

  const promisedResponse = http.put('/services', { service: 'zap', project: 'app-emissary', num: numberOfRequestedEmissaries });
  const resolved = await promiseAllTimeout([promisedResponse], s2ProvisioningTimeout);

  !resolved[0] && (result.error = 'Timeout exceeded: App Emissary container(s) took too long to start. Although they timed out, they may have still started. Also check that docker-compose-ui is up.');

  result.items = dTOItems.map((cV, i) => {
    const itemClone = { ...cV };
    itemClone.appEmissaryContainerName = `appemissary_zap_${i + 1}`;
    return itemClone;
  });

  return result;
};

exports.provisionAppEmissaries = async (event, context) => { // eslint-disable-line no-unused-vars
  internals.s2ProvisioningTimeout = process.env.S2_PROVISIONING_TIMEOUT * 1000;
  const { provisionViaLambdaDto: { items } } = event;
  const { deployEmissaries, printEnv } = internals;
  printEnv();
  const result = await deployEmissaries(items);

  const response = {
    // 'statusCode': 200,
    body: { provisionedViaLambdaDto: result }
  };

  return response;
};
