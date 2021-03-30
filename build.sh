#!/bin/bash
IFS=$'\n'

for bf in $(find . -type f -name build | grep -v node_modules)
do
  pushd $(dirname "$bf") || exit
  ./build
  popd || exit
done