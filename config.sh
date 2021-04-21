#!/bin/bash

DIRECT_RUN=
(return 0 2>/dev/null) && DIRECT_RUN=1 # don't ask, it works, I ^C^V'd it from stack overflow.
if [[ -z $DIRECT_RUN ]]
then
  echo "Script must be 'sourced', use: . ./config.sh"
  exit
fi

set -f # disable filename expansion.

if [[ -n $1 ]]
then
  CONFIG_ENV=$1
fi

if [[ -z $CONFIG_ENV ]]
then
  CONFIG_ENV=dev
fi

if [[ ! -d ./crypt/$CONFIG_ENV ]]
then
 echo "Invalid CONFIG_ENV, no ./crypt/${CONFIG_ENV}"
 return # don't use 'exit' as we are being sourced and exit will exit the users shell.
fi
echo "CONFIG_ENV=${CONFIG_ENV}"
export CONFIG_ENV

IFS=$'\n' # tho really none of the shell scripts should have spaces in their names anyways...

# shellcheck disable=SC2044
for config_file in $(find ./crypt -maxdepth 1 -name '*.sh' -type f)
do
  echo "${config_file}"
  # shellcheck disable=SC1090
  source ${config_file}
done


# shellcheck disable=SC2044
for config_file in $(find ./crypt/${CONFIG_ENV} -maxdepth 1 -name '*.sh' -type f)
do
  echo "${config_file}"
  # shellcheck disable=SC1090
  source ${config_file}
done

