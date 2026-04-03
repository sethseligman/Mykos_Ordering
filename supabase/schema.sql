-- Mykos Phase 1 Supabase schema
-- Requires pgcrypto extension for gen_random_uuid()

create extension if not exists pgcrypto;

-- Stores each tenant restaurant and the owning authenticated user.
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_owner_user_id_fkey
    foreign key (owner_user_id)
    references auth.users (id)
    on delete cascade
);

-- Stores vendor configuration and ordering preferences scoped to a restaurant.
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  name text not null,
  category text not null,
  rep_name text not null,
  order_days text[] not null,
  available_delivery_days text[] not null,
  preferred_delivery_days text[] not null,
  order_minimum numeric not null,
  order_cutoff_time text not null,
  order_placement_method text not null,
  destination text not null,
  supports_addons boolean not null,
  supports_standing_orders boolean not null,
  supports_history_suggestions boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on delete cascade,
  constraint vendors_order_placement_method_check
    check (order_placement_method in ('sms', 'email', 'portal'))
);

-- Stores the vendor catalog imported from order sheets for a restaurant.
create table if not exists public.vendor_catalog_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  vendor_id uuid not null,
  name text not null,
  unit text not null,
  -- Nullable because pack_size is optional in the current app type.
  pack_size text,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_catalog_items_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on delete cascade,
  constraint vendor_catalog_items_vendor_id_fkey
    foreign key (vendor_id)
    references public.vendors (id)
    on delete cascade,
  constraint vendor_catalog_items_vendor_display_order_unique
    unique (vendor_id, display_order)
);

-- Stores in-progress order drafts including item inclusion/quantity state.
create table if not exists public.order_drafts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  restaurant_id uuid not null,
  delivery_date date not null,
  items jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_drafts_vendor_id_fkey
    foreign key (vendor_id)
    references public.vendors (id)
    on delete cascade,
  constraint order_drafts_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on delete cascade
);

-- Stores finalized orders that were actually sent through a vendor channel.
create table if not exists public.finalized_orders (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  restaurant_id uuid not null,
  delivery_date date not null,
  items jsonb not null,
  message_text text not null,
  sent_at timestamptz not null,
  channel text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finalized_orders_vendor_id_fkey
    foreign key (vendor_id)
    references public.vendors (id)
    on delete cascade,
  constraint finalized_orders_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on delete cascade,
  constraint finalized_orders_channel_check
    check (channel in ('sms', 'email', 'portal'))
);

-- Stores send-attempt execution status for outbound order delivery actions.
create table if not exists public.execution_log (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  restaurant_id uuid not null,
  channel text not null,
  destination text not null,
  status text not null,
  sent_at timestamptz not null,
  -- Nullable: notes are optional on successful sends, required only when
  -- status is 'failed' to capture error details
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint execution_log_vendor_id_fkey
    foreign key (vendor_id)
    references public.vendors (id)
    on delete cascade,
  constraint execution_log_restaurant_id_fkey
    foreign key (restaurant_id)
    references public.restaurants (id)
    on delete cascade,
  constraint execution_log_channel_check
    check (channel in ('sms', 'email', 'portal')),
  constraint execution_log_status_check
    check (status in ('sent', 'failed', 'pending'))
);

-- Indexes
create index if not exists idx_vendors_restaurant_id
  on public.vendors (restaurant_id);

create index if not exists idx_vendor_catalog_items_restaurant_id
  on public.vendor_catalog_items (restaurant_id);

create index if not exists idx_vendor_catalog_items_vendor_id
  on public.vendor_catalog_items (vendor_id);

create index if not exists idx_order_drafts_restaurant_id
  on public.order_drafts (restaurant_id);

create index if not exists idx_order_drafts_vendor_id
  on public.order_drafts (vendor_id);

create index if not exists idx_order_drafts_delivery_date
  on public.order_drafts (delivery_date);

create index if not exists idx_finalized_orders_restaurant_id
  on public.finalized_orders (restaurant_id);

