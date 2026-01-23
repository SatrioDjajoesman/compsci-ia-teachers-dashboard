'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import ClassNavigation from './ClassNavigation'
import AttendanceSection from './AttendanceSection'
import TasksSection from './TasksSection'
import StudentsSection from './StudentsSection'
import MailSenderSection from './MailSenderSection'
import SettingsSection from './SettingsSection'
import { initializeDatabase } from '@/actions/dbactions'

type TabType = 'attendance' | 'tasks' | 'students' | 'mail' | 'settings'

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('attendance')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize database on mount
    initializeDatabase().then(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault()
            setActiveTab('attendance')
            break
          case 't':
            e.preventDefault()
            setActiveTab('tasks')
            break
          case 's':
            e.preventDefault()
            setActiveTab('students')
            break
          case 'm':
            e.preventDefault()
            setActiveTab('mail')
            break
          case ',':
            e.preventDefault()
            setActiveTab('settings')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (loading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-orange text-xl mb-2">INITIALIZING DATABASE...</div>
          <div className="text-secondary">Please wait while we set up your teacher dashboard</div>
        </div>
      </div>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'attendance':
        return <AttendanceSection />
      case 'tasks':
        return <TasksSection />
      case 'students':
        return <StudentsSection />
      case 'mail':
        return <MailSenderSection />
      case 'settings':
        return <SettingsSection />
      default:
        return <AttendanceSection />
    }
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="terminal-header flex items-center justify-between">
        <div className="text-orange font-bold">TEACHER DASHBOARD</div>
        <ClassNavigation />
        <div className="text-secondary text-xs">
          Ctrl+A/T/S/M/, for tabs
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="terminal-nav">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`terminal-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
          >
            ATTENDANCE
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`terminal-nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
          >
            TASKS
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`terminal-nav-item ${activeTab === 'students' ? 'active' : ''}`}
          >
            STUDENTS
          </button>
          <button
            onClick={() => setActiveTab('mail')}
            className={`terminal-nav-item ${activeTab === 'mail' ? 'active' : ''}`}
          >
            MAIL
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`terminal-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          >
            SETTINGS
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {renderTab()}
      </main>
    </div>
  )
}
