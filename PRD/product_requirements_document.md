# Product Requirements Document (PRD): Teacher Dashboard

## 1. Executive Summary
The **Teacher Dashboard** is a comprehensive web application designed to streamline the administrative workflow for high school teachers. It serves as a centralized command center for managing student attendance, tracking assignment submissions, and automating communication with parents.

The core problem this product addresses is the time-consuming nature of manual record-keeping and the delay in communicating student issues (such as truancy or missed homework) to parents. By integrating real-time data management with an automated email notification system, the Teacher Dashboard aims to significantly reduce administrative overhead, ensure timely parental involvement, and ultimately improve student accountability and performance. The target launch timeline is Q2 2026.

## 2. Project Overview
*   **Product Name:** Teacher Dashboard (Internal Codename: `compsci-ia`)
*   **Version:** 0.1.0
*   **Document Owner:** Product Manager
*   **Last Updated:** 2026-01-23
*   **Current Status:** Draft / In Development
*   **Stakeholders:**
    *   **Product:** Product Manager
    *   **Engineering:** Lead Developer (Full Stack)
    *   **Users:** High School Computer Science Teachers (initially), potentially scalable to other departments.

## 3. Problem Statement
*   **The Problem:** Teachers currently spend excessive time manually tracking attendance and checking homework across multiple platforms or paper records. More critically, notifying parents about "violations" (lateness, absence, missed work) is a manual process that often happens days later or not at all due to time constraints.
*   **Frequency:** Daily (every class session).
*   **Impact:**
    *   **Teacher Burnout:** 5-10 hours/week spent on admin tasks.
    *   **Student Accountability:** Delayed feedback loops mean behavior isn't corrected promptly.
    *   **Parental Engagement:** Parents are often unaware of issues until report cards.
*   **Criticality:** Solving this now is critical to modernize the classroom workflow and enable teachers to focus more on instruction rather than administration.

## 4. Purpose & Goals
*   **Vision Statement:** To create the ultimate "co-pilot" for teachers that handles the mundane logistics of classroom management, allowing them to focus on teaching.
*   **Strategic Alignment:** Aligns with the goal of digitizing school operations and improving parent-teacher communication efficiency.
*   **Primary Goals:**
    1.  Reduce daily administrative time by 50%.
    2.  Achieve 100% consistency in notifying parents of attendance/task violations within 24 hours.
    3.  Centralize student data (attendance, tasks, contact info) into one accessible dashboard.
*   **Non-Goals:**
    *   Learning Management System (LMS) features like grading essays or hosting course content.
    *   Student-facing portal (this is strictly for teachers).

## 5. Target Users
*   **Primary Persona:** **The Busy High School Teacher**
    *   **Demographics:** Tech-savvy enough to use web apps, manages 4-6 classes (e.g., 11A, 11B, 11C, 11D) with 20-30 students each.
    *   **Needs:** Speed, keyboard shortcuts, reliability, automation.
    *   **Pain Points:** Too many clicks to mark attendance, forgetting to email parents, "context switching" between different tools.
    *   **Workflow:** Starts class -> Takes attendance -> Checks homework -> Teaches -> (Ideally) Emails parents about issues.

## 6. Success Criteria & Metrics
### Key Performance Indicators (KPIs)
| Metric | Baseline | Target | Timeframe |
| :--- | :--- | :--- | :--- |
| **Admin Time per Class** | 15 mins | < 5 mins | Launch + 1 Month |
| **Parent Notification Rate** | 40% (Manual) | 100% (Auto) | Launch |
| **Email Delivery Latency** | 24-48 hours | < 1 hour | Launch |

### Success Thresholds
*   **MVP:** Functional attendance/task tracking and manual email triggering.
*   **Target:** Fully automated background email processing based on settings.

### Measurement Methods
*   Database logs (Supabase) to track record creation vs. email sent timestamps.
*   User feedback surveys for time savings.

## 7. Features & Functionality

### Phase 1 (MVP)

#### 1. Dashboard & Class Navigation
*   **Description:** A terminal-themed landing page allowing quick switching between different class sections (11A, 11B, etc.).
*   **User Story:** "As a teacher, I want to quickly switch between my Grade 11 classes so I can manage the current session without reloading the page."
*   **Priority:** Critical
*   **Acceptance Criteria:**
    *   Tabs or keys to switch classes.
    *   Data refreshes immediately upon switch.
    *   Keyboard shortcuts (Ctrl+A, T, S, M, ,) for navigation.

#### 2. Attendance Management
*   **Description:** Interface to mark students as Present, Absent, Late, Truant, or Excused.
*   **User Story:** "As a teacher, I want to mark attendance for the whole class in under a minute."
*   **Priority:** Critical
*   **Acceptance Criteria:**
    *   List all students in selected class.
    *   Dropdown/Toggle for status: `n/a`, `present`, `absent`, `late`, `truant`, `excused absence`.
    *   Auto-save to database.

