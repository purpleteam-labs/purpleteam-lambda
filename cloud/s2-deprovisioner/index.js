// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html
const ECS = require('aws-sdk/clients/ecs');

const internals = {};

internals.internalTimeout = () => (internals.lambdaTimeout - 2) * 1000;

internals.downContainers = async (ecsServiceNames, { clientContext: { Custom: { /* customer, */ customerClusterArn } } }) => {
  const timeout = internals.internalTimeout();
  const ecs = new ECS({ region: process.env.AWS_REGION });

  const promisedResponses = ecsServiceNames.map(sN => ecs.deleteService({
    cluster: customerClusterArn,
    service: sN,
    force: true
  }).promise());
  console.info(`promisedResponses: ${JSON.stringify(promisedResponses)}`);

  await Promise.all(promisedResponses)
    .then((values) => {
      console.info(`These are the values returned from ecs.deleteService: ${JSON.stringify(values)}`);
    }).catch((e) => {
      console.error(`This is the exception: ${e}`);
      if (e.message === `timeout of ${timeout}ms exceeded`) throw new Error('timeout exceeded');
      throw e;
    });

  const returnValue = `Stage Two ECS services (${JSON.stringify(ecsServiceNames)}) have been brought down.`;
  console.info(returnValue);
  return returnValue;
};

exports.deprovisionS2Containers = async (event, context) => { // eslint-disable-line no-unused-vars
  internals.lambdaTimeout = process.env.LAMBDA_TIMEOUT;
  console.info(`The event is: ${JSON.stringify(event)}`);
  console.info(`The context is: ${JSON.stringify(context)}`);
  const { deprovisionViaLambdaDto: { items: ecsServiceNames } } = event;
  let result;
  try {
    result = await internals.downContainers(ecsServiceNames, context);
  } catch (e) {
    if (e.message === 'timeout exceeded') result = `Timeout exceeded: ${ecsServiceNames} ECS service(s) took too long to bring down.`;
  }

  const response = {
    // 'statusCode': 200,
    body: { deprovisionedViaLambdaDto: { items: result } }
  };

  return response;
};
