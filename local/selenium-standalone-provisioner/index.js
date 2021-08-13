// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of PurpleTeam.

// PurpleTeam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// PurpleTeam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with PurpleTeam. If not, see <https://www.gnu.org/licenses/>.

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


internals.deploySeleniumStandalones = async (dTOItems) => {
  const { promiseAllTimeout, s2ProvisioningTimeout } = internals;
  const numberOfRequestedStandalones = dTOItems.length;
  const result = { items: undefined, error: undefined };

  if (numberOfRequestedStandalones < 1 || numberOfRequestedStandalones > 12) throw new Error(`The number of selenium nodes requested was: ${numberOfRequestedStandalones}. The supported number of Test Sessions is from 1-12 inclusive.`);

  const http = axios.create({ /* default is 0 (no timeout) */ baseURL: 'http://docker-compose-ui:5000/api/v1', headers: { 'Content-type': 'application/json' } });

  const browserCounts = dTOItems.map((cV) => cV.browser).reduce((accumulator, currentValue) => {
    accumulator[currentValue] = 1 + (accumulator[currentValue] || 0);
    return accumulator;
  }, {});

  const promisedResponses = Object.keys(browserCounts).map((b) => http.put('/services', { service: b, project: 'selenium-standalone', num: browserCounts[b] }));
  const resolved = await promiseAllTimeout(promisedResponses, s2ProvisioningTimeout);

  resolved.every((e) => !e) && (result.error = 'Timeout exceeded: Selenium Standalone container(s) took too long to start. Although they timed out, they may have still started. Also check that docker-compose-ui is up.');

  const numberOfSeleniumStandaloneServiceNamesToAdd = { ...browserCounts };
  const runningCountOfSeleniumStandaloneServiceNamesLeftToAdd = { ...browserCounts };

  result.items = dTOItems.map((cV) => {
    const itemClone = { ...cV };
    const browserNumber = numberOfSeleniumStandaloneServiceNamesToAdd[itemClone.browser]
      - (runningCountOfSeleniumStandaloneServiceNamesLeftToAdd[itemClone.browser] - 1);
    runningCountOfSeleniumStandaloneServiceNamesLeftToAdd[itemClone.browser] -= 1;
    itemClone.seleniumContainerName = `seleniumstandalone_${itemClone.browser}_${browserNumber}`;
    return itemClone;
  });

  return result;
};


exports.provisionSeleniumStandalones = async (event, context) => { // eslint-disable-line no-unused-vars
  internals.s2ProvisioningTimeout = process.env.S2_PROVISIONING_TIMEOUT * 1000;
  const { provisionViaLambdaDto: { items } } = event;
  const { deploySeleniumStandalones, printEnv } = internals;
  printEnv();

  const result = await deploySeleniumStandalones(items);

  const response = {
    // 'statusCode': 200,
    body: { provisionedViaLambdaDto: result }
  };

  return response;
};
