#!/bin/sh

(
for param in $(aws ssm describe-parameters --query 'Parameters[].Name' --output text)
do
   value=$(aws ssm get-parameter --with-decrypt --name "${param}" --with-decrypt --query 'Parameter.Value')
   value=$(echo "${value}" | sed 's/"//g')
   echo "${param}!${value}"
done
) | sort

