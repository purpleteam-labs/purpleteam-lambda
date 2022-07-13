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
 * https://github.com/kubernetes-client/javascript/blob/master/examples/typescript/apply/apply-example.ts
 * @todo spec path shoould be an env variable?
 * @todo test for ideal S3 provisioing time for creating a new deployment
 * @todo fill response objects with k8s pod names, maybe query for list pod?
 * @param {*} specPath
 * @returns Array of created resources
 */
async function kubeApply(specPath = '../prod/purpleteam-s2-containers/app-emissary/deployment.yaml', replicasNum = 10) {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const fsReadFileP = util.promisify(fs.readFile);
  const specString = await fsReadFileP(specPath, 'utf8');
  const specs = yaml.loadAll(specString);
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const created = [];
  validSpecs.forEach(async (doc) => {
    const spec = doc;
    spec.metadata.annotations = spec.metadata.annotations || {};
    delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
    spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = JSON.stringify(spec);

    /**
     *scales the number of replica sets to DTO items length if the manifest type is a deployment
     * */

    if (spec.kind === 'Deployment') {
      spec.spec.replicas = replicasNum;
    }

    try {
      await client.read(spec);
      const response = await client.patch(spec);
      created.push(response.body);
    } catch (e) {
      const response = await client.create(spec);
      created.push(response.body);
    }
  });

  return created
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


internals.deployEmissaries = async (dTOItems) => {
  const { promiseAllTimeout, s2ProvisioningTimeout } = internals;
  const numberOfRequestedEmissaries = dTOItems.length;
  const result = { items: undefined, error: undefined };

  if (numberOfRequestedEmissaries < 1 || numberOfRequestedEmissaries > 12) throw new Error(`The number of app-emissaries requested was: ${numberOfRequestedEmissaries}. The supported number of Test Sessions is from 1-12 inclusive.`);

  const promisedResponse = kubeApply('', numberOfRequestedEmissaries);
  const resolved = await promiseAllTimeout([promisedResponse], s2ProvisioningTimeout);

  !resolved[0] && (result.error = 'Timeout exceeded: App Emissary container(s) took too long to start. Although they timed out, they may have still started. Also check that the minikube clutser is up.');
  result.items = dTOItems.map((cV, i) => {
    const itemClone = { ...cV };
    itemClone.appEmissaryContainerName = `appemissary_zap_${i + 1}`;
    return itemClone;
  });
  return result;
};

exports.provisionAppEmissaries = async (event, context) => { // eslint-disable-line no-unused-vars
  internals.s2ProvisioningTimeout = process.env.S2_PROVISIONING_TIMEOUT * 1000;
  const { provisionViaLambdaDto: { items } } = event;
  const { printEnv } = internals;
  printEnv();
  const result = await internals.deployEmissaries(items);
  const response = {
    // 'statusCode': 200,
    body: { provisionedViaLambdaDto: result }
  };

  return response;
};

