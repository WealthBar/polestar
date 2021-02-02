#@IgnoreInspection BashAddShebang
# to initialize your environment do: `. ./config/dev_env.sh`

# -- set per project
export PROJECT_NAME=cidihub
echo "PROJECT_NAME=$PROJECT_NAME"
export PROJECT_URL=http://localhost:3000/
echo "PROJECT_URL=$PROJECT_URL"
export CONFIG_ENV=dev
echo "CONFIG_ENV=$CONFIG_ENV"

# -- derived from above
export BABEL_DISABLE_CACHE=1
export NODE_PATH=./src
. ./crypt/google_auth.sh
. ./crypt/session_secret.sh
. ./crypt/slack_hook.sh

DBHOST=localhost
DBPORT=5413

export DB_URL_DBA=postgresql://postgres@$DBHOST:$DBPORT
echo "DB_URL_DBA=$DB_URL_DBA"
export DB_URL=postgresql://postgres@$DBHOST:$DBPORT/$PROJECT_NAME
echo "DB_URL=$DB_URL"
export TEST_DB_URL=postgresql://postgres@$DBHOST:$DBPORT/${PROJECT_NAME}_test
echo "TEST_DB_URL=$DB_URL"
