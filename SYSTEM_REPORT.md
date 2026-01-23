# Attendance Management and Task Management System Report

This report details the implementation of the Attendance and Task Management systems within the Teacher's Dashboard. It covers CRUD operations, design choices, algorithms, and bulk action functionalities.

## 1. CRUD Operations (Create, Read, Update, Delete)

Data operations are handled via the Supabase Client SDK in `actions/dbactions.ts`. While the system supports `rpc` calls for schema management, standard data manipulation uses the type-safe `insert`, `select`, `update`/`upsert`, and `delete` methods.

### Create
**Functionality:**
- **Create Session:** Teachers can create a new attendance session by specifying a title, date, start/end time, and selecting multiple classes.
- **Create Task:** Teachers can assign tasks with a title and due date to multiple classes simultaneously.

**Design Choice - Modals:**
Modals are used for creation forms to maintain user context. This allows teachers to create sessions or tasks without navigating away from their current dashboard view, providing a seamless and efficient workflow.

**Implementation:**
Data is inserted using `supabase.from(...).insert()`.

**Code Reference (`actions/dbactions.ts`):**

```typescript
// Create Sessions
export async function createSessions(sessions: Omit<Session, 'id' | 'created_at'>[]) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessions)
    .select()
  
  if (error) throw error
  return data
}

// Create Tasks
export async function createTasks(tasks: Omit<Task, 'id' | 'created_at'>[]) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(tasks)
    .select()
  
  if (error) throw error
  return data
}
```

### Read
**Functionality:**
- Data is fetched to populate the dashboard lists for Sessions and Tasks.
- **Tables Fetched:** `sessions`, `tasks`, `students`, `attendance_records`, `task_submissions`.

**Implementation:**
Data is pulled using `supabase.from(...).select()`.

**Code Reference (`actions/dbactions.ts`):**

```typescript
// Fetch Sessions by Class
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

// Fetch Tasks by Class
export async function getTasksByClass(className: ClassName) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('class_name', className)
    .order('due_date', { ascending: false })
  
  if (error) throw error
  return data
}
```

### Update
**Functionality:**
- The primary update action is changing a student's status for a specific Session (Attendance) or Task (Submission).
- **Columns Updated:** 
  - `attendance_records` table: `status` column.
  - `task_submissions` table: `status` column.

**Implementation:**
Updates are handled using `upsert` to handle both new records and updates to existing ones seamlessly.

**Code Reference (`actions/dbactions.ts`):**

```typescript
// Update Attendance Status
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

// Update Task Submission Status
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
```

### Delete
**Functionality:**
- Teachers can delete Sessions and Tasks.
- **Tables Affected:** `sessions` or `tasks`. Related records in `attendance_records` and `task_submissions` are automatically removed via database cascading rules (`ON DELETE CASCADE`).

**Implementation:**
Data is deleted using `supabase.from(...).delete()`.

**Code Reference (`actions/dbactions.ts`):**

```typescript
// Delete Session
export async function deleteSession(sessionId: string) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
  
  if (error) throw error
}

// Delete Task
export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  
  if (error) throw error
}
```

## 2. Algorithms

### Sorting
The system implements client-side sorting to organize sessions and tasks based on user preference.
- **Criteria:** Date (chronological) or Name (alphabetical).

**Code Snippet (`AttendanceSection.tsx` / `TasksSection.tsx`):**
```typescript
const filteredSessions = sessions
  .filter(session => session.title.toLowerCase().includes(searchQuery.toLowerCase()))
  .sort((a, b) => {
    if (sortOption === 'date') {
      // Sort by date descending (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    } else {
      // Sort by name ascending
      return a.title.localeCompare(b.title)
    }
  })
```

### Searching
Real-time search filtering allows users to quickly locate specific items.
- **Logic:** Case-insensitive string inclusion check.

**Code Snippet:**
```typescript
const filteredStudents = students.filter(student => 
  student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
)
```

## 3. Bulk Select + Apply Edits

The application supports bulk operations to efficiently manage large classes.

**Implementation Details:**
1.  **Selection Logic:** Handles single click (select), Ctrl+Click (toggle), and Shift+Click (range) to manage a set of selected IDs.
2.  **Bulk Update:** Iterates through selected IDs and sends a bulk update request to the server.

**Code Snippet (`AttendanceSection.tsx`):**

```typescript
// 1. Selection Logic
const handleStudentClick = (studentId: string, event: React.MouseEvent) => {
  if (event.ctrlKey || event.metaKey) {
    // Toggle selection
    const newSelection = selectedStudents.includes(studentId)
      ? selectedStudents.filter(id => id !== studentId)
      : [...selectedStudents, studentId]
    selectMultipleStudents(newSelection)
  } else if (event.shiftKey && selectedStudents.length > 0) {
    // Range selection
    const studentIndex = students.findIndex(s => s.id === studentId)
    const lastSelectedIndex = students.findIndex(s => s.id === selectedStudents[selectedStudents.length - 1])
    const start = Math.min(studentIndex, lastSelectedIndex)
    const end = Math.max(studentIndex, lastSelectedIndex)
    const rangeIds = students.slice(start, end + 1).map(s => s.id)
    selectMultipleStudents([...new Set([...selectedStudents, ...rangeIds])])
  } else {
    // Single selection enabled
    selectMultipleStudents([studentId])
  }
}

// 2. Apply Edits (Bulk Update)
const handleMultipleAttendanceUpdate = async (status: AttendanceStatus) => {
  if (!selectedSession || selectedStudents.length === 0) return
  
  try {
    // Calls the server action for bulk update
    await updateMultipleAttendanceStatus(selectedStudents, selectedSession.id, status)
    toast.success(`Changed ${selectedStudents.length} students' attendance status to ${status} for ${selectedSession.title}`)
    clearStudentSelection()
    loadAttendanceRecords()
  } catch (error) {
    toast.error('Failed to update attendance')
  }
}
```
