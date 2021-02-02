#@IgnoreInspection BashAddShebang
# to initialize your environment do: `. ./config/dev_env.sh`

# -- set per project
export PROJECT_NAME=cidihub_hello
echo "PROJECT_NAME=$PROJECT_NAME"
export PROJECT_URL=http://localhost:3000/
echo "PROJECT_URL=$PROJECT_URL"
export CONFIG_ENV=dev
echo "CONFIG_ENV=$CONFIG_ENV"

# -- derived from above
export NODE_PATH=./src
. ./crypt/google_auth.sh
. ./crypt/session_secret.sh
