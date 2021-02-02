# to initialize your environment do: `. ./config/ci_env.sh`

# -- set per project
export PROJECT_NAME=cidihub
echo "PROJECT_NAME=$PROJECT_NAME"
export PROJECT_URL=http://localhost/
echo "PROJECT_URL=$PROJECT_URL"
export CONFIG_ENV=ci
echo "CONFIG_ENV=$CONFIG_ENV"

# -- derived from above
export BABEL_DISABLE_CACHE=1

DBHOST=postgres
DBPORT=5432

export DB_URL=postgresql://postgres@$DBHOST:$DBPORT/$PROJECT_NAME
echo "DB_URL=$DB_URL"

