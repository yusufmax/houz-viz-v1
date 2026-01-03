
-- Create user_prompts table for custom templates
create table if not exists public.user_prompts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  prompt text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_prompts enable row level security;

-- Policies
create policy "Users can view their own prompts"
  on public.user_prompts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own prompts"
  on public.user_prompts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own prompts"
  on public.user_prompts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own prompts"
  on public.user_prompts for delete
  using (auth.uid() = user_id);

-- Create index for faster lookups
create index if not exists user_prompts_user_id_idx on public.user_prompts(user_id);
