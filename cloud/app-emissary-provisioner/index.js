// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ecs/index.html
const { ECSClient, CreateServiceCommand } = require('@aws-sdk/client-ecs');

const internals = {};

internals.printEnv = () => {
  console.log('Environment Variables of interest follow.\nS2_PROVISIONING_TIMEOUT should be 2 seconds less than Lambda "Timeout": ', {
    NODE_ENV: process.env.NODE_ENV,
    S2_PROVISIONING_TIMEOUT: process.env.S2_PROVISIONING_TIMEOUT,
    AWS_REGION: process.env.AWS_REGION
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


internals.deployEmissaries = async (dTOItems, {
  invokedFunctionArn, clientContext: {
    Custom: {
      customer,
      customerClusterArn,
      serviceDiscoveryServices
    }
  }
}) => {
  const { promiseAllTimeout, s2ProvisioningTimeout } = internals;
  const result = { items: undefined, error: undefined };
  // Doc: [Lambda Environment Variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)
  console.info(`provisionAppEmissaries invoked for pt customer: ${customer}.`);
  console.info(`The customerClusterArn is: ${customerClusterArn}`);
  console.info(`The Account Id is: ${invokedFunctionArn.split(':')[4]}`);
  console.info(`The serviceDiscoveryServices are ${JSON.stringify(serviceDiscoveryServices)}`);
  const accountId = invokedFunctionArn.split(':')[4];
  // Use this command to view the actual Arns: aws servicediscovery list-services | jq '.Services[].Arn'
  const serviceDiscoveryServiceArnPrefix = `arn:aws:servicediscovery:${process.env.AWS_REGION}:${accountId}:service/`;
  console.info(`The value of dTOItems is: ${JSON.stringify(dTOItems)}`);

  if (dTOItems.length < 1 || dTOItems.length > 12) throw new Error(`The number of items requested was: ${dTOItems.length}. The supported number of Test Sessions is from 1-12 inclusive.`);

  const ecsClient = new ECSClient({ region: process.env.AWS_REGION });

  const browserCounts = dTOItems.map((cV) => cV.browser).reduce((accumulator, currentValue) => {
    accumulator[currentValue] = 1 + (accumulator[currentValue] || 0);
    return accumulator;
  }, {});
  console.info(`The value of browserCounts is: ${JSON.stringify(browserCounts)}`);

  const numberOfBrowsersToAdd = { ...browserCounts };
  const runningCountOfBrowsersLeftToAdd = { ...browserCounts };

  const itemsWithExtras = dTOItems.map((cV) => {
    const itemClone = { ...cV };
    const browserNumber = numberOfBrowsersToAdd[itemClone.browser] - (runningCountOfBrowsersLeftToAdd[itemClone.browser] - 1);
    runningCountOfBrowsersLeftToAdd[itemClone.browser] -= 1;
    itemClone.appEmissaryContainerName = `appemissary-zap-${itemClone.browser}-${browserNumber}`;
    itemClone.appEmissaryTaskDefinition = `s2_app_emissary_zap_${itemClone.browser}_${browserNumber}_${customer}`;
    itemClone.appEcsServiceName = `s2_app_emissary_zap_${itemClone.browser}_${browserNumber}_${customer}`;
    itemClone.appServiceDiscoveryServiceArn = `${serviceDiscoveryServiceArnPrefix}${serviceDiscoveryServices[`s2_app_emissary_zap_${itemClone.browser}_${browserNumber}`]}`;
    itemClone.seleniumContainerName = `seleniumstandalone-${itemClone.browser}-${browserNumber}`;
    itemClone.seleniumTaskDefinition = `s2_app_emissary_selenium_${itemClone.browser}_${browserNumber}_${customer}`;
    itemClone.seleniumEcsServiceName = `s2_app_emissary_selenium_${itemClone.browser}_${browserNumber}_${customer}`;
    itemClone.seleniumServiceDiscoveryServiceArn = `${serviceDiscoveryServiceArnPrefix}${serviceDiscoveryServices[`s2_app_emissary_selenium_${itemClone.browser}_${browserNumber}`]}`;
    return itemClone;
  });
  console.info(`The value of itemsWithExtras is: ${JSON.stringify(itemsWithExtras)}`);
  const appItemsWithExtras = itemsWithExtras.map((item) => ({
    containerName: item.appEmissaryContainerName,
    taskDefinition: item.appEmissaryTaskDefinition,
    ecsServiceName: item.appEcsServiceName,
    serviceDiscoveryServiceArn: item.appServiceDiscoveryServiceArn,
    containerPort: 8080
  }));
  const seleniumItemsWithExtras = itemsWithExtras.map((item) => ({
    containerName: item.seleniumContainerName,
    taskDefinition: item.seleniumTaskDefinition,
    ecsServiceName: item.seleniumEcsServiceName,
    serviceDiscoveryServiceArn: item.seleniumServiceDiscoveryServiceArn,
    containerPort: 4444
  }));
  const splitItemsWithExtras = [...appItemsWithExtras, ...seleniumItemsWithExtras];
  console.info(`The value of splitItemsWithExtras is: ${JSON.stringify(splitItemsWithExtras)}`);

  const createServiceCommands = splitItemsWithExtras.map((cV) => new CreateServiceCommand({
    cluster: customerClusterArn,
    serviceName: cV.ecsServiceName,
    taskDefinition: cV.taskDefinition,
    // clientToken: '123abc', // Todo: Need to find out when this should be used.
    desiredCount: 1,
    serviceRegistries: [{
      containerName: cV.containerName,
      containerPort: cV.containerPort,
      // port: 'NUMBER_VALUE',
      registryArn: cV.serviceDiscoveryServiceArn
    }]
  }));
  const promisedResponses = createServiceCommands.map((c) => ecsClient.send(c));

  try {
    const resolved = await promiseAllTimeout(promisedResponses, s2ProvisioningTimeout);
    console.info(`The data objects returned from calling ECS createServiceCommand were: ${JSON.stringify(resolved)}`);
    resolved.every((e) => !e) && (result.error = 'Timeout exceeded: App Emissary container(s) took too long to start. Although they timed out, they may have still started.');
  } catch (e) {
    console.error('Exception occurred, details follow:');
    console.error(e);
    // If we find more errors from ecs, add them here, along with handling in the resolvePromises routine of app.parallel.js
    console.error(e.message);
    const knownErrors = [
      'Creation of service was not idempotent.',
      'Unable to Start a service that is still Draining.'
    ];
    result.error = knownErrors.includes(e.message) ? e.message : 'Unexpected error in Lambda occurred';
  }

  result.items = itemsWithExtras.map((testSession) => {
    const { appEmissaryTaskDefinition, seleniumTaskDefinition, ...itemsForConsumer } = testSession;
    return itemsForConsumer;
  });

  return result;
};

// Doc: context: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
exports.provisionAppEmissaries = async (event, context) => {
  internals.s2ProvisioningTimeout = process.env.S2_PROVISIONING_TIMEOUT * 1000;
  const { provisionViaLambdaDto: { items } } = event;
  const { deployEmissaries, printEnv } = internals;
  printEnv();
  const result = await deployEmissaries(items, context);

  console.info(`The resulting items were: ${JSON.stringify(result.items)}`);

  const response = {
    // 'statusCode': 200,
    body: { provisionedViaLambdaDto: result }
  };

  return response;
};
