const convict = require('convict');

const schema = {
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'production',
    env: 'NODE_ENV'
  }
};

const config = convict(schema);
config.loadFile(`./config/config.${process.env.NODE_ENV}.json`);
config.validate();

module.exports = config;
