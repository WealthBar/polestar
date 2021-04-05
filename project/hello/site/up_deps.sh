for i in *
do
  if [ -f "$i/package.json" ]
  then
    echo "$i"
    pushd "$i"
    node ../../../../tool/up_deps.js | sh
    popd
  fi
done

