-- Additive only. Existing pending links have no trustworthy issuance date:
-- they must be renewed through resend-verification before they can activate an account.
-- No account or existing application data is removed or enabled automatically.
ALTER TABLE users ADD COLUMN verification_token_expiry timestamp(6) with time zone;
