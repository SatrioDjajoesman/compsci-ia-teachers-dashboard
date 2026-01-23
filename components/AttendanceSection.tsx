'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { 
  getSessionsByClass, 
  createSessions, 
  getAttendanceBySession, 
  updateAttendanceStatus,
  updateMultipleAttendanceStatus,
  getStudentsByClass,
  getRelatedSessions,
  Session,
  Student,
  AttendanceStatus,
  AVAILABLE_CLASSES,
  ClassName
} from '../actions/dbactions'
import toast from 'react-hot-toast'
import Modal from './Modal'

export default function AttendanceSection() {
  const { currentClass, students, selectedStudents, setStudents, selectMultipleStudents, clearStudentSelection, setAllowedClasses } = useAppStore()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [relatedSessionsMap, setRelatedSessionsMap] = useState<Session[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [sessionTitle, setSessionTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedClasses, setSelectedClasses] = useState<ClassName[]>([])

  // Reset allowed classes on unmount
  useEffect(() => {
    return () => {
      setAllowedClasses(null)
    }
  }, [setAllowedClasses])

  useEffect(() => {
    loadSessions()
    loadStudents()

    if (relatedSessionsMap.length > 0) {
      const newSession = relatedSessionsMap.find(s => s.class_name === currentClass)
      if (newSession && newSession.id !== selectedSession?.id) {
        setSelectedSession(newSession)
      }
    }
  }, [currentClass])

  const handleSessionSelect = async (session: Session) => {
    try {
      setLoading(true)
      const related = await getRelatedSessions(session.title, session.start_time, session.end_time)
      setRelatedSessionsMap(related)
      setAllowedClasses(related.map((s: Session) => s.class_name))
      setSelectedSession(session)
    } catch (error) {
      toast.error('Failed to load session details')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedSession(null)
    setRelatedSessionsMap([])
    setAllowedClasses(null)
  }

  useEffect(() => {
    if (selectedSession) {
      loadAttendanceRecords()
    }
  }, [selectedSession])

  // Set default selected class when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setSelectedClasses([currentClass])
    }
  }, [showCreateModal, currentClass])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await getSessionsByClass(currentClass)
      setSessions(data)
    } catch (error) {
      toast.error('Failed to load sessions')
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

  const loadAttendanceRecords = async () => {
    if (!selectedSession) return
    try {
      const data = await getAttendanceBySession(selectedSession.id)
      setAttendanceRecords(data)
    } catch (error) {
      toast.error('Failed to load attendance records')
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startTime || !endTime) {
      toast.error('Please fill in start and end times')
      return
    }

    if (selectedClasses.length === 0) {
      toast.error('Please select at least one class')
      return
    }

    try {
      const title = sessionTitle || `Session at ${new Date().toLocaleString()}`
      
      const newSessions = selectedClasses.map(className => ({
        title,
        start_time: startTime,
        end_time: endTime,
        class_name: className
      }))

      await createSessions(newSessions)
      
      toast.success(`Created session for ${selectedClasses.join(', ')}`)
      setShowCreateModal(false)
      setSessionTitle('')
      setStartTime('')
      setEndTime('')
      setSelectedClasses([])
      
      // Reload sessions if the current class was one of the selected classes
      if (selectedClasses.includes(currentClass)) {
        loadSessions()
      }
    } catch (error) {
      toast.error('Failed to create sessions')
    }
  }

  const handleAttendanceUpdate = async (studentId: string, status: AttendanceStatus) => {
    if (!selectedSession) return
    
    // If the student is selected, update all selected students
    if (selectedStudents.includes(studentId)) {
      handleMultipleAttendanceUpdate(status)
      return
    }
    
    try {
      await updateAttendanceStatus(studentId, selectedSession.id, status)
      const student = students.find(s => s.id === studentId)
      toast.success(`Changed ${student?.name} attendance to ${status} for ${selectedSession.title}`)
      loadAttendanceRecords()
    } catch (error) {
      toast.error('Failed to update attendance')
    }
  }

  const handleMultipleAttendanceUpdate = async (status: AttendanceStatus) => {
    if (!selectedSession || selectedStudents.length === 0) return
    
    try {
      await updateMultipleAttendanceStatus(selectedStudents, selectedSession.id, status)
      toast.success(`Changed ${selectedStudents.length} students' attendance status to ${status} for ${selectedSession.title}`)
      clearStudentSelection()
      loadAttendanceRecords()
    } catch (error) {
      toast.error('Failed to update attendance')
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
      const statusOptions: AttendanceStatus[] = ['present', 'absent', 'late', 'truant', 'excused absence', 'n/a']
      // For now, just show a simple prompt
      const status = prompt(`Set status for ${selectedStudents.length} selected students: ${statusOptions.join(', ')}`)
      if (status && statusOptions.includes(status as AttendanceStatus)) {
        handleMultipleAttendanceUpdate(status as AttendanceStatus)
      }
    }
  }

  const getAttendanceStatus = (studentId: string): AttendanceStatus => {
    const record = attendanceRecords.find(r => r.student_id === studentId)
    return record?.status || 'n/a'
  }

  const getNotificationStatus = (studentId: string): 'pending' | 'sent' | 'dismissed' | undefined => {
    const record = attendanceRecords.find(r => r.student_id === studentId)
    return record?.notification_status
  }

  const getStatusColor = (status: AttendanceStatus): string => {
    switch (status) {
      case 'present': return 'status-present'
      case 'absent': return 'status-absent'
      case 'late': return 'status-late'
      case 'truant': return 'status-truant'
      case 'excused absence': return 'status-excused'
      default: return 'status-na'
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
        ATTENDANCE - {currentClass}
      </div>
      
      <div className="terminal-content">
        {!selectedSession ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-orange">Sessions</h3>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="terminal-button"
              >
                Create Session
              </button>
            </div>

            <Modal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              title="Create New Session"
            >
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-secondary mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="terminal-input w-full"
                    placeholder="Defaults to current date/time"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-secondary mb-1">Start Time *</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="terminal-input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-secondary mb-1">End Time *</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="terminal-input w-full"
                      required
                    />
                  </div>
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
                    Create Session
                  </button>
                </div>
              </form>
            </Modal>

            <div className="terminal-grid">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="terminal-grid-item cursor-pointer hover:bg-gray-900"
                  onClick={() => handleSessionSelect(session)}
                >
                  <div className="font-bold text-cyan">{session.title}</div>
                  <div className="text-secondary text-xs">
                    {new Date(session.start_time).toLocaleString()} - {new Date(session.end_time).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start">
              <div className='flex flex-row gap-2 items-center ml-2'>
                <div className="flex items-center gap-2">
                  <span className="text-orange font-bold text-lg">{selectedSession.title}</span>
                </div>
                <div className="flex flex-row gap-5 text-xs text-secondary ml-2">
                  <div>Time: <span className="text-white">{new Date(selectedSession.start_time).toLocaleString()} - {new Date(selectedSession.end_time).toLocaleString()}</span></div>
                  <div>Session for: <span className="text-cyan">{relatedSessionsMap.map(s => s.class_name).join(', ')}</span></div>
                </div>
              </div>
              <button 
                onClick={handleBack}
                className="bg-[#111111] hover:bg-[#222222] rounded-md border border-zinc-700 border-b-0 p-2 hover:cursor-pointer hover:text-orange-500"
              >
                ← Back to Sessions
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
                    const status = getAttendanceStatus(student.id)
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
                            onChange={(e) => handleAttendanceUpdate(student.id, e.target.value as AttendanceStatus)}
                            className="terminal-input text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="n/a">N/A</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="truant">Truant</option>
                            <option value="excused absence">Excused Absence</option>
                          </select>
                        </td>
                        <td className="text-xs text-secondary">
                          {notificationStatus === 'sent' && <span className="text-green-500">SENT</span>}
                          {notificationStatus === 'dismissed' && <span className="text-gray-500">DISMISSED</span>}
                          {notificationStatus === 'pending' && <span className="text-orange">PENDING</span>}
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
