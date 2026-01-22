'use client'

import { useAppStore } from '@/store/appStore'
import { ClassName } from '@/actions/dbactions'
import { useEffect } from 'react'

const classes: ClassName[] = ['11A', '11B', '11C', '11D']

export default function ClassNavigation() {
  const { currentClass, setCurrentClass } = useAppStore()

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            setCurrentClass('11A')
            break
          case '2':
            e.preventDefault()
            setCurrentClass('11B')
            break
          case '3':
            e.preventDefault()
            setCurrentClass('11C')
            break
          case '4':
            e.preventDefault()
            setCurrentClass('11D')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [setCurrentClass])

  return (
    <nav className="terminal-nav flex justify-center">
      <div className="flex space-x-1">
        {classes.map((className) => (
          <button
            key={className}
            onClick={() => setCurrentClass(className)}
            className={`terminal-nav-item ${
              currentClass === className ? 'active' : ''
            }`}
          >
            {className}
          </button>
        ))}
      </div>
      <div className="ml-8 text-secondary text-xs">
        Ctrl+1/2/3/4 to switch classes
      </div>
    </nav>
  )
}