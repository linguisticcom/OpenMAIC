create table if not exists course_resources (
  id text primary key,
  organization_id text references organizations(id) on delete set null,
  uploaded_by_user_id text references portal_users(id) on delete set null,
  name text not null,
  mime_type text not null,
  size_bytes integer not null,
  storage_provider text not null default 'local',
  storage_key text not null,
  original_file_name text not null,
  checksum_sha256 text not null,
  summary text not null default '',
  excerpt text not null default '',
  text_length integer not null default 0,
  page_count integer,
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_resources_organization_id
  on course_resources(organization_id);

create index if not exists idx_course_resources_created_at
  on course_resources(created_at desc);

create index if not exists idx_course_resources_checksum_sha256
  on course_resources(checksum_sha256);
