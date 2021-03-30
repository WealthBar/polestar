#!/bin/bash
IFS=$'\n'

for bf in $(find . -type f -name init | grep -v node_modules)
do
  pushd $(dirname "$bf") || exit
  ./init
  popd || exit
done
