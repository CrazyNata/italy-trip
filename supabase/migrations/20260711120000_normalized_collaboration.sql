begin;

create extension if not exists pgcrypto with schema extensions;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  start_date date,
  end_date date,
  people integer not null default 1 check (people >= 0),
  dogs integer not null default 0 check (dogs >= 0),
  legacy_id text unique,
  revision bigint not null default 0 check (revision >= 0),
  deleting boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create unique index trip_members_one_owner on public.trip_members(trip_id) where role = 'owner';

create table public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email <> ''),
  role text not null default 'viewer' check (role = 'viewer'),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index trip_invitations_one_pending_email on public.trip_invitations(trip_id, email) where status = 'pending';

create table public.trip_days (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  legacy_id text, day_date date, day_number integer not null default 0, month_label text not null default '',
  weekday_label text not null default '', city text not null default '', draft text not null default '',
  draft_time text, map_url text, position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (trip_id, id)
);
create table public.day_items (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  day_id uuid not null, legacy_id text, title text not null default '', done boolean not null default false,
  item_time text, map_url text, position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (trip_id, day_id) references public.trip_days(trip_id, id) on delete cascade,
  unique (trip_id, id)
);
create table public.lodgings (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  legacy_id text, slot text not null default '', city text not null default '', name text not null default '',
  dates_label text not null default '', price_label text not null default '', status text not null default '',
  free_cancel text, url text not null default '', notes text not null default '', photos jsonb not null default '[]',
  object_position text, object_positions jsonb not null default '[]', position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (trip_id, id)
);
create table public.places (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  legacy_id text, name text not null default '', city text not null default '', category_group text not null default '',
  subcategory text not null default '', done boolean not null default false, description text,
  walk_day integer, walk_order integer, longitude double precision, latitude double precision,
  photo_url text, photo_path text, position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (trip_id, id),
  check (longitude is null or longitude between -180 and 180), check (latitude is null or latitude between -90 and 90)
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  legacy_id text, label text not null default '', category text not null default '', amount numeric not null default 0,
  position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (trip_id, id)
);
create table public.notes (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null default 'general', body text not null default '', metadata jsonb not null default '{}',
  position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (trip_id, kind, position)
);
create table public.useful_links (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  legacy_id text, title text not null default '', url text not null default '', position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (trip_id, id)
);
create table public.trip_photos (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  legacy_id text, object_path text not null, thumbnail_path text, taken_on date,
  latitude double precision, longitude double precision, place text, position bigint not null default 0,
  pending_delete boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (trip_id, object_path),
  check (object_path like trip_id::text || '/%'),
  check (position between 0 and 9007199254740991)
);
create table public.legacy_trip_imports (
  source text primary key, trip_id uuid not null unique references public.trips(id) on delete restrict,
  imported_by uuid not null references auth.users(id) on delete restrict, imported_at timestamptz not null default now()
);
create index trip_days_order on public.trip_days(trip_id,position,id);
create index day_items_order on public.day_items(day_id,position,id);
create index lodgings_order on public.lodgings(trip_id,position,id);
create index places_order on public.places(trip_id,position,id);
create index expenses_order on public.expenses(trip_id,position,id);
create index useful_links_order on public.useful_links(trip_id,position,id);
create index trip_photos_order on public.trip_photos(trip_id,position,id);

create function public.set_updated_at() returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['trips','trip_members','trip_invitations','trip_days','day_items','lodgings','places','expenses','notes','useful_links','trip_photos'] loop
  execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
end loop; end $$;

create function public.add_owner_membership() returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin insert into public.trip_members(trip_id,user_id,role) values(new.id,new.owner_id,'owner'); return new; end $$;
revoke all on function public.add_owner_membership() from public;
create trigger add_owner_membership after insert on public.trips for each row execute function public.add_owner_membership();

