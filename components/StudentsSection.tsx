'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { 
  getStudentsByClass, 
  getStudentAnalytics,
  createStudent,
  deleteStudent,
  Student 
} from '@/actions/dbactions'
import toast from 'react-hot-toast'
import Modal from './Modal'

interface StudentAnalytics {
  student: Student
  taskMetrics: {
    completed: number
    overdue: number
  }
  attendanceMetrics: {
    totalSessions: number
    presentSessions: number
    lateSessions: number
    absentSessions: number
    truantSessions: number
    presenceRate: string
    tardinessRate: string
    absenceRate: string
    truancyRate: string
  }
}

export default function StudentsSection() {
  const { currentClass } = useAppStore()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form state
  const [studentName, setStudentName] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  useEffect(() => {
    loadStudents()
  }, [currentClass])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const data = await getStudentsByClass(currentClass)
      setStudents(data)
    } catch (error) {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentAnalytics = async (studentId: string) => {
    try {
      const analytics = await getStudentAnalytics(studentId)
      setSelectedStudent(analytics)
    } catch (error) {
      toast.error('Failed to load student analytics')
    }
  }

  const handleStudentClick = (student: Student) => {
    loadStudentAnalytics(student.id)
  }

  const handleContactParent = (student: Student) => {
    // Navigate to mail sender with pre-filled recipient
    window.location.href = `/mail?recipient=${encodeURIComponent(student.parent_email)}&student=${encodeURIComponent(student.name)}`
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentName || !parentName || !parentEmail) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createStudent({
        name: studentName,
        class_name: currentClass,
        parent_name: parentName,
        parent_email: parentEmail,
        parent_phone: parentPhone || ''
      })
      
      toast.success(`Student named ${studentName} added to ${currentClass}`)
      setShowCreateModal(false)
      setStudentName('')
      setParentName('')
      setParentEmail('')
      setParentPhone('')
      loadStudents()
    } catch (error) {
      toast.error('Failed to create student')
    }
  }

  const handleDeleteStudent = async (student: Student) => {
    if (confirm(`Are you sure you want to delete ${student.name}? This cannot be undone.`)) {
      try {
        await deleteStudent(student.id)
        toast.success(`Deleted student ${student.name}`)
        if (selectedStudent?.student.id === student.id) {
          setSelectedStudent(null)
        }
        loadStudents()
      } catch (error) {
        toast.error('Failed to delete student')
      }
    }
  }

  return (
    <div className="terminal-container h-full">
      <div className="terminal-section-header">
        STUDENTS - {currentClass}
      </div>
      
      <div className="terminal-content">
        {!selectedStudent ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-orange">All Students</h3>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="terminal-button"
              >
                Create Student
              </button>
            </div>

            <Modal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              title="Add New Student"
            >
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div>
                  <label className="block text-secondary mb-1">Student Name *</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="terminal-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-secondary mb-1">Parent Name *</label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="terminal-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-secondary mb-1">Parent Email *</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="terminal-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-secondary mb-1">Parent Phone (Optional)</label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="terminal-input w-full"
                  />
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
                    Add Student
                  </button>
                </div>
              </form>
            </Modal>

            <div className="overflow-x-auto">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Parent Name</th>
                    <th>Parent Email</th>
                    <th>Parent Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr 
                      key={student.id}
                      className="cursor-pointer hover:bg-gray-900"
                      onClick={() => handleStudentClick(student)}
                    >
                      <td className="font-bold text-cyan">{student.name}</td>
                      <td>{student.parent_name}</td>
                      <td>{student.parent_email}</td>
                      <td>{student.parent_phone}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleContactParent(student)
                            }}
                            className="terminal-button text-xs"
                          >
                            Contact Parent
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteStudent(student)
                            }}
                            className="hover:cursor-pointer text-xs text-red-500 border-red-500 hover:text-red-400"
                          >
                            Delete Student
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="terminal-button"
              >
                ← Back to Students
              </button>
              <h3 className="text-orange font-bold">{selectedStudent.student.name} - Profile</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Task Metrics */}
              <div className="terminal-container">
                <div className="terminal-section-header text-sm">TASK METRICS</div>
                <div className="terminal-content">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Completed Tasks:</span>
                      <span className="status-submitted font-bold">{selectedStudent.taskMetrics.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overdue Tasks:</span>
                      <span className="status-late-task font-bold">{selectedStudent.taskMetrics.overdue}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Metrics */}
              <div className="terminal-container">
                <div className="terminal-section-header text-sm">ATTENDANCE METRICS</div>
                <div className="terminal-content">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Sessions:</span>
                      <span className="font-bold">{selectedStudent.attendanceMetrics.totalSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Presence Rate:</span>
                      <span className="status-present font-bold">{selectedStudent.attendanceMetrics.presenceRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tardiness Rate:</span>
                      <span className="status-late font-bold">{selectedStudent.attendanceMetrics.tardinessRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Absence Rate:</span>
                      <span className="status-absent font-bold">{selectedStudent.attendanceMetrics.absenceRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Truancy Rate:</span>
                      <span className="status-truant font-bold">{selectedStudent.attendanceMetrics.truancyRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="terminal-container lg:col-span-2">
                <div className="terminal-section-header text-sm">CONTACT INFORMATION</div>
                <div className="terminal-content">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-orange mb-2">Parent Details</h4>
                      <div className="space-y-1">
                        <div><strong>Name:</strong> {selectedStudent.student.parent_name}</div>
                        <div><strong>Email:</strong> {selectedStudent.student.parent_email}</div>
                        <div><strong>Phone:</strong> {selectedStudent.student.parent_phone}</div>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <button
                        onClick={() => handleContactParent(selectedStudent.student)}
                        className="terminal-button"
                      >
                        Contact Parent
                      </button>
                    </div>
                  </div>
                </div>
              </div>
                  <button
                        onClick={() => handleDeleteStudent(selectedStudent.student)}
                        className="hover:cursor-pointer border py-1 px-2 bg-red-500/20 text-red-500 border-red-500/20 hover:text-red-400 w-fit"
                      >
                        Delete Student
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
