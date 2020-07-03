const convict = require('convict');

const schema = {
  env: {
    doc: 'The application environment.',
    format: ['cloud'],
    default: 'cloud',
    env: 'NODE_ENV'
  },
  lambdaTimeout: {
    doc: 'The timeout of the Lambda function',
    format: 'duration',
    default: 3,
    env: 'LAMBDA_TIMEOUT'
  }
};

const config = convict(schema);
config.loadFile(`./config/config.${process.env.NODE_ENV}.json`);
config.validate();

module.exports = config;
