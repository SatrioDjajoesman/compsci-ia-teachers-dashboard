'use client'

import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '@/actions/dbactions'
import toast from 'react-hot-toast'

interface SettingsData {
  id: string
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
