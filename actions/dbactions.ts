import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gjuvttdapczfpltrrbxr.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdXZ0dGRhcGN6ZnBsdHJyYnhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA3NzIzNywiZXhwIjoyMDg0NjUzMjM3fQ.Hlc4Xx8xm81z1-NNp3as4nPza7RAW5m2OnXoNq-Ot-Y'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Types
export type ClassName = '11A' | '11B' | '11C' | '11D'
export const AVAILABLE_CLASSES: ClassName[] = ['11A', '11B', '11C', '11D']

export interface Student {
  id: string
  name: string
  class_name: ClassName
  parent_email: string
  parent_name: string
  parent_phone: string
}

export interface Session {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  class_name: ClassName
  created_at: string
}

export interface Task {
  id: string
  title: string
  due_date: string
  class_name: ClassName
  created_at: string
}

export type AttendanceStatus = 'n/a' | 'present' | 'absent' | 'late' | 'truant' | 'excused absence'
export type TaskStatus = 'Submitted' | 'Awaiting submission' | 'Late' | 'Non Submission'

export interface AttendanceRecord {
  id: string
  student_id: string
  session_id: string
  status: AttendanceStatus
  updated_at: string
  notification_status?: 'pending' | 'sent' | 'dismissed'
}

export interface TaskSubmission {
  id: string
  student_id: string
  task_id: string
  status: TaskStatus
  updated_at: string
  notification_status?: 'pending' | 'sent' | 'dismissed'
}

export interface EmailTemplate {
  id: string
  violation_type: string
  subject: string
  body: string
}

export interface SentEmail {
  id: string
  student_id: string
  recipient_email: string
  subject: string
  body: string
  sent_at: string
  violation_type: string
}

export interface Settings {
  id: string
  auto_send_email: boolean
  email_delay_minutes: number
  task_late_submission_hours: number
}

// Database initialization and sample data
export async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    const { error: studentsError } = await supabase.from('students').select('*').limit(1)
    if (studentsError && studentsError.code === 'PGRST116') {
      // Tables don't exist, create them
      await createTables()
      await insertSampleData()
    }

    // Ensure notification columns exist (migration for existing databases)
    await ensureNotificationColumns()
    // Migrate sessions schema
    await migrateSessionsSchema()
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}

async function ensureNotificationColumns() {
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'notification_status') THEN
            ALTER TABLE attendance_records ADD COLUMN notification_status TEXT CHECK (notification_status IN ('pending', 'sent', 'dismissed'));
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_submissions' AND column_name = 'notification_status') THEN
            ALTER TABLE task_submissions ADD COLUMN notification_status TEXT CHECK (notification_status IN ('pending', 'sent', 'dismissed'));
          END IF;
        END $$;
      `
    })
  } catch (error) {
    console.error('Error ensuring notification columns:', error)
  }
}

export async function migrateSessionsSchema() {
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          -- Add date column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'date') THEN
            ALTER TABLE sessions ADD COLUMN date DATE;
            -- Update existing records to use date from start_time
            UPDATE sessions SET date = start_time::DATE;
            ALTER TABLE sessions ALTER COLUMN date SET NOT NULL;
            ALTER TABLE sessions ALTER COLUMN date SET DEFAULT CURRENT_DATE;
          END IF;

          -- Change start_time to TIME if it's not already
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'start_time' AND data_type LIKE 'timestamp%') THEN
            ALTER TABLE sessions ALTER COLUMN start_time TYPE TIME USING start_time::TIME;
          END IF;

          -- Change end_time to TIME if it's not already
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'end_time' AND data_type LIKE 'timestamp%') THEN
            ALTER TABLE sessions ALTER COLUMN end_time TYPE TIME USING end_time::TIME;
          END IF;
        END $$;
      `
    })
  } catch (error) {
    console.error('Error migrating sessions schema:', error)
  }
}

