-- Add the 'looking_for_clan' column if it does not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS looking_for_clan boolean DEFAULT false NOT NULL;

-- Grant UPDATE on the 'looking_for_clan' column of the 'profiles' table to 'authenticated'.
-- This is necessary to allow users to toggle their "looking for clan" status.
GRANT UPDATE (looking_for_clan) ON TABLE public.profiles TO authenticated;
