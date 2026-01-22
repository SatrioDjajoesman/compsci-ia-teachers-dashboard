'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { 
  getSessionsByClass, 
  createSession, 
  getAttendanceBySession, 
  updateAttendanceStatus,
  updateMultipleAttendanceStatus,
  getStudentsByClass,
  Session,
  Student,
  AttendanceStatus 
} from '../actions/dbactions'
import toast from 'react-hot-toast'

export default function AttendanceSection() {
  const { currentClass, students, selectedStudents, setStudents, selectMultipleStudents, clearStudentSelection } = useAppStore()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [sessionTitle, setSessionTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    loadSessions()
    loadStudents()
  }, [currentClass])

  useEffect(() => {
    if (selectedSession) {
      loadAttendanceRecords()
    }
  }, [selectedSession])

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
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const title = sessionTitle || `Session at ${new Date().toLocaleString()}`
      await createSession({
        title,
        start_time: startTime,
        end_time: endTime,
        class_name: currentClass
      })
      
      toast.success(`Created session: ${title}`)
      setShowCreateForm(false)
      setSessionTitle('')
      setStartTime('')
      setEndTime('')
      loadSessions()
    } catch (error) {
      toast.error('Failed to create session')
    }
  }

  const handleAttendanceUpdate = async (studentId: string, status: AttendanceStatus) => {
    if (!selectedSession) return
    
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
      // Single selection
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

  return (
    <div className="terminal-container h-full">
      <div className="terminal-section-header">
        ATTENDANCE - {currentClass}
      </div>
      
      <div className="terminal-content">
        {!selectedSession ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-orange">Sessions</h3>
              <button 
                onClick={() => setShowCreateForm(true)}
                className="terminal-button"
              >
                Create Session
              </button>
            </div>

            {showCreateForm && (
              <div className="mb-4 p-4 border border-border-color">
                <h4 className="text-orange mb-2">Create New Session</h4>
                <form onSubmit={handleCreateSession} className="space-y-2">
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
                  <div className="grid grid-cols-2 gap-2">
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
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="terminal-grid-item cursor-pointer hover:bg-gray-900"
                  onClick={() => setSelectedSession(session)}
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
            <div className="flex justify-between items-center mb-4">
              <div>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="terminal-button mr-2"
                >
                  ← Back to Sessions
                </button>
                <span className="text-orange font-bold">{selectedSession.title}</span>
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
                    const status = getAttendanceStatus(student.id)
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