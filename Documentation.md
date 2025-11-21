## Table of Contents (Index)
1. Executive Summary
2. Introduction & Purpose
3. Project Context and Goals
4. High-level Architecture
5. Modules & Folder Mapping
6. User Roles and Permissions
7. Features by Role (Functional Requirements)
8. Key UI Flows (sequence + short descriptions)
9. Data Model (Firestore schema)
10. Security & Rules (high-level)
11. Tech Stack and Daependencies
12. Suggested UML Diagrams (names + descriptions + filenames)
13. Deployment & Run Instructions
14. Tests & Quality Gates
15. Diagrams & Assets (suggested filenames)
16. Appendix: API / Hook references
17. Bibliography & References

---

## 1 — Executive Summary
This application is a college assignment and user-management portal built with Next.js (App Router), TypeScript, React and Firebase (Auth + Firestore). It supports role-based access for administrators, faculty, and students. Administrators can manage branches, subjects, users and assign classes to faculty. Faculty can create assignments and view submissions; students can view/submit assignments and see their dashboard. The project uses Tailwind CSS for styling and several Radix UI primitives for component building.

---

## 2 — Introduction & Purpose
Purpose: Provide a web-based system for managing academic structures (branches, classes, subjects), faculty assignment, creation and student submissions. The application aims to:
- Enable admins to register faculty and assign classes/subjects.
- Let faculty create assignments and review submissions.
- Allow students to view and submit assignments.
- Maintain role-based access and simple administrative workflows.

Audience: project maintainers, examiners, future contributors, or stakeholders.

---

## 3 — Project Context and Goals
- Single codebase Next.js app with client-side Firebase SDK usage for real-time data.
- Simpler small-college workflow: branches → years → semesters → subjects → classes → assignments.
- Goals: fast development, real-time updates for submissions/assignments, minimal backend setup (serverless Firestore).

Assumptions:
- Firebase project configured with Auth + Firestore.
- Admins have rights to create users (this is currently done client-side via an admin UI).
- Collections observed in code: `branches`, `subjects`, `faculties`, `roles_admin` (and likely `students`, `assignments`, `submissions`).

---

## 4 — High-level Architecture
- Frontend: Next.js (App Router) + React + TypeScript; UI uses custom component library based on Radix primitives and Tailwind CSS.
- Authentication & Database: Firebase Auth (Email/password), Firestore for persistence.
- Client Firebase initialization: index.ts + provider pattern (`FirebaseProvider`).
- Hooks: custom React hooks for Firestore (`useCollection`, `useDoc`) and role resolution (`useRole`).
- Pages: server-rendered/app directory pages for admin, faculty, student, login, profile, etc.
- UI components: kept under `src/components/*` for reuse.

Flow summary:
- User logs in → `useRole` reads auth user and queries `roles_admin` and `faculties` docs → assigns role (admin/faculty/student) → redirects to role dashboard.

---

## 5 — Modules & Folder Mapping
(From repository structure — map folders to features)

- src/app/
  - admin/
    - create-faculty/ (faculty creation UI)
    - dashboard/ (admin dashboard)
    - manage-subjects, manage-users, academic-settings
  - faculty/
    - create-assignment/
    - dashboard/
    - submissions/
  - student/
    - assignments/
    - dashboard/
  - login/ (login UI)
  - profile/
  - debug/
  - about/
- src/components/
  - admin/ (dialogs and admin forms)
    - AddFacultyForm.tsx
    - AddClassToFacultyDialog.tsx
    - AddSubjectDialog.tsx, etc.
  - ui/ (atomic UI components using Radix + Tailwind)
- src/firebase/
  - index.ts (initialize + SDK getters)
  - client-provider.tsx (provider wrapper)
  - firestore/
    - use-collection.tsx
    - use-doc.tsx
  - provider.tsx (context and hooks)
- src/hooks/
  - useRole.ts (role detection)
  - use-mobile.tsx (responsive)
  - use-toast.ts (toasts)
- src/lib/
  - utils.ts, placeholder-images.ts
