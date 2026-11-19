-- ตารางของระบบ LMS (prefix web_) — รันใน Supabase > SQL Editor (สร้างไว้ให้แล้วผ่านตัวเชื่อม)
create table if not exists public.web_students(
 id text primary key, name text not null, room text not null default 'ห้อง 1',
 status text default 'กำลังศึกษา', password text not null,
 fs_exits int not null default 0, suspended_until timestamptz,
 suspend_scope text check (suspend_scope in ('work','all')), created_at timestamptz default now());
create table if not exists public.web_submissions(
 id bigserial primary key,
 student_id text not null references public.web_students(id) on delete cascade,
 unit int not null check (unit between 1 and 12),
 kind text not null check (kind in ('read','work','exam')),
 answer jsonb, score int, is_late boolean not null default false,
 submitted_at timestamptz not null default now(),
 unique(student_id,unit,kind));
alter table public.web_students enable row level security;
alter table public.web_submissions enable row level security;
create policy web_students_all on public.web_students for all to anon using(true) with check(true);
create policy web_submissions_all on public.web_submissions for all to anon using(true) with check(true);
-- เพิ่มนักศึกษา: insert into public.web_students(id,name,room,password) values('รหัส','ชื่อ-สกุล','ห้อง 1','รหัสผ่าน');
