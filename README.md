# EXPTRACK — Personal Expense Tracker

> Track expenses, manage cash flow, and maintain financial clarity — month by month.

![EXPTRACK Banner](https://img.shields.io/badge/EXPTRACK-Expense%20Tracker-1F6B38?style=for-the-badge&logo=money&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Cloud%20DB-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## ✨ Features

- 🔐 **User Authentication** — Login, Register, Forgot Password (password reset) with secure bcrypt hashing
- 👤 **Per-User Isolation** — Each user has their own private expense data, starting from zero
- 💰 **Debit & Credit Tracking** — Log both expenses (debits) and income (credits) with categories
- 📅 **Month-by-Month View** — Navigate between months, see totals and category breakdowns
- 📊 **Summary Stats** — Total income, total spent, net balance, and entry count
- 🗂️ **Category Breakdown** — Visual bars showing spending by category
- 🌍 **Multi-Currency** — Support for INR, USD, EUR, GBP, JPY, AED, CAD, AUD
- ✏️ **Edit & Delete Entries** — Full CRUD on all expense records
- 👤 **Profile Management** — Edit name, phone, email, occupation, budget goal, and password
- 🎬 **Smooth Animations** — Curtain reveal on login, ripple effects, staggered entry rows, stat pops
- ☁️ **Supabase Cloud DB** — Real cloud database — all data persists across sessions and devices
- 📱 **Responsive Design** — Works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5, Vanilla CSS, Vanilla JS    |
| Backend    | Node.js, Express.js               |
| Database   | Supabase (PostgreSQL cloud)       |
| Auth       | Custom token sessions + bcryptjs  |
| Fonts      | IBM Plex Sans, IBM Plex Mono, Zilla Slab |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rakeshn7/exp-track.git
cd exp-track
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000

# Get these from: https://supabase.com/dashboard/project/<your-project>/settings/api
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
```

> ⚠️ **NEVER commit your `.env` file.** It is already excluded in `.gitignore`.

### 4. Set up Supabase tables

In your Supabase Dashboard, go to **SQL Editor** and run the contents of:

```
supabase_setup.sql
```

This creates the `users` and `expenses` tables with proper indexes and constraints.

### 5. Run the app

```bash
npm start
```

Visit: **http://localhost:3000**

---

## 📁 Project Structure

```
exp-track/
├── public/
│   ├── index.html       # Main app UI (auth modal, expense form, month view)
│   ├── style.css        # All styles + animation system
│   └── script.js        # Frontend logic, auth flows, animations
├── data/                # Local JSON fallback (auto-created, gitignored)
├── db.js                # Database abstraction (Supabase + local JSON fallback)
├── server.js            # Express server — auth & expense API routes
├── supabase_setup.sql   # SQL schema to run in Supabase SQL Editor
├── .env.example         # Template for environment variables
├── .gitignore           # Excludes secrets and local data
└── package.json
```

---

## 🔑 API Endpoints

### Auth

| Method | Route                     | Description                  |
|--------|---------------------------|------------------------------|
| POST   | `/api/auth/register`      | Register new user            |
| POST   | `/api/auth/login`         | Login and get session token  |
| POST   | `/api/auth/logout`        | Invalidate session           |
| GET    | `/api/auth/me`            | Get current user profile     |
| PUT    | `/api/auth/profile`       | Update profile / password    |
| POST   | `/api/auth/forgot-password` | Reset password by email    |

### Expenses (all require auth token)

| Method | Route                       | Description                         |
|--------|-----------------------------|-------------------------------------|
| GET    | `/api/expenses?month=YYYY-MM` | List expenses for the month       |
| GET    | `/api/expenses/summary?month=YYYY-MM` | Get totals and breakdown  |
| POST   | `/api/expenses`             | Create a new expense entry          |
| PUT    | `/api/expenses/:id`         | Update an existing entry            |
| DELETE | `/api/expenses/:id`         | Delete an entry                     |

---

## 🔒 Security

- **Passwords** are hashed with `bcryptjs` (never stored in plain text)
- **Session tokens** are random 64-character hex strings stored in memory
- **`.env` file** is gitignored — API keys are never in version control
- **User data isolation** — every query is scoped to the authenticated user's ID
- **401 handling** — expired/invalid tokens are automatically caught and the user is redirected to login

---

## ☁️ Supabase Setup (Step-by-Step)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Project Settings → API** and copy:
   - **Project URL** → paste as `SUPABASE_URL` in your `.env`
   - **anon / public key** → paste as `SUPABASE_KEY` in your `.env`
4. Go to **SQL Editor** and run `supabase_setup.sql`
5. You're done! The app will automatically connect to Supabase on startup

---

## 📸 Screenshots

> Login screen with animated reveal, per-user data isolation, and clean expense ledger.

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<p align="center">Built with ❤️ by <a href="https://github.com/rakeshn7">Rakesh N</a></p>
