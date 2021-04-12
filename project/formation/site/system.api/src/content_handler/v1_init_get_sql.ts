export const value = `
SELECT (
        form_key_name,
        system_name,
        brand_name,
        jurisdiction_name,
        signing_date,
        locale_name,
        valid_until,
        form_data
         )
  IS NOT DISTINCT FROM
       (
        $(formKey),
        $(systemName),
        $(brand),
        $(jurisdiction),
        $(signingDate)::DATE,
        $(locale),
        $(validUntil)::TIMESTAMPTZ,
        $(data)
         ) AS matches
FROM
  form_request
WHERE stoken = DECODE($(stoken), 'hex');

`;
