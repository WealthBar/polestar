#@IgnoreInspection BashAddShebang
# to initialize your environment do: `. ./config/dev_env.sh`

export CONFIG_ENV=dev
echo "CONFIG_ENV=$CONFIG_ENV"

export SMTP_HOST="smtp.local"

. ./crypt/db.sh
. ./crypt/session_secret.sh
. ./crypt/google_auth.sh