- src/ai/ (genkit / AI helper scripts)

---

## 6 — User Roles and Permissions
Roles observed:
- Admin
  - Dashboard: /admin/dashboard
  - Create/edit users: create faculty, students, branches, subjects.
  - Assign classes to faculty.
  - Manage academic settings.
  - Permissions: full CRUD on `branches`, `subjects`, `faculties`, and `roles_admin`.
- Faculty
  - Dashboard: /faculty/dashboard
  - Create assignments, view submissions, grade.
  - Access assigned classes and their subjects.
  - Permissions: read/write on their own assignments and class-submissions; read access to subjects/branches relevant to assigned classes.
- Student
  - Dashboard: /student/dashboard
  - View assignments, submit assignment files or text.
  - Permissions: read assignments for their classes, write submissions (only for their own record).

Authorization model notes:
- `useRole` uses existence of `roles_admin` doc and `faculties` doc to decide role. If neither exists and user is authenticated, the system assigns `student`.
- Security is currently client-driven — you should enforce Firestore security rules to prevent unauthorized writes (recommended below).

---

## 7 — Features by Role (Functional Requirements)
Admin features:
- Login / role-based redirect
- Create/edit faculty (enter name, facultyId, email, password) and assign classes + subjects
- Manage branches and subjects
- View/manage users and assignments
- Assign and reassign classes to faculty

Faculty features:
- Login / dashboard
- Create assignment (title, description, due date, attachments)
- View assigned classes / subjects
- View student submissions and grade them (status: pending/graded)
- Leave feedback (optional via AI/feedback module)

Student features:
- Login / dashboard
- View assignments for enrolled classes
- Submit assignment files, text, or links
- View submission status and feedback

