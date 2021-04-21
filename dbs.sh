#!/bin/bash

# Bash error control [Stop on first error, print line before exec, print after subsitution/expansion]
# set -ex
BASE_DB_DIR="db"

#Databases array
DBS=()

pushd "$BASE_DB_DIR" || exit
for database in $(find . -maxdepth 1 -mindepth 1 -type d -printf '%f\n')
do
  # printf "${BASE_DB_DIR}/${database}/ \n"
  DBS+=("${BASE_DB_DIR}/${database}/")
done
popd || exit

for i in ${!DBS[@]}
do
  echo "${DBS[$i]}"
done