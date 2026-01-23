'use client'

import { useAppStore } from '@/store/appStore'
import { ClassName } from '@/actions/dbactions'
import { useEffect } from 'react'

const classes: ClassName[] = ['11A', '11B', '11C', '11D']

export default function ClassNavigation() {
  const { currentClass, setCurrentClass, allowedClasses } = useAppStore()

  const isClassAllowed = (className: ClassName) => {
    if (!allowedClasses) return true
    return allowedClasses.includes(className)
  }

  const handleClassChange = (className: ClassName) => {
    if (isClassAllowed(className)) {
      setCurrentClass(className)
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        let targetClass: ClassName | null = null
        switch (e.key) {
          case '1': targetClass = '11A'; break
          case '2': targetClass = '11B'; break
          case '3': targetClass = '11C'; break
          case '4': targetClass = '11D'; break
        }

        if (targetClass) {
          e.preventDefault()
          handleClassChange(targetClass)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [setCurrentClass, allowedClasses])

  return (
    <nav className="terminal-nav flex justify-center">
      <div className="flex space-x-1">
        {classes.map((className) => {
          const allowed = isClassAllowed(className)
          return (
            <button
              key={className}
              onClick={() => handleClassChange(className)}
              disabled={!allowed}
              className={`terminal-nav-item ${
                currentClass === className ? 'active' : ''
              } ${!allowed ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              {className}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
