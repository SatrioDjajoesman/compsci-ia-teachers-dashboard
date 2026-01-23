'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { 
  getSessionsByClass, 
  createSessions, 
  deleteSession,
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
  const [sessionDate, setSessionDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedClasses, setSelectedClasses] = useState<ClassName[]>([])
  
  // Sorting and Search state
  const [sortOption, setSortOption] = useState<'date' | 'name'>('date')
  const [searchQuery, setSearchQuery] = useState('')

  // Reset allowed classes on unmount
  useEffect(() => {
    return () => {
      setAllowedClasses(null)
    }
  }, [setAllowedClasses])

  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
  )

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
      const related = await getRelatedSessions(session.title, session.date, session.start_time, session.end_time)
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
      // Default to today's date if empty, but we leave it empty to show placeholder or let user decide
      // Actually requirement says: "if Date is not filled, it will automatically use Today's current date."
      // So we can leave it empty in UI and handle it on submit, or pre-fill it.
      // Let's pre-fill it for better UX? No, requirement says "if Date is not filled". implying it can be empty.
      setSessionDate('')
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
      const dateToUse = sessionDate || new Date().toISOString().split('T')[0]
      const title = sessionTitle || `Session at ${dateToUse} ${startTime}`
      
      const newSessions = selectedClasses.map(className => ({
        title,
        date: dateToUse,
        start_time: startTime,
        end_time: endTime,
        class_name: className
      }))

      await createSessions(newSessions)
      
      toast.success(`Created session for ${selectedClasses.join(', ')}`)
      setShowCreateModal(false)
      setSessionTitle('')
      setSessionDate('')
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

  const handleDeleteSession = async () => {
    if (!selectedSession) return
    
    if (confirm(`Are you sure you want to delete session "${selectedSession.title}"? This cannot be undone.`)) {
      try {
        await deleteSession(selectedSession.id)
        toast.success('Session deleted successfully')
        setSelectedSession(null)
        loadSessions()
      } catch (error) {
        toast.error('Failed to delete session')
      }
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

  // Helper to format time for display (remove seconds if present)
  const formatTime = (time: string) => {
    if (!time) return ''
    return time.split(':').slice(0, 2).join(':')
  }

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

  return (
    <div className="terminal-container h-full">
      <div className="terminal-section-header">
        ATTENDANCE - {currentClass}
      </div>
      
      <div className="terminal-content">
        {!selectedSession ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-4">
                <h3 className="text-orange">Sessions</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as 'date' | 'name')}
                    className="terminal-input text-xs py-1 h-8"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="terminal-input text-xs py-1 h-8 w-32 focus:w-48 transition-all"
                  />
                </div>
              </div>
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
                    placeholder="Defaults to Date + Time"
                  />
                </div>
                
                <div>
                  <label className="block text-secondary mb-1">Date (optional)</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="terminal-input w-full"
                    placeholder="Defaults to Today"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-secondary mb-1">Start Time *</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="terminal-input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-secondary mb-1">End Time *</label>
                    <input
                      type="time"
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
              {filteredSessions.map((session) => (
                <div 
                  key={session.id}
                  className="terminal-grid-item cursor-pointer hover:bg-gray-900"
                  onClick={() => handleSessionSelect(session)}
                >
                  <div className="font-bold text-cyan">{session.title}</div>
                  <div className="text-secondary text-xs">
                    {new Date(session.date).toLocaleDateString()} | {formatTime(session.start_time)} - {formatTime(session.end_time)}
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
                  <div>Date: <span className="text-white">{new Date(selectedSession.date).toLocaleDateString()}</span></div>
                  <div>Time: <span className="text-white">{formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}</span></div>
                  <div>Session for: <span className="text-cyan">{relatedSessionsMap.map(s => s.class_name).join(', ')}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="terminal-input text-xs py-1 h-8 w-32 focus:w-48 transition-all"
                />
                <button 
                  onClick={handleBack}
                  className="bg-[#111111] hover:bg-[#222222] rounded-md border border-zinc-700 border-b-0 p-2 hover:cursor-pointer hover:text-orange-500"
                >
                  ← Back to Sessions
                </button>
              </div>
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
                  {filteredStudents.map((student) => {
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
              <div className="flex gap-4 items-center">
                <button 
                  onClick={handleDeleteSession}
                  className="hover:cursor-pointer border py-1 px-2 bg-red-500/20 text-red-500 border-red-500/20 hover:text-red-400 w-fit text-xs"
                >
                  Delete Session
                </button>
                <div>Click to select, Ctrl+Click to toggle, Shift+Click for range selection</div>
              </div>
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