#!/bin/bash

if [[ ${CODEBUILD_SOURCE_VERSION} == "" ]]
then
    echo "Error: CODEBUILD_SOURCE_VERSION environment variable not set. Exiting gracefully anyway"
    exit 0
fi


artifact=$(echo ${CODEBUILD_SOURCE_VERSION} | cut -f6 -d:)
bucket=$(echo ${artifact} | cut -f1 -d/)


targetPrefix=DeployedInProduction
keyName=$(date +%Y-%m-%d-%H:%M:%S)
destination=${bucket}/${targetPrefix}/${keyName}

echo Copying s3://${artifact} to ${destination}
aws s3 cp s3://${artifact} s3://${destination}

# Exit gracefully, even if copy failed because the deployment phase succeeded before this stage
exit 0