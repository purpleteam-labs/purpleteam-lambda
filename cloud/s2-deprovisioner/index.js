// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html
const ECS = require('aws-sdk/clients/ecs'); // eslint-disable-line import/no-unresolved

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
  const ecs = new ECS({ region: process.env.AWS_REGION });

  const promisedResponses = ecsServiceNames.map((sN) => ecs.deleteService({
    cluster: customerClusterArn,
    service: sN,
    force: true
  }).promise());
  const resolved = await promiseAllTimeout(promisedResponses, s2ProvisioningTimeout);

  console.info(`These are the values returned from ecs.deleteService: ${JSON.stringify(resolved)}`);

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
