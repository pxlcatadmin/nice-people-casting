-- Add job type: 'casting' or 'registration'
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'casting';

-- Add registration-specific data as JSONB (keeps submissions table clean)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS registration_data JSONB DEFAULT NULL;

-- registration_data stores:
-- {
--   address: string,
--   weight: string,
--   pants_size: string,
--   top_size: string,
--   hair_length: string,
--   inseam: string,
--   languages: string,
--   special_talents: string,
--   notable_clients: string,
--   availability: string,
--   social_tiktok: string,
--   emergency_contact_name: string,
--   emergency_contact_relationship: string,
--   emergency_contact_phone: string,
--   abn: string,
--   tfn: string,
--   bank_name: string,
--   bank_bsb: string,
--   bank_account: string,
--   how_heard: string,
--   code_of_conduct_agreed: boolean,
--   agreement_signed: boolean,
--   agreement_signature: string,
--   agreement_signed_at: string
-- }