#### 3. Task & Submission Tracking
*   **Description:** Create tasks (homework) and track student submission status.
*   **User Story:** "As a teacher, I want to see who hasn't submitted their homework so I can follow up."
*   **Priority:** Critical
*   **Acceptance Criteria:**
    *   Create new Task (Title, Due Date).
    *   Mark status: `Submitted`, `Awaiting submission`, `Late`, `Non Submission`.
    *   Visual indicators for late/missing work.

#### 4. Parent Communication System (Mail)
*   **Description:** Send templated emails to parents based on "violations" (Late, Truant, Absent, Late Submission, Non-Submission).
*   **User Story:** "As a teacher, I want to send a standardized email to the parents of all truant students with one click."
*   **Priority:** Critical
*   **Acceptance Criteria:**
    *   Pre-defined templates for 5 violation types.
    *   Variable substitution ({STUDENT_NAME}, {PARENT_NAME}).
    *   "Send Email" button triggers Resend API.
    *   Log sent emails in history.

#### 5. Student Directory
*   **Description:** Read-only view of student details and parent contact info.
*   **Priority:** High
*   **Acceptance Criteria:** List View with Name, Email, Parent Name, Parent Phone.

#### 6. Settings
*   **Description:** Configuration for automation.
*   **Priority:** Medium
*   **Acceptance Criteria:**
    *   Toggle `auto_send_email`.
    *   Set `email_delay_minutes`.
    *   Set `task_late_submission_hours`.

### Phase 2 (Post-MVP)
*   **Analytics Dashboard:** Visual charts of attendance trends over time.
*   **Bulk Import:** CSV import for student lists.
*   **Mobile App:** Dedicated mobile interface for taking attendance while walking around.

## 8. User Experience & Design Requirements
*   **Visual Style:** "Terminal/Hacker" aesthetic.
    *   Background: Black (`#000000`).
    *   Accents: Orange/Amber (Retro terminal feel).
    *   Font: Monospace (Geist Mono).
*   **Interaction Design:**
    *   **Keyboard First:** Heavy reliance on hotkeys (Ctrl+Key) for power users.
    *   **Minimal Clicks:** Actions should be single-click or toggle where possible.
    *   **Feedback:** Toast notifications for success/error (e.g., "Email Sent", "Saved").
*   **Responsiveness:** Primary focus on Desktop/Laptop (teacher's desk), but functional on Tablet.

## 9. Technical Considerations

### Architecture & Infrastructure
*   **Frontend:** Next.js 16 (App Router).
*   **Backend/Database:** Supabase (PostgreSQL).
*   **State Management:** Zustand (for global UI state like active tab).
*   **Email Service:** Resend API + React Email for templating.
*   **Styling:** Tailwind CSS.

### Data Model (Key Tables)
*   `students` (id, name, class_name, parent_details...)
*   `attendance_records` (student_id, session_id, status...)
*   `task_submissions` (student_id, task_id, status...)
*   `email_templates` (violation_type, subject, body)
*   `sent_emails` (log of communications)

### Security & Compliance
*   **Authentication:** Supabase Auth (Row Level Security - RLS enabled).
*   **Data Privacy:** Store parent data securely. RLS policies must restrict access to authenticated teachers only.

## 10. Implementation Timeline
*   **Week 1: Foundation**
    *   Setup Next.js & Supabase.
    *   Database Schema implementation.
    *   Basic Layout & Navigation.
*   **Week 2: Core Modules**
    *   Attendance & Student lists.
    *   Task creation & tracking.
*   **Week 3: Communication**
    *   Integration with Resend.
    *   Email Templates & Sending logic.
*   **Week 4: Polish & Settings**
    *   Settings page.
    *   Keyboard shortcuts.
    *   Testing & Bug fixes.

## 11. Risks & Mitigation Strategies
| Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Email Deliverability** (Spam filters) | Medium | High | Use verified domain with Resend; keep templates professional. |
| **Data Entry Errors** (Teacher mistakes) | Medium | Medium | Implement "Undo" actions; allow editing of past records. |
| **API Rate Limits** (Resend) | Low | High | Implement queuing or batching for bulk emails. |
| **Browser Compatibility** | Low | Low | Focus on Chrome/Edge (standard school browsers). |

## 12. Open Questions & Assumptions
*   **Assumption:** Teachers have a reliable internet connection in class.
*   **Assumption:** School policy allows automated emails to parents without prior manual approval per email.
*   **Question:** Do we need to support multiple teachers sharing the same classes? (Currently assuming single-user/single-tenant model).

## 13. Appendix
*   **Glossary:**
    *   **Violation:** Any event triggering a potential parent email (Late, Absent, Truant, Missing Work).
    *   **RLS:** Row Level Security (Supabase feature).
*   **References:**
    *   [Supabase Documentation](https://supabase.com/docs)
    *   [Resend Documentation](https://resend.com/docs)
    *   [Next.js Documentation](https://nextjs.org/docs)
