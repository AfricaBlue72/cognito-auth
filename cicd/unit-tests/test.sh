#!/bin/sh

set -e 

ID="$0"

log()
{
   echo "${ID}: $(date): "$*
}

log "Running in ${PWD}"
log "Starting"
date > output
log "Done"

exit 0
