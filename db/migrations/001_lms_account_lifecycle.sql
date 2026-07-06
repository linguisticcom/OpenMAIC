create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text not null unique,
  logo_url text,
  description text not null default '',
  contact_email text not null default '',
  subscription_status text,
  welcome_message text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists cohorts (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  academic_year text,
  program_name text,
  created_at timestamptz not null
);

create table if not exists students (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  email text,
  external_student_id text,
  cohort_id text references cohorts(id) on delete set null,
  academic_year text,
  program_name text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create unique index if not exists students_org_lower_email_unique
  on students (organization_id, lower(email))
  where email is not null;

create table if not exists portal_users (
  id text primary key,
  organization_id text references organizations(id) on delete cascade,
  student_id text references students(id) on delete set null,
  name text not null,
  email text not null,
  password_hash text not null,
  role text not null check (
    role in ('platform-admin', 'organization-admin', 'teacher-manager', 'student')
  ),
  can_generate_access_codes boolean not null default false,
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  email_verified_at timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  session_version integer not null default 1,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create unique index if not exists portal_users_lower_email_unique
  on portal_users (lower(email));

create table if not exists courses (
  id text primary key,
  title text not null,
  slug text not null unique,
  description text not null default '',
  category text not null default '',
  level text,
  status text not null check (status in ('active', 'draft', 'locked', 'completed')),
  generated_by text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  estimated_duration_minutes integer,
  cover_asset text,
  cover_tone text,
  classroom_id text
);

create table if not exists course_modules (
  course_id text not null references courses(id) on delete cascade,
  id text not null,
  order_index integer not null,
  title text not null,
  description text not null default '',
  duration_minutes integer not null default 0,
  classroom_id text,
  primary key (course_id, id)
);

create table if not exists course_assignments (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  cohort_id text references cohorts(id) on delete set null,
  assigned_at timestamptz not null,
  assigned_by_user_id text not null references portal_users(id) on delete restrict,
  teacher_user_id text references portal_users(id) on delete set null
);

create unique index if not exists course_assignments_scope_unique
  on course_assignments (course_id, organization_id, coalesce(cohort_id, ''));

create table if not exists access_codes (
  id text primary key,
  code_hash text not null,
  organization_id text not null references organizations(id) on delete cascade,
  course_id text not null references courses(id) on delete cascade,
  cohort_id text references cohorts(id) on delete set null,
  student_id text references students(id) on delete set null,
  created_by_user_id text not null references portal_users(id) on delete restrict,
  expires_at timestamptz,
  max_uses integer,
  current_uses integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null,
  disabled_at timestamptz
);

create unique index if not exists access_codes_hash_scope_unique
  on access_codes (code_hash, organization_id, course_id, coalesce(cohort_id, ''));

create table if not exists enrollments (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  course_id text not null references courses(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  access_code_id text references access_codes(id) on delete set null,
  status text not null check (status in ('not_started', 'in_progress', 'completed')),
  progress_percentage integer not null default 0 check (
    progress_percentage >= 0 and progress_percentage <= 100
  ),
  started_at timestamptz not null,
  completed_at timestamptz,
  last_activity_at timestamptz
);

create unique index if not exists enrollments_student_course_org_unique
  on enrollments (student_id, course_id, organization_id);

create table if not exists activity_logs (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  student_id text references students(id) on delete set null,
  course_id text references courses(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create index if not exists activity_logs_org_created_idx
  on activity_logs (organization_id, created_at desc);

create table if not exists password_reset_tokens (
  id text primary key,
  user_id text not null references portal_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  requested_ip text
);

create index if not exists password_reset_tokens_user_idx
  on password_reset_tokens (user_id, created_at desc);

create table if not exists account_invitations (
  id text primary key,
  organization_id text references organizations(id) on delete cascade,
  email text not null,
  name text,
  role text not null check (
    role in ('organization-admin', 'teacher-manager', 'student')
  ),
  invited_by_user_id text not null references portal_users(id) on delete restrict,
  token_hash text not null unique,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'expired', 'revoked')
  ),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id text references portal_users(id) on delete set null
);

create index if not exists account_invitations_org_created_idx
  on account_invitations (organization_id, created_at desc);

create table if not exists email_verification_tokens (
  id text primary key,
  user_id text not null references portal_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists auth_audit_events (
  id text primary key,
  user_id text references portal_users(id) on delete set null,
  organization_id text references organizations(id) on delete set null,
  email text,
  action text not null,
  ip text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create index if not exists auth_audit_events_created_idx
  on auth_audit_events (created_at desc);
