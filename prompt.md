Build a Next.js 14+ web application (App Router) to manage stock and marketplace listing status for SKUs across Amazon, Flipkart, Meesho, Myntra. The app will use Supabase (PostgreSQL) as the primary database, providing real-time updates, authentication, and an audit trail.

The goal: eliminate manual Excel/Google Sheet updates by providing a clean web interface where users can:

View all SKUs with current stock and listing status.

Update stock quantities and listing status (active/not listed) with a few clicks.

See a dashboard of recent changes.

All changes are stored in Supabase and are instantly reflected for all users (via real-time subscriptions).

Initially, you have data in a Google Sheet (provided as an Excel file). You’ll write a one-time import script to load that data into Supabase, after which the sheet is no longer needed.

Tech Stack 
Framework	Next.js 14 (App Router)
Styling	Tailwind CSS + shadcn/ui (or custom components)
Database	Supabase (PostgreSQL) – hosted
Authentication	Supabase Auth ( email/password)

have provided : /Users/admin1/Documents/web/inventorytool/Alya - Listing Sheet.xlsx for refernce 


Database Schema (Supabase)
We need three tables:

skus
Column	Type	Description
id	bigint (PK)	SKU number (from Excel)
amazon	text	Listing ID or "Not Listed"
flipkart	text	Listing ID or "Not Listed"
meesho	text	Listing ID or "Not Listed"
myntra	text	Listing ID or "Not Listed"
stock	integer	Stock quantity (nullable)
created_at	timestamptz	default now()
updated_at	timestamptz	default now() – trigger update
Note: The Excel sheet had numeric listing IDs like 1.0; we’ll store them as text to preserve formatting. "Not Listed" is stored as a string.

updates (audit log)
Column	Type	Description
id	uuid (PK)	auto-generated
user_id	uuid (FK)	references auth.users.id
user_email	text	snapshot of user email
sku	bigint	SKU number
field	text	e.g., stock, amazon etc.
old_value	text	old value (stringified)
new_value	text	new value (stringified)
created_at	timestamptz	default now()
profiles (optional, extends auth.users)
Column	Type	Description
id	uuid (PK)	references auth.users.id
full_name	text	from OAuth or user-provided
avatar_url	text	optional

✨ Core Features & Implementation
1. Authentication (Supabase Auth)
Use @supabase/ssr package to handle server-side auth.

Provide login page with:

Email/password sign-up/sign-in

Google OAuth (configured in Supabase dashboard)

Protect all routes except /login using middleware.

After login, redirect to /dashboard.

2. Data Import from Google Sheet (One-time)
Since you have an Excel file with the data, we can provide a simple script that reads the sheet (using xlsx library) and inserts rows into Supabase.

Alternatively, an API route /api/import can accept a file upload and process it.

The prompt will include instructions for running a Node script to import the existing data into Supabase.

3. SKU Data Display & Management
Use server components where possible to fetch data initially, then use client-side real-time subscription for updates.

Create a table component with:

Search by SKU.

Pagination (10/20/50 per page).

Filters (e.g., show only SKUs with stock < 5, or not listed on a specific marketplace).

Edit buttons for stock and each marketplace (preferably a dropdown for listing status + text input for listing ID).

Use react-hook-form + zod for validation.

4. Real-time Updates
Subscribe to changes on the skus table (using Supabase Realtime) to automatically refresh the table when another user makes an update.

This ensures all users see the latest data without manual refresh.

5. Audit Logs
Use a database trigger or Edge Function to automatically insert a record into updates whenever skus is updated.

This is more reliable than client-side logging.

The trigger will capture old and new values, user ID (via auth.uid()), and timestamp.

For display, query the updates table (ordered by created_at DESC) to show recent changes on the dashboard.

6. Dashboard
Show statistics:

Total SKUs.

Sum of stock (excluding null).

Count of listed SKUs per marketplace.

Show recent updates (last 10) with user, SKU, change description, and relative time.

Real-time updates: subscribe to updates table to refresh the list when a new change occurs.

🎨 UI/UX Requirements
Modern, clean design with Tailwind CSS.

Dark/light mode toggle.

Responsive (works on mobile/tablet).

Loading skeletons for tables and cards.

Toast notifications for success/error messages.

Confirm dialogs before important updates.

Accessible (ARIA labels, keyboard navigation).