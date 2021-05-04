-- stoken -> wf form key name
SELECT
  form_request_id,
  flow_name,
  brand_name,
  locale_name
FROM
  form_request
  JOIN form_key
  USING (system_name, form_key_name)
WHERE
  stoken = $(stoken);