create function public.is_trip_member(target_trip uuid) returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists(select 1 from public.trip_members m where m.trip_id=target_trip and m.user_id=auth.uid())
$$;
create function public.is_trip_owner(target_trip uuid) returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists(select 1 from public.trips t where t.id=target_trip and t.owner_id=auth.uid())
$$;
revoke all on function public.is_trip_member(uuid), public.is_trip_owner(uuid) from public;
grant execute on function public.is_trip_member(uuid), public.is_trip_owner(uuid) to authenticated;
create function public.trip_id_from_storage_path(object_name text) returns uuid language plpgsql stable security definer set search_path = pg_catalog, public, storage as $$
begin return nullif((storage.foldername(object_name))[1],'')::uuid; exception when invalid_text_representation then return null; end $$;
revoke all on function public.trip_id_from_storage_path(text) from public;
grant execute on function public.trip_id_from_storage_path(text) to authenticated;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invitations enable row level security;
alter table public.trip_days enable row level security;
alter table public.day_items enable row level security;
alter table public.lodgings enable row level security;
alter table public.places enable row level security;
alter table public.expenses enable row level security;
alter table public.notes enable row level security;
alter table public.useful_links enable row level security;
alter table public.trip_photos enable row level security;
alter table public.legacy_trip_imports enable row level security;

create policy trips_read on public.trips for select to authenticated using (public.is_trip_member(id));
create policy trips_create on public.trips for insert to authenticated with check (owner_id=auth.uid());
create policy trips_update on public.trips for update to authenticated using (public.is_trip_owner(id)) with check (owner_id=auth.uid());
create policy trips_delete on public.trips for delete to authenticated using (public.is_trip_owner(id));
create policy members_read on public.trip_members for select to authenticated using (public.is_trip_member(trip_id));
create policy members_owner_delete on public.trip_members for delete to authenticated using (public.is_trip_owner(trip_id) and role <> 'owner');
create policy invitations_read on public.trip_invitations for select to authenticated using (public.is_trip_owner(trip_id));
create policy legacy_imports_read on public.legacy_trip_imports for select to authenticated using (public.is_trip_member(trip_id));
do $$ declare t text; begin foreach t in array array['trip_days','day_items','lodgings','places','expenses','notes','useful_links','trip_photos'] loop
  execute format('create policy %I on public.%I for select to authenticated using (public.is_trip_member(trip_id))',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.is_trip_owner(trip_id))',t||'_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id))',t||'_update',t);
  execute format('create policy %I on public.%I for delete to authenticated using (public.is_trip_owner(trip_id))',t||'_delete',t);
end loop; end $$;

create function public.create_trip_invitation(target_trip uuid, target_email text, valid_for interval default interval '14 days')
returns table(invitation_id uuid, token text, expires_at timestamptz) language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare raw_token text := encode(extensions.gen_random_bytes(32),'hex'); new_id uuid; expiry timestamptz;
begin
  if not public.is_trip_owner(target_trip) then raise exception 'not trip owner' using errcode='42501'; end if;
  if lower(trim(target_email)) = '' then raise exception 'email required' using errcode='22023'; end if;
  if valid_for <= interval '0 seconds' or valid_for > interval '90 days' then raise exception 'invalid invitation duration' using errcode='22023'; end if;
  insert into public.trip_invitations(trip_id,email,token_hash,invited_by,expires_at)
  values(target_trip,lower(trim(target_email)),encode(extensions.digest(raw_token,'sha256'),'hex'),auth.uid(),now()+valid_for)
  returning id,trip_invitations.expires_at into new_id,expiry;
  return query select new_id,raw_token,expiry;
end $$;
create function public.revoke_trip_invitation(target_invitation uuid) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare target_trip uuid; begin
  select trip_id into target_trip from public.trip_invitations where id=target_invitation for update;
  if target_trip is null or not public.is_trip_owner(target_trip) then raise exception 'not trip owner' using errcode='42501'; end if;
  update public.trip_invitations set status='revoked',revoked_at=now() where id=target_invitation and status='pending';
