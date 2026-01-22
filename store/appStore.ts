import { create } from 'zustand'
import { ClassName, Student, Session, Task, AttendanceRecord, TaskSubmission, EmailTemplate, Settings } from '@/actions/dbactions'

interface AppState {
  currentClass: ClassName
  students: Student[]
  sessions: Session[]
  tasks: Task[]
  emailTemplates: EmailTemplate[]
  settings: Settings | null
  selectedStudents: string[]
  loading: boolean
  
  // Actions
  setCurrentClass: (className: ClassName) => void
  setStudents: (students: Student[]) => void
  setSessions: (sessions: Session[]) => void
  setTasks: (tasks: Task[]) => void
  setEmailTemplates: (templates: EmailTemplate[]) => void
  setSettings: (settings: Settings) => void
  toggleStudentSelection: (studentId: string) => void
  clearStudentSelection: () => void
  selectMultipleStudents: (studentIds: string[]) => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentClass: '11A',
  students: [],
  sessions: [],
  tasks: [],
  emailTemplates: [],
  settings: null,
  selectedStudents: [],
  loading: false,
  
  setCurrentClass: (className) => set({ currentClass: className }),
  setStudents: (students) => set({ students }),
  setSessions: (sessions) => set({ sessions }),
  setTasks: (tasks) => set({ tasks }),
  setEmailTemplates: (templates) => set({ emailTemplates: templates }),
  setSettings: (settings) => set({ settings }),
  
  toggleStudentSelection: (studentId) => set((state) => ({
    selectedStudents: state.selectedStudents.includes(studentId)
      ? state.selectedStudents.filter(id => id !== studentId)
      : [...state.selectedStudents, studentId]
  })),
  
  clearStudentSelection: () => set({ selectedStudents: [] }),
  
  selectMultipleStudents: (studentIds) => set({ selectedStudents: studentIds }),
  
  setLoading: (loading) => set({ loading })
}))