
-- Create generation_history table
create table if not exists public.generation_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  image_url text not null,
  prompt text,
  style text,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.generation_history enable row level security;

-- Policies
create policy "Users can view their own history"
  on public.generation_history for select
  using (auth.uid() = user_id);

create policy "Users can insert their own history"
  on public.generation_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own history"
  on public.generation_history for delete
  using (auth.uid() = user_id);
