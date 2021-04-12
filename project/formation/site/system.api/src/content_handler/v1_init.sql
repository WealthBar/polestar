INSERT INTO
  form_request
(stoken,
 form_key_name,
 system_name,
 brand_name,
 jurisdiction_name,
 signing_date,
 locale_name,
 valid_until,
 form_data)
VALUES
(DECODE($(stoken), 'hex'),
 $(formKey),
 $(systemName),
 $(brand),
 $(jurisdiction),
 $(signingDate)::DATE,
 $(locale),
 $(validUntil)::TIMESTAMPTZ,
 $(data))
;
