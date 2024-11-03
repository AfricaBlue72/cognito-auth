#!/bin/bash
#
# setLogGroupRetention.sh
#


DAYS=365
FILTER=/aws/lambda

DRYRUN=true
VERBOSE=true

function Usage()
{
    echo "Usage: $(basename $0) [-d days] [-f filter] [-x] [-q]" 1>&2
    echo "   -d days   -- number of days to retain the logs, default is ${DAYS}" 1>&2
    echo "   -f filter -- <filter> must be part of the loggroup name (${FILTER} is the default)" 1>&2
    echo "   -x        -- execute" 1>&2
    echo "   -q        -- quiet" 1>&2
    echo "   -h        -- help"

    exit 2
}

function getLogGroups()
{
    aws logs describe-log-groups --query 'logGroups[].[logGroupName]' | grep -i ${FILTER} | sed 's/\"//g'
}





while getopts d:f:qxh opt $@
do
    case ${opt} in
    d)
        DAYS=${OPTARG}
        ;;
    f)
        FILTER="${OPTARG}"
        ;;
    q)
        VERBOSE=false
        ;;
    x)
        DRYRUN=false
        VERBOSE=true
        ;;
    h)
        Usage
        ;;
    \?)
        Usage
        ;;
    esac

done

${DRYUN} && echo "This is a dryrun, use -x to execute"

getLogGroups | while read GROUP
do
    ${VERBOSE} && echo aws logs put-retention-policy --retention-in-days ${DAYS} --log-group-name "${GROUP}" 
    ! ${DRYRUN} && aws logs put-retention-policy --retention-in-days ${DAYS} --log-group-name "${GROUP}"
done

