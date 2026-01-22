'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { 
  getTasksByClass, 
  createTask, 
  getTaskSubmissionsByTask, 
  updateTaskSubmissionStatus,
  updateMultipleTaskSubmissionStatus,
  getStudentsByClass,
  Task,
  Student,
  TaskStatus 
} from '@/actions/dbactions'
import toast from 'react-hot-toast'

export default function TasksSection() {
  const { currentClass, students, selectedStudents, setStudents, selectMultipleStudents, clearStudentSelection } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskSubmissions, setTaskSubmissions] = useState<any[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [taskTitle, setTaskTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    loadTasks()
    loadStudents()
  }, [currentClass])

  useEffect(() => {
    if (selectedTask) {
      loadTaskSubmissions()
    }
  }, [selectedTask])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await getTasksByClass(currentClass)
      setTasks(data)
    } catch (error) {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    try {
      const data = await getStudentsByClass(currentClass)
      setStudents(data)
    } catch (error) {
      toast.error('Failed to load students')
    }
  }

  const loadTaskSubmissions = async () => {
    if (!selectedTask) return
    try {
      const data = await getTaskSubmissionsByTask(selectedTask.id)
      setTaskSubmissions(data)
    } catch (error) {
      toast.error('Failed to load task submissions')
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle || !dueDate) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createTask({
        title: taskTitle,
        due_date: dueDate,
        class_name: currentClass
      })
      
      toast.success(`Created task: ${taskTitle} for ${currentClass}`)
      setShowCreateForm(false)
      setTaskTitle('')
      setDueDate('')
      loadTasks()
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const handleTaskSubmissionUpdate = async (studentId: string, status: TaskStatus) => {
    if (!selectedTask) return
    
    try {
      await updateTaskSubmissionStatus(studentId, selectedTask.id, status)
      const student = students.find(s => s.id === studentId)
      toast.success(`Changed ${student?.name} status to ${status} for ${selectedTask.title}`)
      loadTaskSubmissions()
    } catch (error) {
      toast.error('Failed to update task submission')
    }
  }

  const handleMultipleTaskSubmissionUpdate = async (status: TaskStatus) => {
    if (!selectedTask || selectedStudents.length === 0) return
    
    try {
      await updateMultipleTaskSubmissionStatus(selectedStudents, selectedTask.id, status)
      toast.success(`Changed ${selectedStudents.length} students' status to ${status} for ${selectedTask.title}`)
      clearStudentSelection()
      loadTaskSubmissions()
    } catch (error) {
      toast.error('Failed to update task submissions')
    }
  }

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
      // Single selection
      selectMultipleStudents([studentId])
    }
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (selectedStudents.length > 0) {
      // Show context menu for bulk operations
      const statusOptions: TaskStatus[] = ['Submitted', 'Awaiting submission', 'Late', 'Non Submission']
      // For now, just show a simple prompt
      const status = prompt(`Set status for ${selectedStudents.length} selected students: ${statusOptions.join(', ')}`)
      if (status && statusOptions.includes(status as TaskStatus)) {
        handleMultipleTaskSubmissionUpdate(status as TaskStatus)
      }
    }
  }

  const getTaskSubmissionStatus = (studentId: string): TaskStatus => {
    const record = taskSubmissions.find(r => r.student_id === studentId)
    return record?.status || 'Awaiting submission'
  }

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'Submitted': return 'status-submitted'
      case 'Awaiting submission': return 'status-awaiting'
      case 'Late': return 'status-late-task'
      case 'Non Submission': return 'status-non-submission'
      default: return 'status-awaiting'
    }
  }

  return (
    <div className="terminal-container h-full">
      <div className="terminal-section-header">
        TASKS - {currentClass}
      </div>
      
      <div className="terminal-content">
        {!selectedTask ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-orange">Tasks</h3>
              <button 
                onClick={() => setShowCreateForm(true)}
                className="terminal-button"
              >
                Create Task
              </button>
            </div>

            {showCreateForm && (
              <div className="mb-4 p-4 border border-border-color">
                <h4 className="text-orange mb-2">Create New Task</h4>
                <form onSubmit={handleCreateTask} className="space-y-2">
                  <div>
                    <label className="block text-secondary mb-1">Task Title *</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="terminal-input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-secondary mb-1">Due Date *</label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="terminal-input w-full"
                      required
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button type="submit" className="terminal-button">
                      Create
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowCreateForm(false)}
                      className="terminal-button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="terminal-grid">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className="terminal-grid-item cursor-pointer hover:bg-gray-900"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="font-bold text-cyan">{task.title}</div>
                  <div className="text-secondary text-xs">
                    Due: {new Date(task.due_date).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="terminal-button mr-2"
                >
                  ← Back to Tasks
                </button>
                <span className="text-orange font-bold">{selectedTask.title}</span>
              </div>
              {selectedStudents.length > 0 && (
                <div className="text-secondary">
                  {selectedStudents.length} students selected (Right-click for bulk actions)
                </div>
              )}
            </div>

            <div className="overflow-x-auto" onContextMenu={handleRightClick}>
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const status = getTaskSubmissionStatus(student.id)
                    const isSelected = selectedStudents.includes(student.id)
                    
                    return (
                      <tr 
                        key={student.id}
                        className={`cursor-pointer ${isSelected ? 'bg-gray-800' : ''}`}
                        onClick={(e) => handleStudentClick(student.id, e)}
                      >
                        <td>{student.name}</td>
                        <td className={getStatusColor(status)}>
                          {status.toUpperCase()}
                        </td>
                        <td>
                          <select
                            value={status}
                            onChange={(e) => handleTaskSubmissionUpdate(student.id, e.target.value as TaskStatus)}
                            className="terminal-input text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="Awaiting submission">Awaiting Submission</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Late">Late</option>
                            <option value="Non Submission">Non Submission</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-secondary text-xs">
              Click to select, Ctrl+Click to toggle, Shift+Click for range selection
            </div>
          </div>
        )}
      </div>
    </div>
  )
}