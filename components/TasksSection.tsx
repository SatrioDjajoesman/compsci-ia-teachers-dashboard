'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { 
  getTasksByClass, 
  createTasks, 
  getTaskSubmissionsByTask, 
  updateTaskSubmissionStatus,
  updateMultipleTaskSubmissionStatus,
  getStudentsByClass,
  getRelatedTasks,
  Task,
  Student,
  TaskStatus,
  AVAILABLE_CLASSES,
  ClassName
} from '@/actions/dbactions'
import toast from 'react-hot-toast'
import Modal from './Modal'

export default function TasksSection() {
  const { currentClass, students, selectedStudents, setStudents, selectMultipleStudents, clearStudentSelection, setAllowedClasses } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [relatedTasksMap, setRelatedTasksMap] = useState<Task[]>([])
  const [taskSubmissions, setTaskSubmissions] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [taskTitle, setTaskTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedClasses, setSelectedClasses] = useState<ClassName[]>([])

  // Reset allowed classes on unmount
  useEffect(() => {
    return () => {
      setAllowedClasses(null)
    }
  }, [setAllowedClasses])

  useEffect(() => {
    loadTasks()
    loadStudents()
    
    // Switch selected task if we have related tasks mapped
    if (relatedTasksMap.length > 0) {
      const newTask = relatedTasksMap.find(t => t.class_name === currentClass)
      if (newTask && newTask.id !== selectedTask?.id) {
        setSelectedTask(newTask)
      }
    }
  }, [currentClass])

  useEffect(() => {
    if (selectedTask) {
      loadTaskSubmissions()
    }
  }, [selectedTask])

  // Set default selected class when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setSelectedClasses([currentClass])
    }
  }, [showCreateModal, currentClass])

  const handleTaskSelect = async (task: Task) => {
    try {
      setLoading(true)
      const related = await getRelatedTasks(task.title)
      setRelatedTasksMap(related)
      setAllowedClasses(related.map((t: Task) => t.class_name))
      setSelectedTask(task)
    } catch (error) {
      toast.error('Failed to load task details')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedTask(null)
    setRelatedTasksMap([])
    setAllowedClasses(null)
  }

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

    if (selectedClasses.length === 0) {
      toast.error('Please select at least one class')
      return
    }

    try {
      const newTasks = selectedClasses.map(className => ({
        title: taskTitle,
        due_date: dueDate,
        class_name: className
      }))

      await createTasks(newTasks)
      
      toast.success(`Created task: ${taskTitle} for ${selectedClasses.join(', ')}`)
      setShowCreateModal(false)
      setTaskTitle('')
      setDueDate('')
      setSelectedClasses([])
      
      // Reload tasks if the current class was one of the selected classes
      if (selectedClasses.includes(currentClass)) {
        loadTasks()
      }
    } catch (error) {
      toast.error('Failed to create tasks')
    }
  }

  const handleTaskSubmissionUpdate = async (studentId: string, status: TaskStatus) => {
    if (!selectedTask) return
    
    // If the student is selected, update all selected students
    if (selectedStudents.includes(studentId)) {
      handleMultipleTaskSubmissionUpdate(status)
      return
    }
    
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
      // Single selection enabled
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

  const getNotificationStatus = (studentId: string): 'pending' | 'sent' | 'dismissed' | undefined => {
    const record = taskSubmissions.find(r => r.student_id === studentId)
    return record?.notification_status
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

  const toggleClassSelection = (className: ClassName) => {
    setSelectedClasses(prev => 
      prev.includes(className)
        ? prev.filter(c => c !== className)
        : [...prev, className]
    )
  }

  return (
    <div className="terminal-container h-full">
      <div className="terminal-section-header">
        TASKS - {currentClass}
      </div>
      
      <div className="terminal-content">
        {!selectedTask ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-orange">Tasks</h3>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="terminal-button"
              >
                Create Task
              </button>
            </div>

            <Modal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              title="Create New Task"
            >
              <form onSubmit={handleCreateTask} className="space-y-4">
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
                
                <div>
                  <label className="block text-secondary mb-2">Assign to Classes *</label>
                  <div className="flex flex-wrap gap-4">
                    {AVAILABLE_CLASSES.map((className) => (
                      <label 
                        key={className}
                        className="flex items-center space-x-2 cursor-pointer text-secondary hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(className)}
                          onChange={() => toggleClassSelection(className)}
                          className="cursor-pointer"
                        />
                        <span className={selectedClasses.includes(className) ? 'text-cyan' : ''}>
                          {className}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-border-color">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="terminal-button"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="terminal-button text-cyan border-cyan">
                    Create Task
                  </button>
                </div>
              </form>
            </Modal>

            <div className="terminal-grid">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className="terminal-grid-item cursor-pointer hover:bg-gray-900"
                  onClick={() => handleTaskSelect(task)}
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
            <div className="flex justify-between items-start mb-0">
              <div className='flex flex-row gap-2 items-center'>
                <div className="ml-2 flex items-center gap-2">
                  <span className="text-orange font-bold text-lg">{selectedTask.title}</span>
                </div>
                <div className="flex flex-row gap-5 text-xs text-secondary ml-2">
                  <div>Due: <span className="text-white">{new Date(selectedTask.due_date).toLocaleString()}</span></div>
                  <div>Assigned to: <span className="text-cyan">{relatedTasksMap.map(t => t.class_name).join(', ')}</span></div>
                </div>
              </div>
              <button 
                onClick={handleBack}
                className="bg-[#111111] hover:bg-[#222222] rounded-md border border-zinc-700 border-b-0 p-2 hover:cursor-pointer hover:text-orange-500"
              >
                ← Back to Tasks
              </button>
            </div>

            <div className="overflow-x-auto" onContextMenu={handleRightClick}>
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Notification</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const status = getTaskSubmissionStatus(student.id)
                    const notificationStatus = getNotificationStatus(student.id)
                    const isSelected = selectedStudents.includes(student.id)
                    
                    return (
                      <tr 
                        key={student.id}
                        className={`terminal-row cursor-pointer ${isSelected ? 'selected' : ''}`}
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
                        <td className="text-xs text-secondary">
                          {notificationStatus === 'sent' && <span className="text-white">Email Sent</span>}
                          {notificationStatus === 'dismissed' && <span className="text-zinc-500">Dismissed</span>}
                          {notificationStatus === 'pending' && <span className="text-orange">Pending Email</span>}
                          {!notificationStatus && '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-secondary text-xs flex justify-between items-center">
              <div>Click to select, Ctrl+Click to toggle, Shift+Click for range selection</div>
              {selectedStudents.length > 0 && (
                <div>
                  {selectedStudents.length} students selected (Right-click for bulk actions)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
