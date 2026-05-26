-- Add notes and source columns to rinks table
-- Run this in Supabase SQL Editor to enable these fields
ALTER TABLE public.rinks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.rinks ADD COLUMN IF NOT EXISTS source TEXT;