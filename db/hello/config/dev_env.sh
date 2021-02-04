#@IgnoreInspection BashAddShebang
# to initialize your environment do: `. ./config/dev_env.sh`

export DB_NAME=hello
echo "DB_NAME=$DB_NAME"
export CONFIG_ENV=dev
echo "CONFIG_ENV=$CONFIG_ENV"

. ./crypt/db.sh

DBHOST=localhost
DBPORT=5413

export DB_SUPER_URL="postgres://postgres@$DBHOST:$DBPORT/"
export DB_DBA_URL="postgres://${DB_NAME}_dba:${DB_DBA_PASSWORD}@$DBHOST:$DBPORT/$DB_NAME"
export DB_CLIENT_URL="postgres://${DB_NAME}_client:${DB_CLIENT_PASSWORD}@$DBHOST:$DBPORT/$DB_NAME"
export DB_STAFF_URL="postgres://${DB_NAME}_staff:${DB_STAFF_PASSWORD}@$DBHOST:$DBPORT/$DB_NAME"
export DB_RO_STAFF_URL="postgres://${DB_NAME}_staff:${DB_RO_STAFF_PASSWORD}@$DBHOST:$DBPORT/$DB_NAME"
export DB_DBA_URL_TEST="postgres://${DB_NAME}_dba:${DB_DBA_PASSWORD}@$DBHOST:$DBPORT/${DB_NAME}_test"
export DB_CLIENT_URL_TEST="postgres://${DB_NAME}_client:${DB_CLIENT_PASSWORD}@$DBHOST:$DBPORT/${DB_NAME}_test"
export DB_STAFF_URL_TEST="postgres://${DB_NAME}_staff:${DB_STAFF_PASSWORD}@$DBHOST:$DBPORT/${DB_NAME}_test"
export DB_RO_STAFF_URL_TEST="postgres://${DB_NAME}_staff:${DB_RO_STAFF_PASSWORD}@$DBHOST:$DBPORT/${DB_NAME}_test"

echo "DB_SUPER_URL=$DB_SUPER_URL"
echo "DB_DBA_URL=$DB_DBA_URL"
echo "DB_CLIENT_URL=$DB_CLIENT_URL"
echo "DB_STAFF_URL=$DB_STAFF_URL"
echo "DB_RO_STAFF_URL=$DB_RO_STAFF_URL"
echo "DB_DBA_URL_TEST=$DB_DBA_URL_TEST"
echo "DB_CLIENT_URL_TEST=$DB_CLIENT_URL_TEST"
echo "DB_STAFF_URL_TEST=$DB_STAFF_URL_TEST"
echo "DB_RO_STAFF_URL_TEST=$DB_RO_STAFF_URL_TEST"
