// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ecs/index.html
const { ECSClient, ListServicesCommand, DeleteServiceCommand } = require('@aws-sdk/client-ecs');
const got = require('got');

const internals = {
  slackWebHook: got.extend({
    headers: {},
    resolveBodyOnly: true,
    prefixUrl: process.env.SLACK_WEBHOOK_URL
  })
};

internals.printEnv = () => {
  console.log('Environment Variables of interest follow.\nS2_PROVISIONING_TIMEOUT should be 2 seconds less than Lambda "Timeout": ', {
    NODE_ENV: process.env.NODE_ENV,
    S2_PROVISIONING_TIMEOUT: process.env.S2_PROVISIONING_TIMEOUT,
    AWS_REGION: process.env.AWS_REGION,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL
  });
};


internals.promiseAllTimeout = async (promises, timeout, resolvePartial = true) => new Promise(((resolve, reject) => { // Test this with false and internals.s2ProvisioningTimeout = 50
  const results = [];
  let finished = 0;
  const numPromises = promises.length;
  let onFinish = () => {
    if (finished < numPromises) {
      if (resolvePartial) {
        (resolve)(results);
      } else {
        // throw new Error('Not all promises completed within the specified time'); // This will not be caught because it's inside a setTimeout.
        reject(new Error('Not all promises completed within the specified time')); // This will be handled in deleteDanglingServices.
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


internals.getServicesOfCustCluster = async (ecsClient, customerClusterArn) => {
  const listServicesCommand = new ListServicesCommand({ cluster: customerClusterArn });
  const { serviceArns } = await ecsClient.send(listServicesCommand);
  return {
    s2ServicesArnsForDeletion: serviceArns.filter((sA) => sA.includes('s2_app_emissary_')),
    allServices: serviceArns
  };
};

internals.deleteDanglingServices = async (ecsClient, servicesForDeletion, customerClusterArn) => {
  const { promiseAllTimeout, s2ProvisioningTimeout } = internals;
  const deleteServiceCommands = servicesForDeletion.map((s) => new DeleteServiceCommand({ cluster: customerClusterArn, service: s, force: true }));
  const promisedResponses = deleteServiceCommands.map((c) => ecsClient.send(c));
  const message = {
    success: 'Stage two ECS services have been brought down.',
    failure: 'Timeout exceeded while attempting to bring the s2 ECS service(s) down. One or more may still be running.'
  };
  let result;
  await promiseAllTimeout(promisedResponses, s2ProvisioningTimeout).then((resolved) => {
    console.info(`These are the values returned from the ECS deleteServiceCommand: ${JSON.stringify(resolved)}`); // Used for debugging.
    result = resolved.every((e) => !!e)
      ? { success: message.success }
      : { failure: message.failure };
  }).catch((err) => {
    result = { failure: `${message.failure} The error was: ${err}` };
  });
  return result;
};

// Available emoji: https://gist.github.com/rxaviers/7360908
// Doc for message formatting:
//   https://api.slack.com/reference/surfaces/formatting#emoji
//   https://api.slack.com/messaging/composing/layouts
// Setting up Slack App for incomming Webhook: https://api.slack.com/messaging/webhooks#posting_with_webhooks
internals.publishResult = async ({ detail, s2ServicesArnsForDeletion, allServices, success, failure }) => {
  const { slackWebHook } = internals;
  console.info(`The current service Arns of cluster: "${detail.clusterArn}" were: ${allServices}`);
  console.info(`There were: "${s2ServicesArnsForDeletion.length ? s2ServicesArnsForDeletion.length : 0}" stage two services to be deleted`);
  success ? console.info(success) : console.error(failure);

  await slackWebHook.post({
    json: {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'ECS Task State Change',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [{
            type: 'mrkdwn',
            text: `*Task Group:*\n\`${detail.group}\``
          }, {
            type: 'mrkdwn',
            text: `*lastStatus:*\n${detail.lastStatus}`
          }]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Current services of cluster (${allServices.length}):*\n${allServices.length ? allServices.reduce((pV, cV) => `${pV}• ${cV}\n`, '') : 'NA'}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Current services requiring deletion (${s2ServicesArnsForDeletion.length}):*\n${s2ServicesArnsForDeletion.length ? s2ServicesArnsForDeletion.reduce((pV, cV) => `${pV}• ${cV}\n`, '') : 'NA'}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Result of deletion attempt:*\n${success ? `:ok: ${success}` : `:sos: ${failure}`}`
          }
        }

      ]
    }
  }).then((response) => { console.info(`The response from invoking the Slack incoming web hook was: "${response}"`); })
    .catch((err) => { console.error(`The call to the Slack incoming web hook responded with an error. The error was: "${err}"`); });
};

// Deletes dangling stage two containers. I.E. whenever the stage one task isn't running to do so.
exports.deleteS2ECSServices = async (event, context) => { // eslint-disable-line no-unused-vars
  const { detail, detail: { clusterArn: customerClusterArn } } = event;
  internals.s2ProvisioningTimeout = process.env.S2_PROVISIONING_TIMEOUT * 1000;

  // internals.s2ProvisioningTimeout = 50; // Used to test error messages

  const { getServicesOfCustCluster, deleteDanglingServices, publishResult, printEnv } = internals; // eslint-disable-line no-unused-vars
  console.info(`The event received from EventBridge was: ${JSON.stringify(event)}`);
  // console.info(`The context is: ${JSON.stringify(context)}`);
  // printEnv();
  const ecsClient = new ECSClient({ region: process.env.AWS_REGION });
  const servicesOfCustCluster = await getServicesOfCustCluster(ecsClient, customerClusterArn);

  const deleteDanglingServicesResult = servicesOfCustCluster.s2ServicesArnsForDeletion.length
    ? await deleteDanglingServices(ecsClient, servicesOfCustCluster.s2ServicesArnsForDeletion, customerClusterArn)
    : { success: 'There were no stage two services to be deleted', failure: undefined };

  await publishResult({ detail, ...servicesOfCustCluster, ...deleteDanglingServicesResult });
};
