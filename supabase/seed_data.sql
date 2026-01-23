-- 1. Delete all data in all tables (except settings and email_templates)
TRUNCATE TABLE students, sessions, tasks, attendance_records, task_submissions, sent_emails CASCADE;

-- 2. Create 20 students for each class (11A, 11B, 11C, 11D)
INSERT INTO students (name, class_name, parent_email, parent_name, parent_phone)
SELECT
  'Student ' || class || '-' || s.i AS name,
  class AS class_name,
  'parent.' || lower(class) || '.' || s.i || '@example.com' AS parent_email,
  'Parent ' || class || '-' || s.i AS parent_name,
  '555-' || class || '-' || to_char(s.i, 'FM000') AS parent_phone
FROM
  (VALUES ('11A'), ('11B'), ('11C'), ('11D')) AS classes(class)
  CROSS JOIN generate_series(1, 20) AS s(i);

-- 3. Create 12 tasks for each class (Math related)
INSERT INTO tasks (title, due_date, class_name)
SELECT
  CASE (t.i % 6)
    WHEN 0 THEN 'Linear Algebra Problem Set ' || t.i
    WHEN 1 THEN 'Calculus Integration Review ' || t.i
    WHEN 2 THEN 'Geometry Proofs Worksheet ' || t.i
    WHEN 3 THEN 'Statistics Data Analysis ' || t.i
    WHEN 4 THEN 'Trigonometry Functions Quiz ' || t.i
    ELSE 'Probability Theory Assignment ' || t.i
  END AS title,
  NOW() + (t.i || ' days')::interval AS due_date,
  class AS class_name
FROM
  (VALUES ('11A'), ('11B'), ('11C'), ('11D')) AS classes(class)
  CROSS JOIN generate_series(1, 12) AS t(i);

-- 4. Create 15 Sessions for each class (Math related, different times)
INSERT INTO sessions (title, start_time, end_time, class_name)
SELECT
  'Math Session ' || class || '-' || sess.i || ': ' || 
  CASE (sess.i % 5)
    WHEN 0 THEN 'Advanced Algebra'
    WHEN 1 THEN 'Calculus I'
    WHEN 2 THEN 'Geometry Workshop'
    WHEN 3 THEN 'Applied Statistics'
    ELSE 'Number Theory'
  END AS title,
  -- Different start times for each class to avoid overlap if needed, though they are separate classes
  -- 11A: 09:00, 11B: 10:30, 11C: 13:00, 11D: 14:30
  (CURRENT_DATE + (sess.i || ' days')::interval + 
    CASE class
      WHEN '11A' THEN '09:00:00'::time
      WHEN '11B' THEN '10:30:00'::time
      WHEN '11C' THEN '13:00:00'::time
      ELSE '14:30:00'::time
    END::interval) AS start_time,
  (CURRENT_DATE + (sess.i || ' days')::interval + 
    CASE class
      WHEN '11A' THEN '10:00:00'::time
      WHEN '11B' THEN '11:30:00'::time
      WHEN '11C' THEN '14:00:00'::time
      ELSE '15:30:00'::time
    END::interval) AS end_time,
  class AS class_name
FROM
  (VALUES ('11A'), ('11B'), ('11C'), ('11D')) AS classes(class)
  CROSS JOIN generate_series(1, 15) AS sess(i);

-- 5. Populate Attendance Records for all new sessions and students
INSERT INTO attendance_records (student_id, session_id, status)
SELECT s.id, ses.id, 'n/a'
FROM students s
JOIN sessions ses ON s.class_name = ses.class_name;

-- 6. Populate Task Submissions for all new tasks and students
INSERT INTO task_submissions (student_id, task_id, status)
SELECT s.id, t.id, 'Awaiting submission'
FROM students s
JOIN tasks t ON s.class_name = t.class_name;
