# manual testing

## Start the server running
This assumes you have the local Wealthbar DB set up, and you've set up the local `*.xxx` DNS resolution to localhost.

```
# in the polestar root:
. ./config.sh dev
overmind s -N -f procfile_cdash.dev
```

## Use curl to call the api

Get the production or demo token from 'CDASH_BEARER_MAPPING'. Use id `00050000-4000-8000-0000-000000000001` for demo data.

```
curl -H 'Authorization: Bearer <token>' 'http://api.cdash.cidi.xxx/v1/user_info?cidi_id=<id>' -o -
curl -H 'Authorization: Bearer aba3fa38eab0c7c0d802514855c04a2867339aa4a0571b5892e4f169bc8016ed5ca27cf07d5aa563d79630820f438ec111bbd52c31cc6b2b0a9edf40fc80e1cf' 'http://api.cdash.cidi.xxx/v1/user_info?cidi_id=00050000-4000-8000-0000-000000000001' -o -
```