end $$;
create function public.accept_trip_invitation(raw_token text) returns uuid language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare invitation public.trip_invitations%rowtype; caller_email text; begin
  select lower(trim(email)) into caller_email from auth.users where id=auth.uid();
  if caller_email is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into invitation from public.trip_invitations
    where token_hash=encode(extensions.digest(raw_token,'sha256'),'hex') for update;
  if invitation.id is null or invitation.status <> 'pending' or invitation.expires_at <= now() then raise exception 'invalid or expired invitation' using errcode='22023'; end if;
  if invitation.email <> caller_email then raise exception 'invitation email mismatch' using errcode='42501'; end if;
  insert into public.trip_members(trip_id,user_id,role) values(invitation.trip_id,auth.uid(),'viewer')
    on conflict(trip_id,user_id) do update set role=case when public.trip_members.role='owner' then 'owner' else 'viewer' end;
  update public.trip_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=invitation.id;
  return invitation.trip_id;
end $$;
revoke all on function public.create_trip_invitation(uuid,text,interval), public.revoke_trip_invitation(uuid), public.accept_trip_invitation(text) from public;
grant execute on function public.create_trip_invitation(uuid,text,interval), public.revoke_trip_invitation(uuid), public.accept_trip_invitation(text) to authenticated;

create function public.legacy_uuid_or_new(source_id text, destination regclass) returns uuid language plpgsql volatile set search_path = pg_catalog, public as $$
declare candidate uuid; occupied boolean;
begin
  begin candidate := source_id::uuid; exception when invalid_text_representation or null_value_not_allowed then return gen_random_uuid(); end;
  execute format('select exists(select 1 from %s where id=$1)',destination) into occupied using candidate;
  if occupied then return gen_random_uuid(); end if;
  return candidate;
end $$;
revoke all on function public.legacy_uuid_or_new(text,regclass) from public;