Cross-cutting features:
- Responsive UI (mobile hooks)
- Toast notifications and error listeners (components/FirebaseErrorListener)
- Real-time updates via Firestore listeners (useCollection/useDoc)
- AI tools (src/ai/*) — optional features like feedback generation

---

## 8 — Key UI Flows (short descriptions)
1. Login Flow
   - User enters email/password → signInWithEmailAndPassword(auth, email, password) → `useRole` hook detects role → redirect to role dashboard.
2. Admin: Create Faculty
   - Admin navigates → Fill basic info + facultyId + password → select Branch/Year/Semester and subjects per class → Add Class button → Submit → create user in Auth → create `faculties` entry with uid and assigned classes.
3. Admin: Assign Class to Faculty (Dialog)
   - Open `AddClassToFacultyDialog` → select branch/year/semester → subjects load → click Add Class → queued assignments visible → assign to faculty (persist).
4. Faculty: Create Assignment
   - Create assignment UI → pick class/subject → save to `assignments` collection → students get assignment appear in their dashboard.
5. Student: Submit Assignment
   - Student views assignment → upload files / text → submission saved to `submissions` with reference to user and assignment.

---

## 9 — Data Model (Firestore schema — suggested)
Use Firestore collections as follows (simplified):

- branches (collection)
  - { id, name, createdAt }
- subjects (collection)
  - { id, name, branchId, year, semester, credits, createdAt }
- faculties (collection)
  - { id (doc id), uid (auth uid), facultyId, firstName, lastName, email, phone, department, classes: [ { branchId, branchName, year, semester, subjects: [subjectId] } ], isActive, createdAt }
- students (collection)
  - { id, uid, studentId, firstName, lastName, email, classes: [ {branchId, year, semester, section} ], ... }
- roles_admin (collection)
  - { uid } (presence signals admin role)
- assignments (collection)
  - { id, title, description, class: {branchId, year, semester, section}, subjectId, facultyId, dueDate, attachments: [], createdAt }
- submissions (collection)
  - { id, assignmentId, studentUid, files, text, submittedAt, grade, feedback, gradedByUid }
- audits / logs (optional)
  - { action, user, timestamp, details }

Indexes:
- subjects by branchId+year+semester (composite index)
- faculties by uid or facultyId
- assignments by class/subject/createdAt

Notes:
- In code we saw `roles_admin`, `branches`, `subjects`, `faculties`. Ensure collections used match the naming in Firestore and security rules.

---

## 10 — Security & Rules (high-level)
- Enforce Firestore rules so that:
  - Only admins can write to `faculties`, `branches`, `subjects` (or use custom claims).
  - Faculty can create assignments only for classes they are assigned to.
  - Students can only write submissions to assignments they are allowed to access and only for their own uid.
  - Use Firebase custom claims (set on server or via cloud function) or `roles_admin` collection plus server-side checks in Cloud Functions.
- Do not rely on client-only checks for role enforcement. Client-side role detection is UX only.
- If the admin UI creates Auth users client-side, ensure only admin-authenticated sessions can call that code (further restrict via rules/cloud function).

---

## 11 — Tech Stack & Dependencies (from package.json)
Primary stack:
- Framework: Next.js 15 (App Router) — `next@15.3.3`
- UI: React 18 (`react@^18.3.1`, `react-dom`)
- Language: TypeScript (`typescript@^5`)
- Styling: Tailwind CSS (`tailwindcss@^3.4.1`)
- Design/Components: Radix primitives + custom UI components (lots of `@radix-ui/*` packages)
- Firebase: `firebase@^11.10.0` (Auth, Firestore)
- Icons: `lucide-react`
- Form: `react-hook-form` and `@hookform/resolvers`
- Charts: `recharts`
- Date utils: `date-fns`
- Validation: `zod`
- Dev tools: `postcss`, `patch-package`, `genkit` (AI tooling)
- Other: `clsx`, `class-variance-authority`, `tailwind-merge`

Include in docs:
- Exact dependencies listed in package.json (I captured the file). Use that list for any dependency diagrams or license checks.

---

## 12 — Suggested UML Diagrams (names, descriptions, suggested filenames)
Create these diagrams in your preferred UML tool (draw.io, Lucidchart, PlantUML, Mermaid). Save diagrams as PNG/SVG/PlantUML files with the suggested filenames.

1. Use Case Diagram
   - Filename: diagrams/use-case-overview.png
   - Description: Actors (Admin, Faculty, Student) and high-level use cases: Manage Users, Assign Classes, Create Assignment, Submit Assignment, View Dashboard.
2. Component Diagram (Frontend)
   - Filename: diagrams/component-frontend.png
   - Description: Next.js App, Firebase provider, UI Components (Header, Sidebar, Dialogs), Pages (Admin Page, Faculty Page, Student Page), Hooks.
3. Component Diagram (Backend/Cloud)
   - Filename: diagrams/component-backend.png
   - Description: Firebase Auth, Firestore collections, Cloud Functions (optional).
4. Context Diagram
   - Filename: diagrams/context-system.png
   - Description: System boundary, external systems: Firebase, Storage, Email provider (optional).
5. Class Diagram (Data Model)
   - Filename: diagrams/class-firestore-schema.png
   - Description: Entities: Branch, Subject, Faculty, Student, Assignment, Submission and relations (one-to-many).
6. Sequence Diagram — Login & Role Redirect
   - Filename: diagrams/seq-login-role.png
   - Description: Browser → Next.js Login → Firebase Auth → useRole Hook → Firestore queries → Redirect to dashboard.
7. Sequence Diagram — Admin Create Faculty
   - Filename: diagrams/seq-admin-create-faculty.png
   - Description: Admin UI → createUserWithEmailAndPassword → create faculties doc → assign classes.
8. Sequence Diagram — Student Submit Assignment
   - Filename: diagrams/seq-student-submit.png
   - Description: Student UI → upload → submissions collection write → notification update to faculty.
9. Deployment Diagram
   - Filename: diagrams/deployment.png
   - Description: Hosting provider (Vercel or hosting), Firebase resources, CDN, Browser.

Optional: Add a Mermaid block in your Markdown for quick inline diagrams.

---

## 13 — Deployment & Run Instructions (dev & production)
Local dev:
1. Install dependencies:
   - npm install
2. Start dev server (project uses port 9002 in package.json):
```powershell
npm run dev
```
3. The app will run on http://localhost:9002 (per scripts).

Production build:
```powershell
npm run build
npm start
```
Deployment:
- Recommended: Vercel or Firebase Hosting with Next.js support. Ensure Firebase environment variables are set (or use the initialize fallback present in code).
- For Firebase, ensure `firebaseConfig` or environment variables (production) are present.

Environment configuration:
- The project tries to initialize Firebase without config in production (App Hosting integration) and falls back to `firebaseConfig` during development. Verify config.ts for dev settings.

---

## 14 — Tests & Quality Gates (suggested)
- Typecheck: `npm run typecheck` (tsc)
- Lint: `npm run lint` (if ESLint configured)
- Add unit tests for:
  - `useRole` (mock auth + firestore doc hooks) — happy path & edge cases
  - Dialog components: AddClassToFacultyDialog (UI behavior)
- Add an integration (E2E) test:
  - Admin create faculty flow: create user, ensure `faculties` doc created (mocked or using test Firebase project).

Quality gates in CI:
- Typecheck pass (tsc)
- Lint pass
- Unit tests pass (if added)
- Preview build (next build)

---

## 15 — Diagrams & Assets (suggested filenames)
Place diagrams under `/docs/diagrams/` with names used above:
- docs/diagrams/use-case-overview.png
- docs/diagrams/component-frontend.png
- docs/diagrams/class-firestore-schema.png
- docs/diagrams/seq-login-role.png
- docs/diagrams/seq-admin-create-faculty.png
- docs/diagrams/deployment.png

Include a small README in `/docs/` describing how to regenerate diagrams (e.g., Provide PlantUML or Mermaid sources).

---

## 16 — Appendix: Hooks & Key Files (quick navigation)
- useRole.ts — role detection and dashboardPath mapping
- AddClassToFacultyDialog.tsx — dialog UI for selecting class & subjects and adding to faculty
- page.tsx — admin create-faculty page (creates auth user + faculty doc)
- use-collection.tsx and `use-doc.tsx` — real-time Firestore hooks
- index.ts — firebase initialization
- provider.tsx — Firebase provider & useFirebase hook
- `src/components/ui` — component library (Select, Button, Card, etc.)
- `src/ai/*` — AI helpers (optional features)

---

## 17 — Bibliography & References
Core documentation and references to cite:
- Next.js
  - Next.js Official Docs — https://nextjs.org/docs
- React
  - React Official Docs — https://reactjs.org/docs/getting-started.html
- TypeScript
  - TypeScript Handbook — https://www.typescriptlang.org/docs/
- Firebase
  - Firebase Web Docs — https://firebase.google.com/docs/web
  - Firebase Auth — https://firebase.google.com/docs/auth
  - Cloud Firestore — https://firebase.google.com/docs/firestore
  - Firestore Security Rules — https://firebase.google.com/docs/rules
- Tailwind CSS
  - Tailwind CSS Docs — https://tailwindcss.com/docs
- Radix UI primitives
  - Radix UI — https://www.radix-ui.com/
- Lucide Icons
  - Lucide React — https://lucide.dev/
- React Hook Form
  - React Hook Form — https://react-hook-form.com
- Zod (schema validation)
  - Zod docs — https://zod.dev/
- GenKit (AI tooling used in repo)
  - Genkit docs — https://genkit.ai/ (or package docs)
- Additional reading on architecture and security:
  - Firebase Security Patterns — https://firebase.google.com/docs/rules/best-practices
  - Patterns for multi-role applications — various blog posts (cite as needed)

When producing a final academic bibliography, use proper citation format (APA/IEEE) for each source.

---

## Quick Recommendations & Action Items
- Enforce Firestore security rules (important) — move admin user creation to a Cloud Function or use Firebase Admin SDK on a secure backend.
- Replace client-side subject filtering with Firestore query (subject branch/year/semester index) if dataset grows large.
- Add unit tests for `useRole` and the class-assignment flows.
- Add diagrams under `/docs/diagrams` and link them in README.

---
