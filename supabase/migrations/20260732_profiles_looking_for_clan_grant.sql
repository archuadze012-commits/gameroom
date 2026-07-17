ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS looking_for_clan BOOLEAN DEFAULT false NOT NULL;
GRANT UPDATE (looking_for_clan) ON TABLE public.profiles TO authenticated;
