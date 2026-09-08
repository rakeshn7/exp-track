# EXPTRACK — Personal Expense Tracker

> A clean, responsive monthly income and expense tracker with secure authentication and cloud storage.

**🌍 Live Demo:** [https://exptrack-m9no.onrender.com/](https://exptrack-m9no.onrender.com/)

[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud%20DB-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Key Features

- **User Authentication**: Secure signup, login, and personal profile management with password hashing.
- **Per-User Isolation**: Every account starts clean with its own private financial ledger.
- **Income & Expense Tracking**: Log debit (spend) and credit (income) transactions with categories and multi-currency support.
- **Monthly Analytics**: Month-by-month browsing with instant cash flow calculations and category breakdown bars.
- **Fully Responsive**: Clean, optimized layout across mobile, tablet, and desktop devices.
- **Cloud Database**: Backed by Supabase PostgreSQL (with automatic local fallback).

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (no framework overhead)
- **Backend:** Node.js, Express.js
- **Database:** Supabase (Cloud PostgreSQL)

---

## 🚀 Quick Start

1. **Clone & install:**
   ```bash
   git clone https://github.com/rakeshn7/exp-track.git
   cd exp-track
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and add your Supabase credentials:
   ```env
   PORT=3000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-key
   ```
   *(Run `supabase_setup.sql` in your Supabase SQL Editor to set up the tables).*

3. **Run the server:**
   ```bash
   npm start
   ```
   Open **http://localhost:3000** in your browser.

---

## 📄 License

MIT License — Created by [Rakesh N](https://github.com/rakeshn7).
