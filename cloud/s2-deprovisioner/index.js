// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ecs/index.html
const { ECSClient, DeleteServiceCommand } = require('@aws-sdk/client-ecs');

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


internals.downContainers = async (ecsServiceNames, { clientContext: { Custom: { /* customer, */ customerClusterArn } } }) => {
  const { promiseAllTimeout, s2ProvisioningTimeout } = internals;
  const ecsClient = new ECSClient({ region: process.env.AWS_REGION });
  const deleteServiceCommands = ecsServiceNames.map((sN) => new DeleteServiceCommand({ cluster: customerClusterArn, service: sN, force: true }));
  const promisedResponses = deleteServiceCommands.map((c) => ecsClient.send(c));
  const resolved = await promiseAllTimeout(promisedResponses, s2ProvisioningTimeout);
  console.info(`These are the values returned from the ECS deleteServiceCommand: ${JSON.stringify(resolved)}`);

  return resolved.every((e) => !!e)
    ? { item: `Stage Two ECS services (${JSON.stringify(ecsServiceNames)}) have been brought down.` }
    : { error: `Timeout exceeded while attempting to bring the ECS service(s) (${ecsServiceNames}) down. One or more may still be running.` };
};

exports.deprovisionS2Containers = async (event, context) => { // eslint-disable-line no-unused-vars
  internals.s2ProvisioningTimeout = process.env.S2_PROVISIONING_TIMEOUT * 1000;
  const { deprovisionViaLambdaDto: { items: ecsServiceNames } } = event;
  const { downContainers, printEnv } = internals;
  console.info(`The event is: ${JSON.stringify(event)}`);
  console.info(`The context is: ${JSON.stringify(context)}`);
  printEnv();
  const result = await downContainers(ecsServiceNames, context);

  const response = {
    // 'statusCode': 200,
    body: { deprovisionedViaLambdaDto: result }
  };

  return response;
};