create function public.list_trip_members(target_trip uuid)
returns table(trip_id uuid,user_id uuid,email text,role text,created_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public as $$
  select m.trip_id,m.user_id,coalesce(u.email,''),m.role,m.created_at
  from public.trip_members m join auth.users u on u.id=m.user_id
  where m.trip_id=target_trip and public.is_trip_member(target_trip)
  order by case m.role when 'owner' then 0 else 1 end,lower(u.email),m.user_id
$$;
revoke all on function public.list_trip_members(uuid) from public;
grant execute on function public.list_trip_members(uuid) to authenticated;

create function public.import_legacy_main_trip() returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare owner_uuid uuid; payload jsonb; data jsonb; new_trip uuid; d jsonb; d_id uuid; pos bigint; item jsonb; item_pos bigint;
begin
  select trip_id into new_trip from public.legacy_trip_imports where source='trip_state:main'; if new_trip is not null then return new_trip; end if;
  perform pg_advisory_xact_lock(hashtext('trip_state:main'));
  select trip_id into new_trip from public.legacy_trip_imports where source='trip_state:main'; if new_trip is not null then return new_trip; end if;
  select u.id into owner_uuid from auth.users u join public.admins a on lower(trim(a.email))=lower(trim(u.email)) order by lower(trim(u.email)),u.id limit 1;
  if owner_uuid is null then raise exception 'no auth user matches admins' using errcode='P0002'; end if;
  if auth.uid() <> owner_uuid then raise exception 'only the selected legacy owner may import' using errcode='42501'; end if;
  select s.payload::jsonb into payload from public.trip_state s where s.id='main';
  if payload is null or jsonb_typeof(payload->'data') <> 'object' then raise exception 'trip_state.main is missing or invalid' using errcode='22023'; end if;
  data:=payload->'data';
  insert into public.trips(owner_id,name,start_date,end_date,people,dogs,legacy_id)
  values(owner_uuid,'Поездка в Италию',nullif(data#>>'{trip,start}','')::date,nullif(data#>>'{trip,end}','')::date,
    coalesce((data#>>'{trip,people}')::integer,1),coalesce((data#>>'{trip,dogs}')::integer,0),'trip_state:main') returning id into new_trip;
  for d,pos in select value,ordinality-1 from jsonb_array_elements(coalesce(data->'days','[]')) with ordinality loop
    insert into public.trip_days(id,trip_id,legacy_id,day_date,day_number,month_label,weekday_label,city,draft,draft_time,map_url,position)
    values(public.legacy_uuid_or_new(d->>'id','public.trip_days'::regclass),new_trip,d->>'id',nullif(d->>'iso','')::date,coalesce((d->>'dayNum')::int,0),coalesce(d->>'month',''),coalesce(d->>'weekday',''),coalesce(d->>'city',''),coalesce(d->>'draft',''),d->>'draftTime',d->>'dayMapUrl',pos) returning id into d_id;
    for item,item_pos in select value,ordinality-1 from jsonb_array_elements(coalesce(d->'items','[]')) with ordinality loop
      insert into public.day_items(id,trip_id,day_id,legacy_id,title,done,item_time,map_url,position) values(public.legacy_uuid_or_new(item->>'id','public.day_items'::regclass),new_trip,d_id,item->>'id',coalesce(item->>'title',''),coalesce((item->>'done')::boolean,false),item->>'time',item->>'mapUrl',item_pos);
    end loop;
  end loop;
  insert into public.lodgings(id,trip_id,legacy_id,slot,city,name,dates_label,price_label,status,free_cancel,url,notes,photos,object_position,object_positions,position)
    select public.legacy_uuid_or_new(x->>'id','public.lodgings'::regclass),new_trip,x->>'id',coalesce(x->>'slot',''),coalesce(x->>'city',''),coalesce(x->>'name',''),coalesce(x->>'dates',''),coalesce(x->>'price',''),coalesce(x->>'status',''),x->>'freeCancel',coalesce(x->>'link',''),coalesce(x->>'notes',''),coalesce(x->'photos','[]'),x->>'objPos',coalesce(x->'objPosList','[]'),n-1 from jsonb_array_elements(coalesce(data->'lodging','[]')) with ordinality q(x,n);
  insert into public.places(id,trip_id,legacy_id,name,city,category_group,subcategory,done,description,walk_day,walk_order,longitude,latitude,photo_url,photo_path,position)
    select public.legacy_uuid_or_new(x->>'id','public.places'::regclass),new_trip,x->>'id',coalesce(x->>'name',''),coalesce(x->>'city',''),coalesce(x->>'group',''),coalesce(x->>'subcategory',''),coalesce((x->>'done')::boolean,false),x->>'description',nullif(x->>'walkDay','')::int,nullif(x->>'walkOrder','')::int,nullif(x#>>'{lnglat,0}','')::float8,nullif(x#>>'{lnglat,1}','')::float8,x->>'photo',x->>'photoPath',n-1 from jsonb_array_elements(coalesce(data->'sights','[]')) with ordinality q(x,n);
  insert into public.expenses(id,trip_id,legacy_id,label,category,amount,position) select public.legacy_uuid_or_new(x->>'id','public.expenses'::regclass),new_trip,x->>'id',coalesce(x->>'label',''),coalesce(x->>'category',''),coalesce((x->>'amount')::numeric,0),n-1 from jsonb_array_elements(coalesce(data->'expenses','[]')) with ordinality q(x,n);
  insert into public.notes(trip_id,kind,body,metadata,position) values(new_trip,'general',coalesce(data->>'notes',''),jsonb_build_object('romeSightsV',coalesce(data->'romeSightsV','0'),'budgetV',coalesce(data->'budgetV','0')),0);
  insert into public.useful_links(id,trip_id,legacy_id,title,url,position) select public.legacy_uuid_or_new(x->>'id','public.useful_links'::regclass),new_trip,x->>'id',coalesce(x->>'title',''),coalesce(x->>'url',''),n-1 from jsonb_array_elements(coalesce(data->'links','[]')) with ordinality q(x,n);
  insert into public.legacy_trip_imports(source,trip_id,imported_by) values('trip_state:main',new_trip,owner_uuid);
  return new_trip;
end $$;
revoke all on function public.import_legacy_main_trip() from public;
grant execute on function public.import_legacy_main_trip() to authenticated;

create function public.save_trip_aggregate(target_trip uuid, payload jsonb, payload_version integer, expected_revision bigint)
returns bigint language plpgsql security definer set search_path = pg_catalog, public as $$
declare current_revision bigint; d jsonb; d_id uuid; pos bigint; item jsonb; item_pos bigint; next_revision bigint;
begin
  if auth.uid() is null or not public.is_trip_owner(target_trip) then raise exception 'not trip owner' using errcode='42501'; end if;
  select revision into current_revision from public.trips where id=target_trip and not deleting for update;
  if current_revision is null then raise exception 'trip not found or deleting' using errcode='P0002'; end if;
  if current_revision <> expected_revision then raise exception 'trip revision conflict' using errcode='40001', detail=current_revision::text; end if;
  if payload_version <> 42 or jsonb_typeof(payload) <> 'object'
    or jsonb_typeof(payload->'trip') <> 'object'
    or jsonb_typeof(payload->'days') <> 'array'
    or jsonb_typeof(payload->'lodging') <> 'array'
    or jsonb_typeof(payload->'sights') <> 'array'
    or jsonb_typeof(payload->'expenses') <> 'array'
    or jsonb_typeof(payload->'links') <> 'array'
    or jsonb_typeof(payload->'notes') <> 'string'
    or jsonb_typeof(payload#>'{trip,start}') <> 'string'
    or jsonb_typeof(payload#>'{trip,end}') <> 'string'
    or jsonb_typeof(payload#>'{trip,people}') <> 'number'
    or jsonb_typeof(payload#>'{trip,dogs}') <> 'number'
    or jsonb_typeof(payload->'romeSightsV') <> 'number'
    or jsonb_typeof(payload->'budgetV') <> 'number'
  then raise exception 'invalid trip payload' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(payload->'days') x where jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'id') <> 'string' or jsonb_typeof(x->'iso') <> 'string' or jsonb_typeof(x->'dayNum') <> 'number' or jsonb_typeof(x->'month') <> 'string' or jsonb_typeof(x->'weekday') <> 'string' or jsonb_typeof(x->'city') <> 'string' or jsonb_typeof(x->'draft') <> 'string' or jsonb_typeof(x->'items') <> 'array')
    or exists(select 1 from jsonb_array_elements(payload->'days') d cross join lateral jsonb_array_elements(case when jsonb_typeof(d->'items')='array' then d->'items' else '[]'::jsonb end) x where jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'id') <> 'string' or jsonb_typeof(x->'title') <> 'string' or jsonb_typeof(x->'done') <> 'boolean')
    or exists(select 1 from jsonb_array_elements(payload->'lodging') x where jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'id') <> 'string' or jsonb_typeof(x->'slot') <> 'string' or jsonb_typeof(x->'city') <> 'string' or jsonb_typeof(x->'name') <> 'string' or jsonb_typeof(x->'dates') <> 'string' or jsonb_typeof(x->'price') <> 'string' or jsonb_typeof(x->'status') <> 'string' or jsonb_typeof(x->'link') <> 'string' or jsonb_typeof(x->'notes') <> 'string')
    or exists(select 1 from jsonb_array_elements(payload->'sights') x where jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'id') <> 'string' or jsonb_typeof(x->'name') <> 'string' or jsonb_typeof(x->'city') <> 'string' or jsonb_typeof(x->'group') <> 'string' or jsonb_typeof(x->'subcategory') <> 'string' or jsonb_typeof(x->'done') <> 'boolean')
    or exists(select 1 from jsonb_array_elements(payload->'expenses') x where jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'id') <> 'string' or jsonb_typeof(x->'label') <> 'string' or jsonb_typeof(x->'category') <> 'string' or jsonb_typeof(x->'amount') <> 'number')
    or exists(select 1 from jsonb_array_elements(payload->'links') x where jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'id') <> 'string' or jsonb_typeof(x->'title') <> 'string' or jsonb_typeof(x->'url') <> 'string')
  then raise exception 'invalid trip payload' using errcode='22023'; end if;

  update public.trips set
    start_date=nullif(payload#>>'{trip,start}','')::date,
    end_date=nullif(payload#>>'{trip,end}','')::date,
    people=(payload#>>'{trip,people}')::integer,
    dogs=(payload#>>'{trip,dogs}')::integer
  where id=target_trip;

  delete from public.day_items where trip_id=target_trip;
  delete from public.trip_days where trip_id=target_trip;
  delete from public.lodgings where trip_id=target_trip;
  delete from public.places where trip_id=target_trip;
  delete from public.expenses where trip_id=target_trip;
  delete from public.useful_links where trip_id=target_trip;
  delete from public.notes where trip_id=target_trip;

  for d,pos in select value,ordinality-1 from jsonb_array_elements(payload->'days') with ordinality loop
    if jsonb_typeof(d) <> 'object' or jsonb_typeof(d->'items') <> 'array' then raise exception 'invalid day payload' using errcode='22023'; end if;
    insert into public.trip_days(trip_id,legacy_id,day_date,day_number,month_label,weekday_label,city,draft,draft_time,map_url,position)
    values(target_trip,d->>'id',nullif(d->>'iso','')::date,(d->>'dayNum')::integer,d->>'month',d->>'weekday',d->>'city',d->>'draft',d->>'draftTime',d->>'dayMapUrl',pos)
    returning id into d_id;
    for item,item_pos in select value,ordinality-1 from jsonb_array_elements(d->'items') with ordinality loop
      insert into public.day_items(trip_id,day_id,legacy_id,title,done,item_time,map_url,position)
      values(target_trip,d_id,item->>'id',item->>'title',(item->>'done')::boolean,item->>'time',item->>'mapUrl',item_pos);
    end loop;
  end loop;

  insert into public.lodgings(trip_id,legacy_id,slot,city,name,dates_label,price_label,status,free_cancel,url,notes,photos,object_position,object_positions,position)
    select target_trip,x->>'id',x->>'slot',x->>'city',x->>'name',x->>'dates',x->>'price',x->>'status',x->>'freeCancel',x->>'link',x->>'notes',coalesce(x->'photos','[]'),x->>'objPos',coalesce(x->'objPosList','[]'),n-1
    from jsonb_array_elements(payload->'lodging') with ordinality q(x,n);
  insert into public.places(trip_id,legacy_id,name,city,category_group,subcategory,done,description,walk_day,walk_order,longitude,latitude,photo_url,photo_path,position)
    select target_trip,x->>'id',x->>'name',x->>'city',x->>'group',x->>'subcategory',(x->>'done')::boolean,x->>'description',nullif(x->>'walkDay','')::integer,nullif(x->>'walkOrder','')::integer,nullif(x#>>'{lnglat,0}','')::double precision,nullif(x#>>'{lnglat,1}','')::double precision,x->>'photo',x->>'photoPath',n-1
    from jsonb_array_elements(payload->'sights') with ordinality q(x,n);
  insert into public.expenses(trip_id,legacy_id,label,category,amount,position)
    select target_trip,x->>'id',x->>'label',x->>'category',(x->>'amount')::numeric,n-1 from jsonb_array_elements(payload->'expenses') with ordinality q(x,n);
  insert into public.useful_links(trip_id,legacy_id,title,url,position)
    select target_trip,x->>'id',x->>'title',x->>'url',n-1 from jsonb_array_elements(payload->'links') with ordinality q(x,n);
  insert into public.notes(trip_id,kind,body,metadata,position)
    values(target_trip,'general',payload->>'notes',jsonb_build_object('romeSightsV',(payload->>'romeSightsV')::integer,'budgetV',(payload->>'budgetV')::integer),0);

  next_revision := current_revision + 1;
  update public.trips set revision=next_revision where id=target_trip;
  return next_revision;
exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
  raise exception 'invalid trip payload' using errcode='22023';
end $$;

create function public.update_trip_photo_place(target_trip uuid, target_photo uuid, target_place text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_trip_owner(target_trip) then raise exception 'not trip owner' using errcode='42501'; end if;
  update public.trip_photos set place=nullif(trim(target_place),'') where trip_id=target_trip and id=target_photo and not pending_delete;
  if not found then raise exception 'photo not found' using errcode='P0002'; end if;
end $$;

create function public.prepare_trip_photo_delete(target_trip uuid, target_photo uuid)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare target_path text;
begin
  if not public.is_trip_owner(target_trip) then raise exception 'not trip owner' using errcode='42501'; end if;
  update public.trip_photos set pending_delete=true where trip_id=target_trip and id=target_photo returning object_path into target_path;
  if target_path is null then raise exception 'photo not found' using errcode='P0002'; end if;
  return target_path;
end $$;
create function public.finalize_trip_photo_delete(target_trip uuid, target_photo uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_trip_owner(target_trip) then raise exception 'not trip owner' using errcode='42501'; end if;
  delete from public.trip_photos where trip_id=target_trip and id=target_photo and pending_delete;
end $$;

create function public.prepare_trip_delete(target_trip uuid)
returns setof text language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_trip_owner(target_trip) then raise exception 'not trip owner' using errcode='42501'; end if;
  update public.trips set deleting=true where id=target_trip;
  return query select object_path from public.trip_photos where trip_id=target_trip order by object_path;
end $$;
create function public.finalize_trip_delete(target_trip uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_trip_owner(target_trip) then raise exception 'not trip owner' using errcode='42501'; end if;
  delete from public.trips where id=target_trip and deleting;
  if not found then raise exception 'trip deletion not prepared' using errcode='55000'; end if;
end $$;

revoke all on function public.save_trip_aggregate(uuid,jsonb,integer,bigint), public.update_trip_photo_place(uuid,uuid,text), public.prepare_trip_photo_delete(uuid,uuid), public.finalize_trip_photo_delete(uuid,uuid), public.prepare_trip_delete(uuid), public.finalize_trip_delete(uuid) from public;
grant execute on function public.save_trip_aggregate(uuid,jsonb,integer,bigint), public.update_trip_photo_place(uuid,uuid,text), public.prepare_trip_photo_delete(uuid,uuid), public.finalize_trip_photo_delete(uuid,uuid), public.prepare_trip_delete(uuid), public.finalize_trip_delete(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('trip-photos','trip-photos',false,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif']) on conflict(id) do update set public=false;
create policy trip_photos_storage_read on storage.objects for select to authenticated using (bucket_id='trip-photos' and public.is_trip_member(public.trip_id_from_storage_path(name)));
create policy trip_photos_storage_insert on storage.objects for insert to authenticated with check (bucket_id='trip-photos' and public.is_trip_owner(public.trip_id_from_storage_path(name)) and not exists(select 1 from public.trips where id=public.trip_id_from_storage_path(name) and deleting));
create policy trip_photos_storage_update on storage.objects for update to authenticated using (bucket_id='trip-photos' and public.is_trip_owner(public.trip_id_from_storage_path(name))) with check (bucket_id='trip-photos' and public.is_trip_owner(public.trip_id_from_storage_path(name)));
create policy trip_photos_storage_delete on storage.objects for delete to authenticated using (bucket_id='trip-photos' and public.is_trip_owner(public.trip_id_from_storage_path(name)));

do $$ declare t text; begin foreach t in array array['trips','trip_members','trip_invitations','trip_days','day_items','lodgings','places','expenses','notes','useful_links','trip_photos'] loop
  execute format('alter table public.%I replica identity full',t);
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
end loop; end $$;

grant select on public.trips,public.trip_members,public.trip_invitations,public.trip_days,public.day_items,public.lodgings,public.places,public.expenses,public.notes,public.useful_links,public.trip_photos to authenticated;
grant insert(owner_id,name) on public.trips to authenticated;
grant update(name) on public.trips to authenticated;
grant insert(id,trip_id,object_path,thumbnail_path,taken_on,latitude,longitude,place,position) on public.trip_photos to authenticated;
grant select on public.legacy_trip_imports to authenticated;

commit;
