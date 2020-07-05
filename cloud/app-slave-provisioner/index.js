// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html
const ECS = require('aws-sdk/clients/ecs');

const internals = {};

internals.internalTimeout = () => (internals.lambdaTimeout - 2) * 1000;

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @param {string} event.resource - Resource path.
 * @param {string} event.path - Path parameter.
 * @param {string} event.httpMethod - Incoming request's method name.
 * @param {Object} event.headers - Incoming request headers.
 * @param {Object} event.queryStringParameters - query string parameters.
 * @param {Object} event.pathParameters - path parameters.
 * @param {Object} event.stageVariables - Applicable stage variables.
 * @param {Object} event.requestContext - Request context, including authorizer-returned key-value pairs, requestId, sourceIp, etc.
 * @param {Object} event.body - A JSON string of the request payload.
 * @param {boolean} event.body.isBase64Encoded - A boolean flag to indicate if the applicable request payload is Base64-encode
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 * @param {string} context.logGroupName - Cloudwatch Log Group name
 * @param {string} context.logStreamName - Cloudwatch Log stream name.
 * @param {string} context.functionName - Lambda function name.
 * @param {string} context.memoryLimitInMB - Function memory.
 * @param {string} context.functionVersion - Function version identifier.
 * @param {function} context.getRemainingTimeInMillis - Time in milliseconds before function times out.
 * @param {string} context.awsRequestId - Lambda request ID.
 * @param {string} context.invokedFunctionArn - Function ARN.
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * @returns {boolean} object.isBase64Encoded - A boolean flag to indicate if the applicable payload is Base64-encode (binary support)
 * @returns {string} object.statusCode - HTTP Status Code to be returned to the client
 * @returns {Object} object.headers - HTTP Headers to be returned
 * @returns {Object} object.body - JSON Payload to be returned
 *
 */


