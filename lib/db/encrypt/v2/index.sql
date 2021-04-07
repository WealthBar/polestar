-- assumes func schema exists

CREATE FUNCTION func.aes_encrypt(ivkey BYTEA, what TEXT)
  RETURNS BYTEA
  LANGUAGE sql
AS
$$
SELECT encrypt_iv(
  DECODE(what, 'escape'),
  SUBSTRING(ivkey::BYTEA, 1, 32),
  SUBSTRING(ivkey::BYTEA, 33, 16),
  'AES'
  )
$$;

CREATE FUNCTION func.aes_encrypt(ivkey BYTEA, what NUMERIC)
  RETURNS BYTEA
  LANGUAGE sql
AS
$$
SELECT encrypt_iv(
  DECODE(what::TEXT, 'escape'),
  SUBSTRING(ivkey::BYTEA, 1, 32),
  SUBSTRING(ivkey::BYTEA, 33, 16),
  'AES'
  )
$$;

CREATE FUNCTION func.aes_decrypt_to_text(ivkey BYTEA, what BYTEA)
  RETURNS TEXT
  LANGUAGE sql
AS
$$
SELECT ENCODE(
  decrypt_iv(
    what,
    SUBSTRING(ivkey::BYTEA, 1, 32),
    SUBSTRING(ivkey::BYTEA, 33, 16),
    'AES'
    ),
  'escape')
$$;

CREATE FUNCTION func.aes_decrypt_to_numeric(ivkey BYTEA, what BYTEA)
  RETURNS NUMERIC
  LANGUAGE sql
AS
$$
SELECT ENCODE(
  decrypt_iv(
    what,
    SUBSTRING(ivkey::BYTEA, 1, 32),
    SUBSTRING(ivkey::BYTEA, 33, 16),
    'AES'
    ),
  'escape') :: NUMERIC
$$;
