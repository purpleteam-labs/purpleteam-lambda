<div align="center">
  <br/>
  <a href="https://purpleteam-labs.com" title="purpleteam">
    <img width=900px src="https://github.com/purpleteam-labs/purpleteam/blob/main/assets/images/purpleteam-banner.png" alt="purpleteam logo">
  </a>
  <br/>
<br/>
<h2>purpleteam lambda functions</h2><br/>
lambda functions of <a href="https://purpleteam-labs.com/" title="purpleteam"><em>PurpleTeam</em></a> - Currently in alpha
<br/><br/>

<a href="https://purpleteam-labs.com/doc/" title="documentation">
  <img src="https://img.shields.io/badge/-documentation-blueviolet" alt="documentation">
</a>

<a href="https://github.com/purpleteam-labs/purpleteam-lambda/releases" title="latest release">
  <img src="https://img.shields.io/github/v/release/purpleteam-labs/purpleteam-lambda?color=%23794fb8&include_prereleases" alt="GitHub release (latest SemVer including pre-releases)">
</a>

<!--<table>
  <tbody>
    <tr>
      <td colspan="1"></td>
      <td colspan="3">local</td>
      <td colspan="2">cloud</td>
    </tr>
    <tr>
      <td>Top Level</td>
      <td>selenium<br>provisioner</td>
      <td>app-emissary<br>provisioner</td>
      <td>s2<br>deprovisioner</td>
      <td>app-emissary<br>provisioner</td>
      <td>s2<br>deprovisioner</td>
    </tr>
    <tr>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=package.json" style="max-width:100%;"></a>
      </td>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/selenium-standalone-provisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/local/selenium-standalone-provisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/selenium-standalone-provisioner/package.json" style="max-width:100%;"></a>
      </td>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/app-emissary-provisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/local/app-emissary-provisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/app-emissary-provisioner/package.json" style="max-width:100%;"></a>
      </td>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/s2-deprovisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/local/s2-deprovisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/s2-deprovisioner/package.json" style="max-width:100%;"></a>
      </td>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/cloud/app-emissary-provisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/cloud/app-emissary-provisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/cloud/app-emissary-provisioner/package.json" style="max-width:100%;"></a>
      </td>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/cloud/s2-deprovisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/cloud/s2-deprovisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/cloud/s2-deprovisioner/package.json" style="max-width:100%;"></a>
      </td>
    </tr>
  </tbody>
</table>-->

<br/><br/>
</div>


If you are setting up the lambda functions, you will be targeting the `local` environment.

Clone or fork this repository.

`cd` to the repository root directory and run:  
```shell
npm install
```

Now carry out the same `npm install` command from each of the following directories:

* `local/app-emissary-provisioner/`
* `local/s2-deprovisioner/`
* `local/selenium-standalone-provisioner/`

# Install aws cli

If you are running on a Linux based system with apt, you can install `awscli` via the standard repository. This may be a little old, but it may be OK, and of course it's very quick and easy.

Or with a handful of commands you can install the latest, details [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html).

# Install aws-sam-cli

The [install details](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) for Linux can be found [here](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-linux.html).

There is two install options, the older one which uses Homebrew and the newer one (which we recommend) which uses a shell script.

## [Homebrew](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-install-linux-alt.html)

You will need to install brew first. Once you have done that `which brew` will show you were it is installed.  
Contrary to the install instructions, it was installed to: `/home/linuxbrew/.linuxbrew/Homebrew/bin/brew`  
For us we use zsh, so adding homebrew to our path was just adding the following line to our ~/.zshrc file:  
```shell
export PATH=/home/linuxbrew/.linuxbrew/Homebrew/bin/brew:$PATH
```  
Then just reload with the following command:  
```shell
source ~/.zshrc
```  
Your terminal should know where brew now is. Carry on with the aws-sam-cli install.  
For us we had to run the install twice  
```shell
brew tap aws/tap
brew install aws-sam-cli
```

## [Shell](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-linux.html)

Just follow the directions.

# Configuring aws cli

In order to validate SAM templates, [you'll need](https://github.com/awslabs/aws-sam-cli/issues/394) an AWS user with CLI access and policy `AWSQuickSightListIAM` added to the group of the CLI user, then, usually the easiest way to do this is to run [`aws configure`](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) which will create two files ([`~/.aws/credentials`](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html) & `~/.aws/config`) if they don't already exist. The `aws_access_key_id` & `aws_secret_access_key` will be created in the `credentials` file if they don't exist, and the `output` & [`region`](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-region.html) will be created in the `config` file if they don't exist. If you don't set the region you'll end up with [errors](https://github.com/awslabs/aws-sam-cli/issues/442)  
Next it's a good idea to make sure these files are `chmod 600` (by default mine was). I then `chmod 700` on `~/.aws/`, just like the `~/.ssh/` directory is.

<br>

Once you have worked through the above steps, head back to the [local setup](https://purpleteam-labs.com/doc/local/set-up/) documentation to continue setting up the other _PurpleTeam_ components.
