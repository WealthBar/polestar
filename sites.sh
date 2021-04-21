#!/bin/bash

# Bash error control [Stop on first error, print line before exec, print after subsitution/expansion]
# set -ex
BASE_PROJECT_DIR="project"

#Sites array
SITES=()

pushd "$BASE_PROJECT_DIR" || exit
for project in $(find . -maxdepth 1 -mindepth 1 -type d -printf '%f\n')
do
  pushd "${project}" || exit
  for site in $(find ./site -maxdepth 1 -mindepth 1 -type d -printf '%f\n')
  do
    # printf "${BASE_PROJECT_DIR}/${project}/${site}/ \n"
    SITES+=("${BASE_PROJECT_DIR}/${project}/${site}")
  done
  popd || exit
done
popd || exit

for i in ${!SITES[@]}
do
  echo "${SITES[$i]}"
done