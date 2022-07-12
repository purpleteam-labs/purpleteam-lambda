// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

const k8s = require('@kubernetes/client-node');
const fs = require('fs');
const yaml = require('js-yaml');
const util = require('util');

/**
 * the equivalent of kubectl delete -f .yaml
 * @param {*} specPath
 * @returns Array of deleted resources
 */
async function kubeDelete(deploymentName) {
  const specPath = `../prod/purpleteam-s2-containers/${deploymentName}/deployment.yaml`;
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const fsReadFileP = util.promisify(fs.readFile);
  const specString = await fsReadFileP(specPath, 'utf8');
  const specs = yaml.loadAll(specString);
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const deleted = [];
  validSpecs.forEach(async (doc) => {
    const spec = doc;
    spec.metadata.annotations = spec.metadata.annotations || {};
    delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
    try {
      await client.read(spec);
      const response = await client.delete(spec);
      deleted.push(response.body);
    } catch (e) {
      console.error(e);
    }
  });
  return deleted;
}


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


internals.downContainers = async (deploymentNames) => {
  const { promiseAllTimeout, s2ProvisioningTimeout } = internals;
  const s2ProjectNames = [...deploymentNames];

  const promisedResponses = s2ProjectNames.map((pN) => kubeDelete(pN));
  const resolved = await promiseAllTimeout(promisedResponses, s2ProvisioningTimeout);

  return resolved.every((e) => !!e)
    ? { item: `Stage Two projects (${s2ProjectNames}) have been brought down.` }
    : { error: `Timeout exceeded while attempting to bring the Stage Two projects (${s2ProjectNames}) down. One or more may still be running.` };
};

exports.deprovisionS2Containers = async (event, context) => { // eslint-disable-line no-unused-vars
  internals.s2ProvisioningTimeout = process.env.S2_PROVISIONING_TIMEOUT * 1000;
  const { deprovisionViaLambdaDto: { items: deploymentNames } } = event;
  const { downContainers, printEnv } = internals;
  printEnv();
  const result = await downContainers(deploymentNames);

  const response = {
    // 'statusCode': 200,
    body: { deprovisionedViaLambdaDto: result }
  };

  return response;
};
