-- Add 'looking_for_clan' column if it does not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS looking_for_clan boolean DEFAULT false;

-- Grant UPDATE access to 'looking_for_clan' column on public.profiles to authenticated users
grant update (looking_for_clan) on table public.profiles to authenticated;
