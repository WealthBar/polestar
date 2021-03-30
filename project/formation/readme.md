# Formation

## Config
Each integration would be setup with:
* {ACCESS_KEY} used to identify the system
* {SECRET_KEY} used to sign the {stoken} used to identify the requests
* mapping for {FORM_KEY} to:
  * completion URL to send the client to on completion
  * url to send user to on exit 
  * url to send user to on access to expired stoken
  * url to send user to on access to completed stoken
* mapping for referer domain to invalid stoken redirect url  
* form key mappings by {brand, jurisdiction, signing_date, locale} -> workflow id to use & optional docusign templates
  * workflow ids can be shared across brands and dynamically change the brand displayed, or completely
    different across brands, as needed.
  
## System API
System to System integration API for requesting a form fill workflow. All calls via SSL in production.

{stoken} is signed with {SECRET_KEY} associated to {ACCESS_KEY}.

All system to system requests container a header: `Authorization Bearer: {ACCESS_KEY}`

### POST /v1/init/{stoken}

Body: JSON
```json5
{
    form_key: string,
    brand: string,
    jurisdiction: string, // {country_iso2}(_{region_iso2}): ca, ca_bc, ca_ab, us, us_wa, etc.
    signing_date: yyyy-mm-dd,
    locale: string, // {locale_iso2}: en, fr
    valid_for: number, // seconds until the form request expires. Max 30 days.
    data: { // used to pre-fill answers, included in docusign data even if not in web form
      {key}:{value},
      ...
    },
}
```

Returns: application/json
```json5
{} // all good
```

or

```json5
{
  error: 'INVALID_REQUEST' | 'ACCESS_DENIED' | 'MISMATCH'
}
```

If the same stoken sent multiple times this first `init` is used to set the data. If
the same stoken is used with different POST data the `MISMATCH` error is returned.

### GET /v1/result/{stoken}

Returns

Returns: application/json
```json5
{
  state: 'INPROGRESS' | 'EXPIRED' | 'COMPLETED',
  data?: { {key}:{value} }, // data provided by the user if state is COMPLETED
}
``` 

or

```json5
{
  error: 'INVALID_REQUEST' | 'ACCESS_DENIED' | 'NOT_FOUND'
}
```

### GET /v1/doc/${stoken}

If docusigning was requested for the given form key and the user completed the process this will return the signed PDF.

If can also return: 403 Forbidden, 404 Not Found (stoken doesn't exist), or 400 Invalid (form doesn't get signed) 

## User facing app

### /v1/form/{stoken}

Provides client form fill web UI, branded as specified by the init call for the {stoken}. 

If {stoken} is not on file either a generic error page, or a redirect based on the referer domain.

If {stoken} is expired a redirect based on the form key.

If {stoken} is already completed a redirect based on the form key.

If {stoken} is in progress the form resumes where it was left off.

## Sequence Diagram

```
title Formation

participant Client
participant BE
participant Formation
participant BEDB

Client -> BE: gather form
BE -> Formation : POST /init/{stoken} { form_key: FORM, ... }
Formation -> BE: { }
BE -> Client: REDIRECT https://formation.xxx/fill/{stoken}
Client  -> Formation: /form/{stoken}
alt client completes form
Formation->Client: REDIRECT https://be.xxx/$cfg{FORM/complete}/{stoken}
Client->BE: /$cfg{FORM/compelete}/{stoken}
BE->Formation: /result/{stoken}
Formation->BE: { data: {...} }
BE->BEDB: store data
BE->Client: ok
else client exits form
Formation->Client: REDIRECT https://be.xxx/$cfg{FORM/exit}
Client ->BE: /$cfg{FORM/exit}
BE->Client: up to BE to decide.
end
```
