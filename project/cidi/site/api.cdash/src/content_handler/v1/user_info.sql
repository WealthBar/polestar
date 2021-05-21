SELECT
  user_cad_value :: text,
  date :: date :: text
FROM
  billing_user_daily_cad_values biudcv
  JOIN users u ON biudcv.user_id = u.id
WHERE
  u.ci_id = $(ciId)::uuid
  AND biudcv.date >= ($(asOf)::date - INTERVAL '5 days')
ORDER BY
  biudcv.date DESC
LIMIT 1;