#!/bin/sh
set -e
export ID="[$(pwd): $0]"

# SOURCE THIS SCRIPT 

[ -z "$TargetAccountId" ] && { echo "${ID}: FAIL: Cannot find environment variable TargetAccountId" >&2; exit -1; }
[ -z "$TargetRoleName" ] && { echo "${ID}: FAIL: Cannot find environment variable TargetRoleName" >&2; exit -1; }

echo "${ID}: $(date): v1.1 running ..."
echo "${ID}: TargetAccountId=${TargetAccountId}"
echo "${ID}: TargetRoleName=${TargetRoleName}"
echo "${ID}: Identity Before:"
aws sts get-caller-identity
echo "${ID}: Calling sts assume-role ..."
creds=$(aws sts assume-role --role-arn arn:aws:iam::${TargetAccountId}:role/${TargetRoleName} --role-session-name "Building101" --output text --query "Credentials.[AccessKeyId,SecretAccessKey,SessionToken]")
echo "${ID}: STS Credentials: ${creds}"
set ${creds}
export AWS_ACCESS_KEY_ID="$1"
export AWS_SECRET_ACCESS_KEY="$2"
export AWS_SESSION_TOKEN="$3"
echo "${ID}: Identity After:"
aws sts get-caller-identity
echo "${ID}: $(date): done."
