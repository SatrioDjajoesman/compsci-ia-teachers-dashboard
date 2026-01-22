'use client'

import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '@/actions/dbactions'
import toast from 'react-hot-toast'

interface SettingsData {
  id: string
  auto_send_email: boolean
  email_delay_minutes: number
  task_late_submission_hours: number
}

export default function SettingsSection() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      setSettings(data)
    } catch (error) {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    
    try {
      setSaving(true)
      await updateSettings(settings)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = (key: keyof SettingsData, value: boolean | number) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return (
      <div className="terminal-container h-full">
        <div className="terminal-section-header">SETTINGS</div>
        <div className="terminal-content">
          <div className="text-secondary">Loading settings...</div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="terminal-container h-full">
        <div className="terminal-section-header">SETTINGS</div>
        <div className="terminal-content">
          <div className="text-red">Failed to load settings</div>
        </div>
      </div>
    )
  }

  return (
    <div className="terminal-container h-full">
      <div className="terminal-section-header">
        SETTINGS
      </div>
      
      <div className="terminal-content">
        <div className="space-y-6">
          {/* Email Settings */}
          <div className="terminal-container">
            <div className="terminal-section-header text-sm">EMAIL SETTINGS</div>
            <div className="terminal-content space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-secondary">
                  Enable automatic email sending
                </label>
                <input
                  type="checkbox"
                  checked={settings.auto_send_email}
                  onChange={(e) => handleSettingChange('auto_send_email', e.target.checked)}
                  className="terminal-input"
                />
              </div>
              
              <div>
                <label className="block text-secondary mb-2">
                  Delay between emails (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.email_delay_minutes}
                  onChange={(e) => handleSettingChange('email_delay_minutes', parseInt(e.target.value) || 0)}
                  className="terminal-input w-full"
                />
                <div className="text-tertiary text-xs mt-1">
                  Time to wait between sending automated emails
                </div>
              </div>
            </div>
          </div>

          {/* Task Settings */}
          <div className="terminal-container">
            <div className="terminal-section-header text-sm">TASK SETTINGS</div>
            <div className="terminal-content space-y-4">
              <div>
                <label className="block text-secondary mb-2">
                  Late submission threshold (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.task_late_submission_hours}
                  onChange={(e) => handleSettingChange('task_late_submission_hours', parseInt(e.target.value) || 24)}
                  className="terminal-input w-full"
                />
                <div className="text-tertiary text-xs mt-1">
                  Hours after due date when task is considered late
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="terminal-container">
            <div className="terminal-section-header text-sm">KEYBOARD SHORTCUTS</div>
            <div className="terminal-content">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Switch to class 11A:</span>
                  <span className="text-cyan">Ctrl + 1</span>
                </div>
                <div className="flex justify-between">
                  <span>Switch to class 11B:</span>
                  <span className="text-cyan">Ctrl + 2</span>
                </div>
                <div className="flex justify-between">
                  <span>Switch to class 11C:</span>
                  <span className="text-cyan">Ctrl + 3</span>
                </div>
                <div className="flex justify-between">
                  <span>Switch to class 11D:</span>
                  <span className="text-cyan">Ctrl + 4</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="terminal-button"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}