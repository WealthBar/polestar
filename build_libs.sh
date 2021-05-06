#!/bin/bash
IFS=$'\n'

for bf in lib/ts_agnostic lib/ts_browser lib/ts_workorder lib/node_core lib/node_workorder lib/node_script lib/vue_workflow lib/vue_workflow_components
do
  pushd $bf || exit
  ./init
  ./build
  popd || exit
done
