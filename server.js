require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory session token store (token -> { userId, expiresAt })
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession(userId) {
  const token = generateToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  sessions.set(token, { userId, expiresAt });
  return token;
}

// Authentication middleware
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-auth-token'] || req.query.token);

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const session = sessions.get(token);
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  const user = await db.findUserById(session.userId);
  if (!user) {
    sessions.delete(token);
    return res.status(401).json({ error: 'User no longer exists.' });
  }

  req.user = user;
  req.userId = user.id;
  req.token = token;
  next();
}

function validExpenseBody(body) {
  const { date, category, amount, type } = body;
  if (!date || !category || amount === undefined || amount === null) return false;
  if (isNaN(Number(amount))) return false;
  if (isNaN(new Date(date).getTime())) return false;
  if (type !== undefined && type !== 'debit' && type !== 'credit') return false;
  return true;
}

// ================= AUTH ROUTES =================

// Status check (Supabase status)
app.get('/api/status', (req, res) => {
  res.json({
    supabase: db.isSupabaseConfigured(),
    message: db.isSupabaseConfigured()
      ? 'Connected to Supabase Cloud Database'
      : 'Running in Local Database Mode (Configure SUPABASE_URL and SUPABASE_KEY in .env to connect Supabase)'
  });
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, phone, occupation, monthlyBudget } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    if (!password || String(password).length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const user = await db.createUser({
      email,
      password,
      fullName: fullName || 'New User',
      phone,
      occupation,
      monthlyBudget
    });

    const token = createSession(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || '',
        occupation: user.occupation || '',
        monthlyBudget: user.monthlyBudget || null
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to register account.' });
  }
});

// Login existing user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await db.verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = createSession(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || '',
        occupation: user.occupation || '',
        monthlyBudget: user.monthlyBudget || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Forgot password / Reset password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    if (!newPassword || String(newPassword).length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    await db.resetPassword(email, newPassword);

    res.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.'
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to reset password.' });
  }
});

// Get current logged-in user profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      phone: req.user.phone || '',
      occupation: req.user.occupation || '',
      monthlyBudget: req.user.monthlyBudget || null
    }
  });
});

// Update profile
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (newPassword && String(newPassword).trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    const updated = await db.updateUserProfile(req.userId, req.body);

    if (updated.passwordChanged && req.token && sessions.has(req.token)) {
      sessions.delete(req.token);
    }

    res.json({
      success: true,
      user: updated,
      passwordChanged: updated.passwordChanged
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update profile.' });
  }
});


// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-auth-token'] || req.query.token);

  if (token && sessions.has(token)) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

// ================= EXPENSE ROUTES (PER-USER) =================

// List expenses for current user
app.get('/api/expenses', authMiddleware, async (req, res) => {
  try {
    const { month, type } = req.query;
    const expenses = await db.getUserExpenses(req.userId, { month, type });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch expenses.' });
  }
});

// Summary totals for current user
app.get('/api/expenses/summary', authMiddleware, async (req, res) => {
  try {
    const { month } = req.query;
    const summary = await db.getUserSummary(req.userId, { month });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to calculate summary.' });
  }
});

// Distinct months with transactions for current user
app.get('/api/expenses/months', authMiddleware, async (req, res) => {
  try {
    const months = await db.getUserMonths(req.userId);
    res.json(months);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch months.' });
  }
});

// Create new expense for current user
app.post('/api/expenses', authMiddleware, async (req, res) => {
  try {
    if (!validExpenseBody(req.body)) {
      return res
        .status(400)
        .json({ error: 'A valid date, category, and numeric amount are required.' });
    }
    const newExpense = await db.addExpense(req.userId, req.body);
    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create expense.' });
  }
});

// Update an existing expense
app.put('/api/expenses/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.updateExpense(req.userId, id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update expense.' });
  }
});

// Delete an expense
app.delete('/api/expenses/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteExpense(req.userId, id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete expense.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Ledger is running at http://localhost:${PORT}`);
});