async function createTables() {
  // Students table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        class_name TEXT NOT NULL CHECK (class_name IN ('11A', '11B', '11C', '11D')),
        parent_email TEXT NOT NULL,
        parent_name TEXT NOT NULL,
        parent_phone TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  })

  // Sessions table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        class_name TEXT NOT NULL CHECK (class_name IN ('11A', '11B', '11C', '11D')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  })

  // Tasks table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        class_name TEXT NOT NULL CHECK (class_name IN ('11A', '11B', '11C', '11D')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  })

  // Attendance records table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE attendance_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        status TEXT CHECK (status IN ('n/a', 'present', 'absent', 'late', 'truant', 'excused absence')) DEFAULT 'n/a',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, session_id)
      );
    `
  })

  // Task submissions table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE task_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        status TEXT CHECK (status IN ('Submitted', 'Awaiting submission', 'Late', 'Non Submission')) DEFAULT 'Awaiting submission',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, task_id)
      );
    `
  })

  // Email templates table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_type TEXT UNIQUE NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL
      );
    `
  })

  // Sent emails table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE sent_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        violation_type TEXT NOT NULL
      );
    `
  })

  // Settings table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auto_send_email BOOLEAN DEFAULT false,
        email_delay_minutes INTEGER DEFAULT 0,
        task_late_submission_hours INTEGER DEFAULT 24
      );
    `
  })

  // Grant permissions
  await supabase.rpc('exec_sql', {
    sql: `
      GRANT SELECT ON students TO anon, authenticated;
      GRANT SELECT ON sessions TO anon, authenticated;
      GRANT SELECT ON tasks TO anon, authenticated;
      GRANT SELECT ON attendance_records TO anon, authenticated;
      GRANT SELECT ON task_submissions TO anon, authenticated;
      GRANT SELECT ON email_templates TO anon, authenticated;
      GRANT SELECT ON sent_emails TO anon, authenticated;
      GRANT SELECT ON settings TO anon, authenticated;
      
      GRANT INSERT, UPDATE, DELETE ON students TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON sessions TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON tasks TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON attendance_records TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON task_submissions TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON email_templates TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON sent_emails TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON settings TO authenticated;
    `
  })
}

async function insertSampleData() {
  // Insert sample students
  const sampleStudents = [
    // 11A students
    { name: 'John Davis', class_name: '11A', parent_email: 'john.parent@email.com', parent_name: 'Mary Davis', parent_phone: '555-0101' },
    { name: 'Sarah Johnson', class_name: '11A', parent_email: 'sarah.parent@email.com', parent_name: 'Robert Johnson', parent_phone: '555-0102' },
    { name: 'Michael Brown', class_name: '11A', parent_email: 'michael.parent@email.com', parent_name: 'Linda Brown', parent_phone: '555-0103' },
    { name: 'Emma Wilson', class_name: '11A', parent_email: 'emma.parent@email.com', parent_name: 'David Wilson', parent_phone: '555-0104' },
    
    // 11B students
    { name: 'James Miller', class_name: '11B', parent_email: 'james.parent@email.com', parent_name: 'Patricia Miller', parent_phone: '555-0201' },
    { name: 'Lisa Garcia', class_name: '11B', parent_email: 'lisa.parent@email.com', parent_name: 'Joseph Garcia', parent_phone: '555-0202' },
    { name: 'Robert Martinez', class_name: '11B', parent_email: 'robert.parent@email.com', parent_name: 'Susan Martinez', parent_phone: '555-0203' },
    { name: 'Jennifer Lee', class_name: '11B', parent_email: 'jennifer.parent@email.com', parent_name: 'Thomas Lee', parent_phone: '555-0204' },
    
    // 11C students
    { name: 'William Taylor', class_name: '11C', parent_email: 'william.parent@email.com', parent_name: 'Karen Taylor', parent_phone: '555-0301' },
    { name: 'Maria Anderson', class_name: '11C', parent_email: 'maria.parent@email.com', parent_name: 'Christopher Anderson', parent_phone: '555-0302' },
    { name: 'David Thomas', class_name: '11C', parent_email: 'david.parent@email.com', parent_name: 'Nancy Thomas', parent_phone: '555-0303' },
    { name: 'Linda Jackson', class_name: '11C', parent_email: 'linda.parent@email.com', parent_name: 'Paul Jackson', parent_phone: '555-0304' },
    
    // 11D students
    { name: 'Charles White', class_name: '11D', parent_email: 'charles.parent@email.com', parent_name: 'Elizabeth White', parent_phone: '555-0401' },
    { name: 'Barbara Harris', class_name: '11D', parent_email: 'barbara.parent@email.com', parent_name: 'Mark Harris', parent_phone: '555-0402' },
    { name: 'Joseph Clark', class_name: '11D', parent_email: 'joseph.parent@email.com', parent_name: 'Dorothy Clark', parent_phone: '555-0403' },
    { name: 'Patricia Lewis', class_name: '11D', parent_email: 'patricia.parent@email.com', parent_name: 'George Lewis', parent_phone: '555-0404' },
  ]

  const { data: students } = await supabase.from('students').insert(sampleStudents).select()

  // Insert email templates
  const emailTemplates = [
    {
      violation_type: 'Late attendance',
      subject: '{STUDENT_NAME} was late to class',
      body: 'Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} was late to class today. Please ensure they arrive on time for future sessions.\n\nBest regards,\nTeacher'
    },
    {
      violation_type: 'Absent attendance',
      subject: '{STUDENT_NAME} was absent from class',
      body: 'Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} was absent from class today. Please provide a valid reason for their absence.\n\nBest regards,\nTeacher'
    },
    {
      violation_type: 'Truant attendance',
      subject: '{STUDENT_NAME} was truant from class',
      body: 'Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} was truant from class today. This is a serious matter that requires your immediate attention.\n\nBest regards,\nTeacher'
    },
    {
      violation_type: 'Late task submission',
      subject: '{STUDENT_NAME} submitted assignment late',
      body: 'Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} submitted their assignment after the deadline. Please encourage them to submit work on time.\n\nBest regards,\nTeacher'
    },
    {
      violation_type: 'Non Submission',
      subject: '{STUDENT_NAME} did not submit assignment',
      body: 'Dear {PARENT_NAME},\n\nThis is to inform you that your child {STUDENT_NAME} did not submit their assignment. Please ensure they complete and submit their work promptly.\n\nBest regards,\nTeacher'
    }
  ]

  await supabase.from('email_templates').insert(emailTemplates)

  // Insert settings
  await supabase.from('settings').insert([{
    auto_send_email: false,
    email_delay_minutes: 0,
    task_late_submission_hours: 24
  }])

  return students
}

// Student operations
export async function getStudentsByClass(className: ClassName) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_name', className)
    .order('name')
  
  if (error) throw error
  return data
}

export async function getStudentById(studentId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()
  
  if (error) throw error
  return data
}

export async function createStudent(student: Omit<Student, 'id'>) {
  const { data, error } = await supabase
    .from('students')
    .insert([student])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteStudent(studentId: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId)
  
  if (error) throw error
}

// Session operations
export async function getSessionsByClass(className: ClassName) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('class_name', className)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createSession(session: Omit<Session, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('sessions')
    .insert([session])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function createSessions(sessions: Omit<Session, 'id' | 'created_at'>[]) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessions)
    .select()
  
  if (error) throw error
  return data
}

export async function deleteSession(sessionId: string) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
  
  if (error) throw error
}

export async function getRelatedSessions(title: string, date: string, startTime: string, endTime: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('title', title)
    .eq('date', date)
    .eq('start_time', startTime)
    .eq('end_time', endTime)
  
  if (error) throw error
  return data
}

export async function getSessionById(sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  
  if (error) throw error
  return data
}

// Task operations
export async function getTasksByClass(className: ClassName) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('class_name', className)
    .order('due_date', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createTask(task: Omit<Task, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function createTasks(tasks: Omit<Task, 'id' | 'created_at'>[]) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(tasks)
    .select()
  
  if (error) throw error
  return data
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  
  if (error) throw error
}

export async function getRelatedTasks(title: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('title', title)
  
  if (error) throw error
  return data
}

export async function getTaskById(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()
  
  if (error) throw error
  return data
}

// Attendance operations
export async function getAttendanceBySession(sessionId: string) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      *,
      students!inner(name, class_name)
    `)
    .eq('session_id', sessionId)
  
  if (error) throw error
  return data
}

