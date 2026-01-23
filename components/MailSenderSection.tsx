'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { 
  getStudentsByClass,
  getEmailTemplates,
  updateEmailTemplate,
  sendEmail as logEmailToDb,
  logManualEmail,
  getSentEmails,
  getSessionsByClass,
  getTasksByClass,
  getAttendanceBySession,
  getTaskSubmissionsByTask,
  updateAttendanceNotificationStatus,
  updateTaskSubmissionNotificationStatus,
  Student,
  EmailTemplate,
  Session,
  Task
} from '@/actions/dbactions'
import { sendEmailViaResend } from '@/actions/sendEmail'
import toast from 'react-hot-toast'
import { Loader } from 'lucide-react'

interface Violation {
  id: string
  student: Student
  type: 'Late attendance' | 'Absent attendance' | 'Truant attendance' | 'Late task submission' | 'Non Submission'
  sessionOrTaskName: string
  sessionOrTaskId: string
  notificationStatus?: 'pending' | 'sent' | 'dismissed'
}

export default function MailSenderSection() {
  const { currentClass } = useAppStore()
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [sentEmails, setSentEmails] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [showManualEmail, setShowManualEmail] = useState(false)
  const [showEmailHistory, setShowEmailHistory] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processingViolations, setProcessingViolations] = useState<Set<string>>(new Set())
  const [isSendingAll, setIsSendingAll] = useState(false)

  // Manual email form
  const [manualRecipient, setManualRecipient] = useState('')
  const [manualSubject, setManualSubject] = useState('')
  const [manualBody, setManualBody] = useState('')

  useEffect(() => {
    setLoading(true)
    setViolations([])
    loadData()
  }, [currentClass])

  const loadData = async () => {
    try {
      const [studentsData, sessionsData, tasksData, templatesData, emailsData] = await Promise.all([
        getStudentsByClass(currentClass),
        getSessionsByClass(currentClass),
        getTasksByClass(currentClass),
        getEmailTemplates(),
        getSentEmails()
      ])

      setStudents(studentsData)
      setSessions(sessionsData)
      setTasks(tasksData)
      setEmailTemplates(templatesData)
      setSentEmails(emailsData)

      // Detect violations
      await detectViolations(studentsData, sessionsData, tasksData)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const detectViolations = async (students: Student[], sessions: Session[], tasks: Task[]) => {
    const detectedViolations: Violation[] = []

    // Check attendance violations
    for (const session of sessions) {
      const attendanceRecords = await getAttendanceBySession(session.id)
      
      for (const record of attendanceRecords) {
        // Skip if already sent or dismissed
        if (record.notification_status === 'sent' || record.notification_status === 'dismissed') continue

        const student = students.find(s => s.id === record.student_id)
        if (!student) continue

        if (record.status === 'late') {
          detectedViolations.push({
            id: `att-${session.id}-${student.id}`,
            student,
            type: 'Late attendance',
            sessionOrTaskName: session.title,
            sessionOrTaskId: session.id
          })
        } else if (record.status === 'absent') {
          detectedViolations.push({
            id: `att-${session.id}-${student.id}`,
            student,
            type: 'Absent attendance',
            sessionOrTaskName: session.title,
            sessionOrTaskId: session.id
          })
        } else if (record.status === 'truant') {
          detectedViolations.push({
            id: `att-${session.id}-${student.id}`,
            student,
            type: 'Truant attendance',
            sessionOrTaskName: session.title,
            sessionOrTaskId: session.id
          })
        }
      }
    }

    // Check task submission violations
    for (const task of tasks) {
      const submissions = await getTaskSubmissionsByTask(task.id)
      
      for (const submission of submissions) {
        // Skip if already sent or dismissed
        if (submission.notification_status === 'sent' || submission.notification_status === 'dismissed') continue

        const student = students.find(s => s.id === submission.student_id)
        if (!student) continue

        if (submission.status === 'Late') {
          detectedViolations.push({
            id: `task-${task.id}-${student.id}`,
            student,
            type: 'Late task submission',
            sessionOrTaskName: task.title,
            sessionOrTaskId: task.id
          })
        } else if (submission.status === 'Non Submission') {
          detectedViolations.push({
            id: `task-${task.id}-${student.id}`,
            student,
            type: 'Non Submission',
            sessionOrTaskName: task.title,
            sessionOrTaskId: task.id
          })
        }
      }
    }

    setViolations(detectedViolations)
  }

  const handleSendEmail = async (violation: Violation) => {
    setProcessingViolations(prev => new Set(prev).add(violation.id))
    try {
      const loggedEmail = await logEmailToDb(violation.student.id, violation.type, violation.sessionOrTaskName)
      
      const result = await sendEmailViaResend({
        to: loggedEmail.recipient_email,
        subject: loggedEmail.subject,
        content: loggedEmail.body
      })

      if (!result.success) {
        toast.error('Logged to DB but failed to send email via Resend')
      } else {
        toast.success(`Email sent to ${violation.student.name}'s parent: ${violation.type}`)
      }
      
      // Update status
      if (violation.id.startsWith('att-')) {
        await updateAttendanceNotificationStatus(violation.student.id, violation.sessionOrTaskId, 'sent')
      } else {
        await updateTaskSubmissionNotificationStatus(violation.student.id, violation.sessionOrTaskId, 'sent')
      }
      
      // Remove violation from list
      setViolations(prev => prev.filter(v => v.id !== violation.id))
      
      // Refresh sent emails
      const emails = await getSentEmails()
      setSentEmails(emails)
    } catch (error) {
      toast.error('Failed to send email')
    } finally {
      setProcessingViolations(prev => {
        const next = new Set(prev)
        next.delete(violation.id)
        return next
      })
    }
  }

  const handleDismiss = async (violation: Violation) => {
    try {
      if (violation.id.startsWith('att-')) {
        await updateAttendanceNotificationStatus(violation.student.id, violation.sessionOrTaskId, 'dismissed')
      } else {
        await updateTaskSubmissionNotificationStatus(violation.student.id, violation.sessionOrTaskId, 'dismissed')
      }
      
      toast.success(`Dismissed violation for ${violation.student.name}`)
      setViolations(prev => prev.filter(v => v.id !== violation.id))
    } catch (error) {
      toast.error('Failed to dismiss violation')
    }
  }

  const handleSendAllEmails = async () => {
    setIsSendingAll(true)
    try {
      let successCount = 0
      for (const violation of violations) {
        const loggedEmail = await logEmailToDb(violation.student.id, violation.type, violation.sessionOrTaskName)
        
        const result = await sendEmailViaResend({
          to: loggedEmail.recipient_email,
          subject: loggedEmail.subject,
          content: loggedEmail.body
        })
        
        if (result.success) successCount++

        // Update status
        if (violation.id.startsWith('att-')) {
          await updateAttendanceNotificationStatus(violation.student.id, violation.sessionOrTaskId, 'sent')
        } else {
          await updateTaskSubmissionNotificationStatus(violation.student.id, violation.sessionOrTaskId, 'sent')
        }
      }
      toast.success(`Sent ${successCount} emails`)
      setViolations([])
      
      // Refresh sent emails
      const emails = await getSentEmails()
      setSentEmails(emails)
    } catch (error) {
      toast.error('Failed to send emails')
    } finally {
      setIsSendingAll(false)
    }
  }

  const handleDismissAll = async () => {
    try {
      for (const violation of violations) {
        if (violation.id.startsWith('att-')) {
          await updateAttendanceNotificationStatus(violation.student.id, violation.sessionOrTaskId, 'dismissed')
        } else {
          await updateTaskSubmissionNotificationStatus(violation.student.id, violation.sessionOrTaskId, 'dismissed')
        }
      }
      toast.success(`Dismissed ${violations.length} violations`)
      setViolations([])
    } catch (error) {
      toast.error('Failed to dismiss violations')
    }
  }

  const handleTemplateUpdate = async (templateId: string, subject: string, body: string) => {
    try {
      await updateEmailTemplate(templateId, subject, body)
      toast.success('Email template updated')
      
      // Refresh templates
      const templates = await getEmailTemplates()
      setEmailTemplates(templates)
    } catch (error) {
      toast.error('Failed to update template')
    }
  }

  const handleManualEmailSend = async () => {
    if (!manualRecipient || !manualSubject || !manualBody) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      // Create a manual email record
      const loggedEmail = await logManualEmail(
        null, 
        manualRecipient,
        manualSubject,
        manualBody
      )

      // Send via Resend
      const result = await sendEmailViaResend({
        to: manualRecipient,
        subject: manualSubject,
        content: manualBody
      })

      if (!result.success) {
        toast.error('Logged to DB but failed to send email via Resend')
      } else {
        toast.success(`Manual email sent to ${manualRecipient}`)
      }
      
      // Reset form
      setManualRecipient('')
      setManualSubject('')
      setManualBody('')
      setShowManualEmail(false)
      
      // Refresh sent emails
      const emails = await getSentEmails()
      setSentEmails(emails)
    } catch (error) {
      toast.error('Failed to send manual email')
    }
  }

  const applyTemplate = (template: EmailTemplate) => {
    setManualSubject(template.subject)
    setManualBody(template.body)
    setSelectedTemplate(template)
  }

  return (
    <div className="terminal-container h-full">
      <div className="terminal-section-header">
        MAIL SENDER
      </div>
      
      <div className="terminal-content">
        {/* Violations Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-orange">Pending Violations ({violations.length})</h3>
            {violations.length > 0 && (
              <div className="flex gap-2">
                <button onClick={handleDismissAll} className="terminal-button border-red-500 text-red-500 hover:text-red-400">
                  Dismiss All
                </button>
                <button 
                  onClick={handleSendAllEmails} 
                  className="terminal-button flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={isSendingAll}
                >
                  {isSendingAll ? (
                    <>
                      Processing <Loader className="w-4 h-4 animate-spin" />
                    </>
                  ) : (
                    'Confirm Send All'
                  )}
                </button>
              </div>
            )}
          </div>
          
          <div className="border border-white/20 min-h-[200px] bg-black flex flex-col">
            {loading ? (
              <div className="flex flex-1 gap-2 items-center justify-center text-secondary p-4 italic">
                Loading violations <Loader className='w-3 h-3 animate-spin'/>
              </div>
            ) : violations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-secondary p-4 italic">
                No pending violations
              </div>
            ) : (
              <div className="flex flex-col gap-[1px] bg-border-color">
                {violations.map((violation) => (
                  <div key={violation.id} className="bg-black p-2 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-cyan">{violation.student.name}</span>
                      <span className="text-secondary"> - {violation.type} for {violation.sessionOrTaskName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDismiss(violation)}
                        className="terminal-button text-xs border-red-500 text-red-500 hover:text-red-400"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleSendEmail(violation)}
                        className="terminal-button text-xs flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
                        disabled={processingViolations.has(violation.id) || isSendingAll}
                      >
                        {processingViolations.has(violation.id) ? (
                          <>
                            Processing <Loader className="w-3 h-3 animate-spin" />
                          </>
                        ) : (
                          'Confirm Send'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Templates Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-orange w-full pb-2 border-b border-orange-500/50">Email Templates</h3>
            <button 
              onClick={() => setShowTemplateEditor(!showTemplateEditor)}
              className="terminal-button w-[25%]"
            >
              {showTemplateEditor ? 'Hide Editor' : 'Edit Templates'}
            </button>
          </div>

          {showTemplateEditor && (
            <div className="mb-4 space-y-4">
              {emailTemplates.map((template) => (
                <div key={template.id} className="p-4 border-b border-orange-500/50">
                  <h4 className="text-orange mb-2">{template.violation_type}</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-secondary mb-1">Subject</label>
                      <input
                        type="text"
                        value={template.subject}
                        onChange={(e) => {
                          const updated = { ...template, subject: e.target.value }
                          setEmailTemplates(prev => 
                            prev.map(t => t.id === template.id ? updated : t)
                          )
                        }}
                        className="terminal-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-secondary mb-1">Body</label>
                      <textarea
                        value={template.body}
                        onChange={(e) => {
                          const updated = { ...template, body: e.target.value }
                          setEmailTemplates(prev => 
                            prev.map(t => t.id === template.id ? updated : t)
                          )
                        }}
                        className="terminal-input w-full h-24"
                      />
                    </div>
                    <button
                      onClick={() => handleTemplateUpdate(template.id, template.subject, template.body)}
                      className="terminal-button"
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Email Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-orange w-full pb-2 border-b border-orange-500/50">Manual Email</h3>
            <button 
              onClick={() => setShowManualEmail(!showManualEmail)}
              className="terminal-button w-[25%]"
            >
              {showManualEmail ? 'Hide Composer' : 'Compose Email'}
            </button>
          </div>

          {showManualEmail && (
            <div className="p-4 border-b border-orange-500/50">
              <div className="space-y-4">
                <div>
                  <label className="block text-secondary mb-1">Template</label>
                  <select
                    onChange={(e) => {
                      const template = emailTemplates.find(t => t.id === e.target.value)
                      if (template) applyTemplate(template)
                    }}
                    className="terminal-input w-full"
                  >
                    <option value="">Select Template</option>
                    {emailTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.violation_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-secondary mb-1">Recipient</label>
                  <input
                    type="email"
                    value={manualRecipient}
                    onChange={(e) => setManualRecipient(e.target.value)}
                    className="terminal-input w-full"
                    placeholder="parent@email.com"
                  />
                </div>
                <div>
                  <label className="block text-secondary mb-1">Subject</label>
                  <input
                    type="text"
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                    className="terminal-input w-full"
                    placeholder="Email subject"
                  />
                </div>
                <div>
                  <label className="block text-secondary mb-1">Body</label>
                  <textarea
                    value={manualBody}
                    onChange={(e) => setManualBody(e.target.value)}
                    className="terminal-input w-full h-32"
                    placeholder="Email body"
                  />
                </div>
                <button
                  onClick={handleManualEmailSend}
                  className="terminal-button"
                >
                  Send Email
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student List for Quick Selection */}
        <div className="mb-6">
          <h3 className="text-orange mb-4">Quick Student Selection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {students.map((student) => (
              <div key={student.id} className="terminal-grid-item">
                <div className="font-bold text-cyan">{student.name}</div>
                <div className="text-secondary text-xs">{student.parent_name}</div>
                <div className="text-secondary text-xs">{student.parent_email}</div>
                <button
                  onClick={() => {
                    setManualRecipient(student.parent_email)
                    setShowManualEmail(true)
                  }}
                  className="terminal-button text-xs mt-2"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Email History */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-orange">Email History</h3>
            <button 
              onClick={() => setShowEmailHistory(!showEmailHistory)}
              className="terminal-button"
            >
              {showEmailHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          {showEmailHistory && (
            <div className="space-y-2">
              {sentEmails.filter(email => 
                students.some(student => student.id === email.student_id)
              ).map((email) => (
                <div key={email.id} className="terminal-grid-item">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-cyan">{email.recipient_email}</div>
                      <div className="text-secondary text-xs">{email.subject}</div>
                      <div className="text-tertiary text-xs">
                        {new Date(email.sent_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEmail(email)}
                      className="terminal-button text-xs"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Detail Modal */}
        {selectedEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="terminal-container max-w-2xl max-h-96">
              <div className="terminal-section-header flex justify-between items-center">
                <span>Email Details</span>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="terminal-button"
                >
                  Close
                </button>
              </div>
              <div className="terminal-content">
                <div className="space-y-4">
                  <div>
                    <strong className="text-orange">To:</strong> {selectedEmail.recipient_email}
                  </div>
                  <div>
                    <strong className="text-orange">Subject:</strong> {selectedEmail.subject}
                  </div>
                  <div>
                    <strong className="text-orange">Sent:</strong> {new Date(selectedEmail.sent_at).toLocaleString()}
                  </div>
                  <div>
                    <strong className="text-orange">Body:</strong>
                    <pre className="mt-2 p-2 bg-gray-900 border border-border-color whitespace-pre-wrap">
                      {selectedEmail.body}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
