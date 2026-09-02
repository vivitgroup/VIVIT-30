alter table hospitality.properties alter column owner_id drop not null;

create table if not exists hospitality.property_owner_assignments (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references vgroup.business_units(id),
  property_id uuid not null references hospitality.properties(id) on delete cascade,
  owner_id uuid references hospitality.owners(id),
  changed_by uuid references vgroup.users(id),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  change_reason text,
  created_at timestamptz not null default now(),
  constraint property_owner_assignment_window_ck check (effective_to is null or effective_to >= effective_from)
);
create index if not exists property_owner_assignments_property_idx on hospitality.property_owner_assignments(property_id,effective_from desc);
create index if not exists property_owner_assignments_owner_idx on hospitality.property_owner_assignments(owner_id) where owner_id is not null;
create unique index if not exists property_owner_assignments_active_uq on hospitality.property_owner_assignments(property_id) where effective_to is null;
alter table hospitality.property_owner_assignments enable row level security;

create table if not exists hospitality.property_images (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references vgroup.business_units(id),
  property_id uuid not null references hospitality.properties(id) on delete cascade,
  bucket_id text not null default 'vgroup-hospitality' check (bucket_id='vgroup-hospitality'),
  object_path text not null,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  caption text,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_cover boolean not null default false,
  archived_at timestamptz,
  created_by uuid references vgroup.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bucket_id,object_path)
);
create index if not exists property_images_property_idx on hospitality.property_images(property_id,sort_order,created_at);
create unique index if not exists property_images_active_cover_uq on hospitality.property_images(property_id) where is_cover and archived_at is null;
alter table hospitality.property_images enable row level security;

create or replace function hospitality.set_property_owner(
  p_property_id uuid,
  p_owner_id uuid,
  p_changed_by uuid,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = hospitality,vgroup,public
as $$
declare v_bu uuid;
begin
  select business_unit_id into v_bu from hospitality.properties where id=p_property_id and archived_at is null for update;
  if v_bu is null then raise exception 'Property unavailable'; end if;
  if p_owner_id is not null and not exists(select 1 from hospitality.owners where id=p_owner_id and business_unit_id=v_bu and archived_at is null) then raise exception 'Owner unavailable'; end if;
  update hospitality.property_owner_assignments set effective_to=now() where property_id=p_property_id and effective_to is null;
  update hospitality.properties set owner_id=p_owner_id,updated_at=now() where id=p_property_id;
  insert into hospitality.property_owner_assignments(business_unit_id,property_id,owner_id,changed_by,change_reason) values(v_bu,p_property_id,p_owner_id,p_changed_by,nullif(trim(coalesce(p_reason,'')),''));
end $$;
revoke all on function hospitality.set_property_owner(uuid,uuid,uuid,text) from public;

do $$
begin
  insert into hospitality.property_owner_assignments(business_unit_id,property_id,owner_id,effective_from,change_reason)
  select p.business_unit_id,p.id,p.owner_id,p.created_at,'baseline ownership import'
  from hospitality.properties p
  where p.owner_id is not null and not exists(select 1 from hospitality.property_owner_assignments a where a.property_id=p.id and a.effective_to is null);
end $$;
