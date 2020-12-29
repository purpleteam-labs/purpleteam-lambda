<div align="center">
  <br/>
  <a href="https://purpleteam-labs.com" title="purpleteam">
    <img width=900px src="https://gitlab.com/purpleteam-labs/purpleteam/raw/main/assets/images/purpleteam-banner.png" alt="purpleteam logo">
  </a>
  <br/>
<br/>
<h2>purpleteam lambda functions</h2><br/>
lambda functions of <a href="https://purpleteam-labs.com/" title="purpleteam">purpleteam</a> - Currently in alpha
<br/><br/>


<table>
  <tbody>
    <tr>
      <td colspan="1"></td>
      <td colspan="3">local</td>
      <td colspan="2">cloud</td>
    </tr>
    <tr>
      <td>Top Level</td>
      <td>selenium<br>provisioner</td>
      <td>app-slave<br>provisioner</td>
      <td>s2<br>deprovisioner</td>
      <td>app-slave<br>provisioner</td>
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
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/app-slave-provisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/local/app-slave-provisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/app-slave-provisioner/package.json" style="max-width:100%;"></a>
      </td>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/s2-deprovisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/local/s2-deprovisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/local/s2-deprovisioner/package.json" style="max-width:100%;"></a>
      </td>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/cloud/app-slave-provisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/cloud/app-slave-provisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/cloud/app-slave-provisioner/package.json" style="max-width:100%;"></a>
      </td>
      <td style="width:16.66%;">
        <a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/cloud/s2-deprovisioner/package.json"><img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda/badge.svg?targetFile=/cloud/s2-deprovisioner/package.json" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/purpleteam-labs/purpleteam-lambda?targetFile=/cloud/s2-deprovisioner/package.json" style="max-width:100%;"></a>
      </td>
    </tr>
  </tbody>
</table>

<br/><br/>
</div>


Clone this repository.

# Install the aws cli

It appears that v2 is somewhat different to install, details [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html).

## Legacy v1 install of aws cli below

Read:

* https://docs.aws.amazon.com/cli/latest/userguide/installing.html
* https://docs.aws.amazon.com/cli/latest/userguide/awscli-install-linux.html#awscli-install-linux-path

[Don't install pip the suggested way](https://stackoverflow.com/questions/49881448/importerror-cannot-import-name-main-after-upgrading-to-pip-10-0-0-for-python#answer-49989474)

`python -V`  
`python3 -V`  
`apt-get update`  
`apt-get install python-pip`  
`apt install python-pip python3-pip`

[`apt-get install python-setuptools python3-setuptools`](https://stackoverflow.com/questions/14426491/python-3-importerror-no-module-named-setuptools#answer-14426553)

The following command can also be run regularly to update awscli  
`pip install awscli --upgrade --user`  
If the above command produced `error: invalid command 'bdist_wheel'` then run `pip install wheel`

Needed to then [update my path](https://docs.aws.amazon.com/cli/latest/userguide/install-linux.html#install-linux-pip) so that `~/.local/bin` would be included.

If you get the following error when runing `sam` commands:  
```
/home/you/.local/lib/python2.7/site-packages/requests/__init__.py:83: RequestsDependencyWarning: Old version of cryptography ([1, 2, 3]) may cause slowdown.
  warnings.warn(warning, RequestsDependencyWarning)
```
Then run: `pip install --upgrade cryptography`

If you get OpenSSL errors like the following:  
```
...
  File "/home/you/.local/lib/python2.7/site-packages/urllib3/contrib/pyopenssl.py", line 46, in <module>
    import OpenSSL.SSL
  File "/usr/lib/python2.7/dist-packages/OpenSSL/__init__.py", line 8, in <module>
    from OpenSSL import rand, crypto, SSL
  File "/usr/lib/python2.7/dist-packages/OpenSSL/SSL.py", line 118, in <module>
    SSL_ST_INIT = _lib.SSL_ST_INIT
AttributeError: 'module' object has no attribute 'SSL_ST_INIT'
```
Then run: `pip install --upgrade pyOpenSSL`


# Install aws-sam-cli

The [install details](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) for Linux can be found [here](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-linux.html).  
You will need to install brew first. Once you have done that `which brew` will show you were it is installed.  
For us we use zsh, so adding homebrew to our path was just adding the following line to our ~/.zshrc file:  
```shell
export PATH=/home/linuxbrew/.linuxbrew/Homebrew/bin:$PATH
```  
Then just reload with the following command:  
```shell
source ~/.zshrc
```  
Your terminal should know where brew now is. Carry on with the aws-sam-cli install.

## Legacy Python install of aws-sam-cli below

`pip install --user --upgrade aws-sam-cli`

This kept failing with an error [`regex_3/_regex.c:46:20: fatal error: Python.h: No such file or directory`](https://github.com/awslabs/aws-sam-cli/issues/922#issuecomment-452361161)

So I did as [jfuss suggested](https://github.com/awslabs/aws-sam-cli/issues/922#issuecomment-452363441):  
`sudo apt-get install python-dev python3-dev`  
Then tried `pip install --user --upgrade aws-sam-cli` again, and could now see `sam` listed in `~/.local/bin/`

# [Validating SAM templates](https://github.com/awslabs/aws-sam-cli/blob/develop/docs/usage.md#validate-sam-templates) (probably still needs doing)

In order to validate SAM templates, [you'll need](https://github.com/awslabs/aws-sam-cli/issues/394) an AWS user with CLI access and policy `AWSQuickSightListIAM` added to the group of the CLI user, then, usually the easiest way to do this is to run [`aws configure`](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) which will create two files ([`~/.aws/credentials`](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html) & `~/.aws/config`) if they don't already exist. The `aws_access_key_id` & `aws_secret_access_key` will be created in the `credentials` file if they don't exist, and the `output` & [`region`](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-region.html) will be created in the `config` file if they don't exist. If you don't set the region you'll end up with [errors](https://github.com/awslabs/aws-sam-cli/issues/442)  
Next it's a good idea to make sure these files are `chmod 600` (by default mine was). I then `chmod 700` on `~/.aws/`, just like the `~/.ssh/` directory is.
