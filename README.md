# ClinicApp 🏥

A role-based medical clinic management app built from scratch using React and Supabase.

## What the app does

ClinicApp solves a real-world problem: managing a medical clinic with different user roles, each with their own experience.

**Admin** can:
- Add, edit and delete doctors and patients
- View and manage all appointments
- Assign roles to users (patient, doctor, admin) directly from the UI

**Doctors** can:
- View their appointments filtered by any date
- Access patient details and write medical records (diagnosis, treatment, recommendations)
- See a full list of their patients with diagnostic history

**Patients** can:
- Register and log in with full form validation and sanitization
- Book appointments by choosing a specialization and doctor
- View and cancel their appointments
- Access their own medical records written by doctors

The app enforces business rules like no appointments outside 08:00–17:00, and a minimum 60-minute gap between appointments.

## Tools & LLMs used

- **Claude (claude.ai)** — used throughout the entire build for architecture decisions, generating React components, debugging Supabase queries, and iterating on features step by step
- **Cursor** — AI-powered code editor that accelerated writing and editing files
- **Supabase** — PostgreSQL database with built-in authentication
- **React + Vite + Tailwind CSS + React Router**

## Hallucination / Technical Hurdle

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
