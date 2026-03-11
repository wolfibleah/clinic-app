# ClinicApp 
A role-based medical clinic management app built from scratch using React and Supabase.

## What the app does
ClinicApp solves a real-world problem: managing a medical clinic with different user roles, each with their own experience.

**Admin** can:
- Add, edit and delete doctors and patients
- View and manage all appointments
- Assign roles to users (patient, doctor, admin) directly from the UI

**Doctors** can:
- View appointments filtered by date, with quick buttons for Today / Tomorrow
- Auto-complete past appointments and manually finalize, cancel, or reactivate them
- Add quick notes to any appointment
- Export the day's appointments as PDF or CSV
- Access patient details including age calculated from birth date
- Write and update medical records (diagnosis, treatment, recommendations, notes)
- Export a patient's medical record as PDF or CSV
- Upload and manage files (images, PDFs, documents) attached to a patient's record
- Filter uploaded files by appointment
- Search patients by name
- View full appointment history per patient

**Patients** can:
- Register and log in with full form validation and sanitization
- Book appointments by choosing a specialization, doctor, date and available time slot
- Add a reason for the consultation when booking
- View, edit and cancel their scheduled appointments
- Access their own medical records written by doctors

The app enforces business rules like no double-booking, a minimum 60-minute gap between a patient's own appointments, and prevents manual finalization before the appointment time has passed.

## Tools & LLMs used
- **Claude (claude.ai)** — used throughout the build for architecture decisions, code generation and debugging
- **Cursor** — AI-powered code editor that accelerated writing and editing files
- **Supabase** — PostgreSQL database with built-in authentication and file storage (Storage buckets)
- **React + Vite + Tailwind CSS + React Router**

## Database
- `profiles` — stores user roles (admin, doctor, patient) linked to Supabase Auth
- `doctors` — doctor records with specialization, phone, email
- `patients` — patient records with birth date and contact info
- `appointments` — links patients and doctors with date, time, reason, status and notes
- `medical_records` — diagnosis, treatment, recommendations and notes per patient/doctor pair
- `medical_files` — file metadata (name, URL, type, notes) linked to patients and optionally to appointments
- **Storage bucket** `medical-files` — stores uploaded images and documents

## Hallucination / Technical Hurdle
**Hurdle #1: Wrong field used in Supabase query**
When building the doctor dashboard, Claude generated a query to find the doctor by email but passed `profile.full_name` as the value instead of the actual email. This caused a 406 error and no appointments were loading. The bug was subtle — the code looked correct at first glance. I caught it by adding `console.log` statements and comparing the query params with the actual database values. I then prompted Claude with the exact error and the log output, and it identified the field mismatch immediately.

**Hurdle #2: Wrong relative import paths**
Claude generated all import paths as `../supabaseClient` and `../context/AuthContext`, which worked fine for top-level pages. But when we restructured the app into subfolders (`admin/`, `doctor/`, `patient/`), all those imports broke with a Vite resolution error. Claude initially didn't account for the extra folder depth. I pointed out the folder structure and asked it to reconsider the paths — the fix was simply changing `../` to `../../` across all files in the subfolders.

Both cases were good reminders that AI-generated code needs to be read and understood, not just copy-pasted.

## Setup
1. Clone the repo
2. Run `npm install`
3. Create a `.env` file:
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_KEY=your_anon_key
```
4. Run `npm run dev`
5. In Supabase, create a public storage bucket named `medical-files`
6. Create the following tables: `profiles`, `doctors`, `patients`, `appointments`, `medical_records`, `medical_files`
