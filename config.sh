#!/bin/bash

DIRECT_RUN=
(return 0 2>/dev/null) && DIRECT_RUN=1
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
  CONFIG_ENV=local
fi

if [[ ! -d ./crypt/$CONFIG_ENV ]]
then
 echo "Invalid CONFIG_ENV, no ./crypt/${CONFIG_ENV}"
 return # don't use 'exit' as we are being sourced and exit will exit the users shell.
fi
echo "CONFIG_ENV=${CONFIG_ENV}"
export CONFIG_ENV

IFS=$'\n'

# shellcheck disable=SC2044
for config_file in $(find -s ./crypt -maxdepth 1 -name '*.sh' -type f)
do
  echo "${config_file}"
  # shellcheck disable=SC1090
  source ${config_file}
done


# shellcheck disable=SC2044
for config_file in $(find -s ./crypt/${CONFIG_ENV} -maxdepth 1 -name '*.sh' -type f)
do
  echo "${config_file}"
  # shellcheck disable=SC1090
  source ${config_file}
done

