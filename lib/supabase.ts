import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gjuvttdapczfpltrrbxr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdXZ0dGRhcGN6ZnBsdHJyYnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzcyMzcsImV4cCI6MjA4NDY1MzIzN30.4phzRoITBAd4fJj1esYwtU-fjylLnLi-7hJgiGqMnsc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)