export async function updateAttendanceStatus(studentId: string, sessionId: string, status: AttendanceStatus) {
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert({
      student_id: studentId,
      session_id: sessionId,
      status,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'student_id,session_id'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateMultipleAttendanceStatus(studentIds: string[], sessionId: string, status: AttendanceStatus) {
  const updates = studentIds.map(studentId => ({
    student_id: studentId,
    session_id: sessionId,
    status,
    updated_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(updates, {
      onConflict: 'student_id,session_id'
    })
    .select()
  
  if (error) throw error
  return data
}

// Task submission operations
export async function getTaskSubmissionsByTask(taskId: string) {
  const { data, error } = await supabase
    .from('task_submissions')
    .select(`
      *,
      students!inner(name, class_name)
    `)
    .eq('task_id', taskId)
  
  if (error) throw error
  return data
}

export async function updateTaskSubmissionStatus(studentId: string, taskId: string, status: TaskStatus) {
  const { data, error } = await supabase
    .from('task_submissions')
    .upsert({
      student_id: studentId,
      task_id: taskId,
      status,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'student_id,task_id'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateMultipleTaskSubmissionStatus(studentIds: string[], taskId: string, status: TaskStatus) {
  const updates = studentIds.map(studentId => ({
    student_id: studentId,
    task_id: taskId,
    status,
    updated_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('task_submissions')
    .upsert(updates, {
      onConflict: 'student_id,task_id'
    })
    .select()
  
  if (error) throw error
  return data
}

export async function updateAttendanceNotificationStatus(studentId: string, sessionId: string, status: 'pending' | 'sent' | 'dismissed') {
  const { data, error } = await supabase
    .from('attendance_records')
    .update({ notification_status: status })
    .eq('student_id', studentId)
    .eq('session_id', sessionId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateTaskSubmissionNotificationStatus(studentId: string, taskId: string, status: 'pending' | 'sent' | 'dismissed') {
  const { data, error } = await supabase
    .from('task_submissions')
    .update({ notification_status: status })
    .eq('student_id', studentId)
    .eq('task_id', taskId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Email operations
export async function getEmailTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
  
  if (error) throw error
  return data
}

export async function updateEmailTemplate(templateId: string, subject: string, body: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .update({ subject, body })
    .eq('id', templateId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function sendEmail(studentId: string, violationType: string, sessionOrTaskName: string) {
  const student = await getStudentById(studentId)
  const templates = await getEmailTemplates()
  const template = templates.find(t => t.violation_type === violationType)
  
  if (!template) throw new Error('Email template not found')
  
  const subject = template.subject
    .replace('{STUDENT_NAME}', student.name)
    .replace('{PARENT_NAME}', student.parent_name)
  
  const body = template.body
    .replace('{STUDENT_NAME}', student.name)
    .replace('{PARENT_NAME}', student.parent_name)
    .replace('{SESSION_NAME}', sessionOrTaskName)
    .replace('{TASK_NAME}', sessionOrTaskName)
  
  const { data, error } = await supabase
    .from('sent_emails')
    .insert([{
      student_id: studentId,
      recipient_email: student.parent_email,
      subject,
      body,
      violation_type: violationType
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getSentEmails() {
  const { data, error } = await supabase
    .from('sent_emails')
    .select(`
      *,
      students!inner(name, class_name)
    `)
    .order('sent_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Settings operations
export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function updateSettings(settings: Partial<Settings>) {
  const { data, error } = await supabase
    .from('settings')
    .update(settings)
    .eq('id', settings.id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Analytics operations
export async function getStudentAnalytics(studentId: string) {
  const student = await getStudentById(studentId)
  
  // Task analytics
  const { data: taskSubmissions } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('student_id', studentId)
  
  const completedTasks = taskSubmissions?.filter(t => t.status === 'Submitted').length || 0
  const overdueTasks = taskSubmissions?.filter(t => t.status === 'Late').length || 0
  
  // Attendance analytics
  const { data: attendanceRecords } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('student_id', studentId)
  
  const totalSessions = attendanceRecords?.length || 0
  const presentSessions = attendanceRecords?.filter(a => a.status === 'present').length || 0
  const lateSessions = attendanceRecords?.filter(a => a.status === 'late').length || 0
  const absentSessions = attendanceRecords?.filter(a => a.status === 'absent').length || 0
  const truantSessions = attendanceRecords?.filter(a => a.status === 'truant').length || 0
  
  return {
    student,
    taskMetrics: {
      completed: completedTasks,
      overdue: overdueTasks
    },
    attendanceMetrics: {
      totalSessions,
      presentSessions,
      lateSessions,
      absentSessions,
      truantSessions,
      presenceRate: totalSessions > 0 ? (presentSessions / totalSessions * 100).toFixed(1) : '0',
      tardinessRate: totalSessions > 0 ? (lateSessions / totalSessions * 100).toFixed(1) : '0',
      absenceRate: totalSessions > 0 ? (absentSessions / totalSessions * 100).toFixed(1) : '0',
      truancyRate: totalSessions > 0 ? (truantSessions / totalSessions * 100).toFixed(1) : '0'
    }
  }
}
export async function logManualEmail(studentId: string | null, recipientEmail: string, subject: string, body: string) {
  const { data, error } = await supabase
    .from('sent_emails')
    .insert([{
      student_id: studentId,
      recipient_email: recipientEmail,
      subject,
      body,
      violation_type: 'Manual'
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}