create index if not exists idx_finalized_orders_vendor_id
  on public.finalized_orders (vendor_id);

create index if not exists idx_finalized_orders_delivery_date
  on public.finalized_orders (delivery_date);

create index if not exists idx_finalized_orders_sent_at
  on public.finalized_orders (sent_at);

create index if not exists idx_execution_log_restaurant_id
  on public.execution_log (restaurant_id);

create index if not exists idx_execution_log_vendor_id
  on public.execution_log (vendor_id);

create index if not exists idx_execution_log_sent_at
  on public.execution_log (sent_at);

-- Helper: resolves the current user's restaurant ID from auth.users -> restaurants.owner_user_id
create or replace function public.get_current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.id
  from public.restaurants r
  where r.owner_user_id = auth.uid()
  limit 1;
$$;

-- Enable RLS on all tables
alter table public.restaurants enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_catalog_items enable row level security;
alter table public.order_drafts enable row level security;
alter table public.finalized_orders enable row level security;
alter table public.execution_log enable row level security;

-- RLS policies: restaurants table is self-scoped by owner_user_id
create policy restaurants_select_own
  on public.restaurants
  for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy restaurants_insert_own
  on public.restaurants
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy restaurants_update_own
  on public.restaurants
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy restaurants_delete_own
  on public.restaurants
  for delete
  to authenticated
  using (owner_user_id = auth.uid());

-- RLS policies: all tenant tables are scoped by restaurant_id
create policy vendors_select_own_restaurant
  on public.vendors
  for select
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy vendors_insert_own_restaurant
  on public.vendors
  for insert
  to authenticated
  with check (restaurant_id = public.get_current_restaurant_id());

create policy vendors_update_own_restaurant
  on public.vendors
  for update
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id())
  with check (restaurant_id = public.get_current_restaurant_id());

create policy vendors_delete_own_restaurant
  on public.vendors
  for delete
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy vendor_catalog_items_select_own_restaurant
  on public.vendor_catalog_items
  for select
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy vendor_catalog_items_insert_own_restaurant
  on public.vendor_catalog_items
  for insert
  to authenticated
  with check (restaurant_id = public.get_current_restaurant_id());

create policy vendor_catalog_items_update_own_restaurant
  on public.vendor_catalog_items
  for update
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id())
  with check (restaurant_id = public.get_current_restaurant_id());

create policy vendor_catalog_items_delete_own_restaurant
  on public.vendor_catalog_items
  for delete
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy order_drafts_select_own_restaurant
  on public.order_drafts
  for select
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy order_drafts_insert_own_restaurant
  on public.order_drafts
  for insert
  to authenticated
  with check (restaurant_id = public.get_current_restaurant_id());

create policy order_drafts_update_own_restaurant
  on public.order_drafts
  for update
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id())
  with check (restaurant_id = public.get_current_restaurant_id());

create policy order_drafts_delete_own_restaurant
  on public.order_drafts
  for delete
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy finalized_orders_select_own_restaurant
  on public.finalized_orders
  for select
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy finalized_orders_insert_own_restaurant
  on public.finalized_orders
  for insert
  to authenticated
  with check (restaurant_id = public.get_current_restaurant_id());

create policy finalized_orders_update_own_restaurant
  on public.finalized_orders
  for update
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id())
  with check (restaurant_id = public.get_current_restaurant_id());

create policy finalized_orders_delete_own_restaurant
  on public.finalized_orders
  for delete
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy execution_log_select_own_restaurant
  on public.execution_log
  for select
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());

create policy execution_log_insert_own_restaurant
  on public.execution_log
  for insert
  to authenticated
  with check (restaurant_id = public.get_current_restaurant_id());

create policy execution_log_update_own_restaurant
  on public.execution_log
  for update
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id())
  with check (restaurant_id = public.get_current_restaurant_id());

create policy execution_log_delete_own_restaurant
  on public.execution_log
  for delete
  to authenticated
  using (restaurant_id = public.get_current_restaurant_id());
