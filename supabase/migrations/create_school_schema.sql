create extension if not exists pgcrypto;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_name text not null check (class_name in ('11A','11B','11C','11D')),
  parent_email text not null,
  parent_name text not null,
  parent_phone text not null,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  class_name text not null check (class_name in ('11A','11B','11C','11D')),
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_date timestamptz not null,
  class_name text not null check (class_name in ('11A','11B','11C','11D')),
  created_at timestamptz default now()
);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  status text check (status in ('n/a','present','absent','late','truant','excused absence')) default 'n/a',
  updated_at timestamptz default now(),
  unique (student_id, session_id)
);

create table if not exists task_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  status text check (status in ('Submitted','Awaiting submission','Late','Non Submission')) default 'Awaiting submission',
  updated_at timestamptz default now(),
  unique (student_id, task_id)
);

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  violation_type text unique not null,
  subject text not null,
  body text not null
);

create table if not exists sent_emails (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body text not null,
  sent_at timestamptz default now(),
  violation_type text not null
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  auto_send_email boolean default false,
  email_delay_minutes integer default 0,
  task_late_submission_hours integer default 24
);

grant select on students to anon, authenticated;
grant select on sessions to anon, authenticated;
grant select on tasks to anon, authenticated;
grant select on attendance_records to anon, authenticated;
grant select on task_submissions to anon, authenticated;
grant select on email_templates to anon, authenticated;
grant select on sent_emails to anon, authenticated;
grant select on settings to anon, authenticated;

grant insert, update, delete on students to authenticated;
grant insert, update, delete on sessions to authenticated;
grant insert, update, delete on tasks to authenticated;
grant insert, update, delete on attendance_records to authenticated;
grant insert, update, delete on task_submissions to authenticated;
grant insert, update, delete on email_templates to authenticated;
grant insert, update, delete on sent_emails to authenticated;
grant insert, update, delete on settings to authenticated;

insert into students (name, class_name, parent_email, parent_name, parent_phone) values
('John Davis','11A','john.parent@email.com','Mary Davis','555-0101'),
('Sarah Johnson','11A','sarah.parent@email.com','Robert Johnson','555-0102'),
('Michael Brown','11A','michael.parent@email.com','Linda Brown','555-0103'),
('Emma Wilson','11A','emma.parent@email.com','David Wilson','555-0104'),
('James Miller','11B','james.parent@email.com','Patricia Miller','555-0201'),
('Lisa Garcia','11B','lisa.parent@email.com','Joseph Garcia','555-0202'),
('Robert Martinez','11B','robert.parent@email.com','Susan Martinez','555-0203'),
('Jennifer Lee','11B','jennifer.parent@email.com','Thomas Lee','555-0204'),
('William Taylor','11C','william.parent@email.com','Karen Taylor','555-0301'),
('Maria Anderson','11C','maria.parent@email.com','Christopher Anderson','555-0302'),
('David Thomas','11C','david.parent@email.com','Nancy Thomas','555-0303'),
('Linda Jackson','11C','linda.parent@email.com','Paul Jackson','555-0304'),
('Charles White','11D','charles.parent@email.com','Elizabeth White','555-0401'),
('Barbara Harris','11D','barbara.parent@email.com','Mark Harris','555-0402'),
('Joseph Clark','11D','joseph.parent@email.com','Dorothy Clark','555-0403'),
('Patricia Lewis','11D','patricia.parent@email.com','George Lewis','555-0404');

insert into sessions (title, start_time, end_time, class_name) values
('Algebra - Week 1', now() - interval '7 days', now() - interval '7 days' + interval '1 hour', '11A'),
('Physics - Lab', now() - interval '5 days', now() - interval '5 days' + interval '1 hour', '11A'),
('Chemistry - Review', now() - interval '3 days', now() - interval '3 days' + interval '1 hour', '11A'),
('History - Lecture', now() - interval '7 days', now() - interval '7 days' + interval '1 hour', '11B'),
('Biology - Field', now() - interval '4 days', now() - interval '4 days' + interval '1.5 hour', '11B'),
('Math - Drill', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', '11B'),
('English - Debate', now() - interval '6 days', now() - interval '6 days' + interval '1 hour', '11C'),
('IT - Coding', now() - interval '3 days', now() - interval '3 days' + interval '2 hours', '11C'),
('Art - Studio', now() - interval '1 days', now() - interval '1 days' + interval '1 hour', '11C'),
('Geography - Maps', now() - interval '8 days', now() - interval '8 days' + interval '1 hour', '11D'),
('Economics - Market', now() - interval '4 days', now() - interval '4 days' + interval '1 hour', '11D'),
('Music - Theory', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', '11D');

insert into tasks (title, due_date, class_name) values
('Essay on Climate', now() + interval '3 days','11A'),
('Algebra Homework', now() + interval '1 days','11A'),
('History Report', now() + interval '2 days','11B'),
('Biology Worksheet', now() + interval '4 days','11B'),
('English Presentation', now() + interval '5 days','11C'),
('IT Project', now() + interval '7 days','11C'),
('Geography Quiz', now() + interval '2 days','11D'),
('Economics Case Study', now() + interval '6 days','11D');

insert into attendance_records (student_id, session_id, status)
select stu.id, ses.id, 'n/a'
from students stu
join sessions ses on ses.class_name = stu.class_name;

insert into task_submissions (student_id, task_id, status)
select stu.id, t.id, 'Awaiting submission'
from students stu
join tasks t on t.class_name = stu.class_name;

insert into email_templates (violation_type, subject, body) values
('Late attendance','{STUDENT_NAME} was late to class','Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} was late to class today. Please ensure they arrive on time for future sessions.\n\nBest regards,\nTeacher'),
('Absent attendance','{STUDENT_NAME} was absent from class','Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} was absent from class today. Please provide a valid reason for their absence.\n\nBest regards,\nTeacher'),
('Truant attendance','{STUDENT_NAME} was truant from class','Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} was truant from class today. This is a serious matter that requires your immediate attention.\n\nBest regards,\nTeacher'),
('Late task submission','{STUDENT_NAME} submitted assignment late','Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} submitted their assignment after the deadline. Please encourage them to submit work on time.\n\nBest regards,\nTeacher'),
('Non Submission','{STUDENT_NAME} did not submit assignment','Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} did not submit their assignment. Please ensure they complete and submit their work promptly.\n\nBest regards,\nTeacher')
on conflict (violation_type) do nothing;

insert into settings (auto_send_email, email_delay_minutes, task_late_submission_hours)
values (false, 0, 24)
on conflict do nothing;

insert into sent_emails (student_id, recipient_email, subject, body, violation_type)
select stu.id, stu.parent_email,
  replace('{STUDENT_NAME} was late to class','{STUDENT_NAME}', stu.name),
  replace('Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} was late to class.\n\nBest regards,\nTeacher','{STUDENT_NAME}', stu.name),
  'Late attendance'
from students stu
where stu.class_name in ('11A','11B','11C','11D')
limit 4;
