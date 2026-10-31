-- Figma 173:1167/7691: per-account first-visit popup controls.
-- Sound remains browser-local; this migration changes no existing account preferences.
ALTER TABLE public.go_members
 ADD COLUMN IF NOT EXISTS go_popup_enabled boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS go_popup_hide_until timestamptz,
 ADD COLUMN IF NOT EXISTS go_popup_last_seen_kst date;