internals.deploySlaves = async (dTOItems, {
  invokedFunctionArn, clientContext: {
    Custom: {
      customer,
      customerClusterArn,
      serviceDiscoveryServices
    }
  }
}) => {
  const timeout = internals.internalTimeout();
  // Doc: [Lambda Environment Variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)
  console.info(`provisionAppSlaves invoked for pt customer: ${customer}.`);
  console.info(`The customerClusterArn is: ${customerClusterArn}`);
  console.info(`We are running in region: ${process.env.AWS_REGION}`);
  console.info(`The internals.internalTimeout() is ${timeout}`);
  console.info(`The NODE_ENV is: ${process.env.NODE_ENV}`);
  console.info(`The Account Id is: ${invokedFunctionArn.split(':')[4]}`);
  console.info(`The serviceDiscoveryServices are ${JSON.stringify(serviceDiscoveryServices)}`);
  const accountId = invokedFunctionArn.split(':')[4];
  // Use this command to view the actual Arns: aws servicediscovery list-services | jq '.Services[].Arn'
  const serviceDiscoveryServiceArnPrefix = `arn:aws:servicediscovery:${process.env.AWS_REGION}:${accountId}:service/`;
  console.info(`The value of dTOItems is: ${JSON.stringify(dTOItems)}`);
  // [
  //   {
  //       "testSessionId": "lowPrivUser",
  //       "browser": "chrome",
  //       "appSlaveContainerName": null,
  //       "seleniumContainerName": null,
  //       "ecsServiceName": null,
  //       "taskDefinition": null
  //   },{
  //       "testSessionId": "adminUser",
  //       "browser": "chrome",
  //       "appSlaveContainerName": null,
  //       "seleniumContainerName": null,
  //       "ecsServiceName": null,
  //       "taskDefinition": null
  //   }
  // ]
  const ecs = new ECS({ region: process.env.AWS_REGION });
  // Todo: Add error handling around number of requested containers.

  const browserCounts = dTOItems.map(cV => cV.browser).reduce((accumulator, currentValue) => {
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
    itemClone.appSlaveContainerName = `appslave-zap-${itemClone.browser}-${browserNumber}`;
    itemClone.appSlaveTaskDefinition = `s2_app_slave_zap_${itemClone.browser}_${browserNumber}`;
    itemClone.appEcsServiceName = `s2_app_slave_zap_${itemClone.browser}_${browserNumber}_${customer}`;
    itemClone.appServiceDiscoveryServiceArn = `${serviceDiscoveryServiceArnPrefix}${serviceDiscoveryServices[`s2_app_slave_zap_${itemClone.browser}_${browserNumber}`]}`;
    itemClone.seleniumContainerName = `seleniumstandalone-${itemClone.browser}-${browserNumber}`;
    itemClone.seleniumTaskDefinition = `s2_app_slave_selenium_${itemClone.browser}_${browserNumber}`;
    itemClone.seleniumEcsServiceName = `s2_app_slave_selenium_${itemClone.browser}_${browserNumber}_${customer}`;
    itemClone.seleniumServiceDiscoveryServiceArn = `${serviceDiscoveryServiceArnPrefix}${serviceDiscoveryServices[`s2_app_slave_selenium_${itemClone.browser}_${browserNumber}`]}`;
    return itemClone;
  });
  console.info(`The value of itemsWithExtras is: ${JSON.stringify(itemsWithExtras)}`);
  const appItemsWithExtras = itemsWithExtras.map(item => ({
    containerName: item.appSlaveContainerName,
    taskDefinition: item.appSlaveTaskDefinition,
    ecsServiceName: item.appEcsServiceName,
    serviceDiscoveryServiceArn: item.appServiceDiscoveryServiceArn,
    containerPort: 8080
  }));
  const seleniumItemsWithExtras = itemsWithExtras.map(item => ({
    containerName: item.seleniumContainerName,
    taskDefinition: item.seleniumTaskDefinition,
    ecsServiceName: item.seleniumEcsServiceName,
    serviceDiscoveryServiceArn: item.seleniumServiceDiscoveryServiceArn,
    containerPort: 4444
  }));
  const splitItemsWithExtras = [...appItemsWithExtras, ...seleniumItemsWithExtras];
  console.info(`The value of splitItemsWithExtras is: ${JSON.stringify(splitItemsWithExtras)}`);

  const promisedResponses = splitItemsWithExtras.map(cV => ecs.createService({
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
  }).promise());

  await Promise.all(promisedResponses)
    .then((values) => {
      console.info(`The data objects returned from calling ecs.createService were: ${JSON.stringify(values)}`);
    }).catch((e) => {
      console.warn(`The exception follows: ${e}`);
      // Not sure what a timeout looks like in cloud yet.
      // if (e.message === `timeout of ${timeout}ms exceeded`) throw new Error('timeout exceeded');
      const errors = {
        'Creation of service was not idempotent.': new Error('Creation of service was not idempotent.'),
        default: new Error('defaultError')
      };
      if (e.message === 'Creation of service was not idempotent.') throw errors[e.message];

      throw errors.default;
    });

  return itemsWithExtras;
};

// Doc: context: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
exports.provisionAppSlaves = async (event, context) => {
  // console.debug(process.env.AWS_ACCESS_KEY_ID);
  internals.lambdaTimeout = process.env.LAMBDA_TIMEOUT;
  const { provisionViaLambdaDto: { items } } = event;
  let result;
  try {
    result = await internals.deploySlaves(items, context);
  } catch (e) {
    result = {
      'timeout exceeded': 'Timeout exceeded: App Slave container(s) took too long to start.',
      'Creation of service was not idempotent.': 'Creation of service was not idempotent.',
      defaultError: 'Unexpected error in Lambda occurred, check the Lambda logs for details.'
    }[e.message];
  }
  console.info(`The resulting items were: ${JSON.stringify(result)}`);
  // [
  //   {
  //       "testSessionId": "lowPrivUser",
  //       "browser": "chrome",
  //       "appSlaveContainerName": "appslave-zap-chrome-1",
  //       "seleniumContainerName": "seleniumstandalone-chrome-1",
  //       "ecsServiceName": "s2-app-chrome-1-cust0",
  //       "taskDefinition": "s2-app-slave-chrome-1"
  //   },{
  //       "testSessionId": "adminUser",
  //       "browser": "chrome",
  //       "appSlaveContainerName": "appslave-zap-chrome-2",
  //       "seleniumContainerName": "seleniumstandalone-chrome-2",
  //       "ecsServiceName": "s2-app-chrome-2-cust0",
  //       "taskDefinition": "s2-app-slave-chrome-2"
  //   }
  // ]
  const response = {
    // 'statusCode': 200,
    body: { provisionedViaLambdaDto: { items: result } }
  };

  return response;
};
