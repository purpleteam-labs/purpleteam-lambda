
const axios = require('axios');
const config = require('./config/config.js');
const internals = {};

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

internals.developmentDeploySlaves = async (dTOItems) => {
  const numberOfRequestedSlaves = dTOItems.length;
  if (numberOfRequestedSlaves < 1 || numberOfRequestedSlaves > 12) throw new Error(`The number of app-slaves requested was: ${numberOfRequestedSlaves}. The supported number of testSessions is from 1-12`);

  const http = axios.create({baseURL: 'http://docker-compose-ui:5000/api/v1', headers: {'Content-type': 'application/json'}});

  await http.put('/services', { service: 'zap', project: 'app-slave', num: numberOfRequestedSlaves });

  return dTOItems.map((cV, i) => {
    const itemClone = { ...cV };
    itemClone.appSlaveContainerName = `appslave_zap_${i + 1}`;
    return itemClone;
  });
};

internals.productionDeploySlaves = () => {
  throw new Error('Not Implemented');
  // Todo: KC: Deploy ECS Task
};

exports.provisionAppSlaves = async (event, context) => {
  // Todo: KC: Do we need convict?
  const env = config.get('env');
  const { provisionViaLambdaDto: { items } } = event;
  const result = await internals[`${env}DeploySlaves`](items);

  response = {
    //'statusCode': 200,
    body: { provisionViaLambdaDto: { items: result } }
  };

  return response
};
