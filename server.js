require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- JWT Secret ---------------
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Generate one with: openssl rand -hex 32');
  process.exit(1);
}

// --------------- CORS ---------------
// Restrict to app's own origin. Set ALLOWED_ORIGIN env var on Render.
// Accepts a comma-separated list for multi-origin support.
const rawOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
const allowedOrigins = rawOrigin.split(',').map((o) => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (same-origin / curl / Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed.`));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --------------- Rate Limiters ---------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' }
});

// --------------- JWT Helpers ---------------

function issueJwt(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, tokenVersion: user.tokenVersion ?? 0 },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// --------------- Authentication Middleware ---------------
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-auth-token'] || req.query.token);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const user = await db.findUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User no longer exists.' });
  }

  // tokenVersion check — invalidates JWTs issued before the last password change
  if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    return res.status(401).json({ error: 'Session invalidated. Please sign in again.' });
  }

  req.user = user;
  req.userId = user.id;
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
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, fullName, phone, occupation, monthlyBudget } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const user = await db.createUser({
      email,
      password,
      fullName: fullName || 'New User',
      phone,
      occupation,
      monthlyBudget
    });

    const token = issueJwt(user);

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
app.post('/api/auth/login', authLimiter, async (req, res) => {
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

    const token = issueJwt(user);

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

// Step 1 — Request password reset (generates a token, logs it to console)
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const user = await db.findUserByEmail(email);

    // Always respond with success to prevent user enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists for that email, a reset token has been generated.'
      });
    }

    // Generate a cryptographically random raw token (never stored — only its hash is)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

    await db.createPasswordReset(user.id, rawToken, expiresAt);

    // TODO: send email with the reset link/token here.
    // e.g. sendMail({ to: user.email, subject: 'Reset your EXPTRACK password',
    //   body: `Your reset token: ${rawToken}\nExpires: ${expiresAt.toISOString()}` })
    console.log(`[PASSWORD RESET] Token for ${user.email}: ${rawToken} (expires ${expiresAt.toISOString()})`);

    res.json({
      success: true,
      message: 'If an account exists for that email, a reset token has been generated. Check the server logs or your email (once configured).'
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to initiate password reset.' });
  }
});

// Step 2 — Consume token and set new password
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !String(token).trim()) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    // consumePasswordReset validates hash, expiry, and used flag, then marks it used
    const { userId } = await db.consumePasswordReset(token);

    await db.resetPassword(userId, newPassword);

    // Bump tokenVersion to invalidate all previously issued JWTs for this user
    await db.bumpTokenVersion(userId);

    res.json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.'
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
    if (newPassword && String(newPassword).trim().length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    // updateUserProfile internally calls bumpTokenVersion when password changes
    const updated = await db.updateUserProfile(req.userId, req.body);

    res.json({
      success: true,
      user: updated,
      passwordChanged: updated.passwordChanged
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update profile.' });
  }
});

// Logout — stateless JWT: client removes the token; server just acknowledges
app.post('/api/auth/logout', (req, res) => {
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
    const response = { ...newExpense };
    if (newExpense.localFallback) {
      response.warning = 'Saved locally — Supabase is unavailable. Data may not persist across redeploys.';
    }
    delete response.localFallback;
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create expense.' });
  }
});

// Update an existing expense
app.put('/api/expenses/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.updateExpense(req.userId, id, req.body);
    const response = { ...updated };
    if (updated.localFallback) {
      response.warning = 'Updated locally — Supabase is unavailable. Data may not persist across redeploys.';
    }
    delete response.localFallback;
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update expense.' });
  }
});

// Delete an expense
app.delete('/api/expenses/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.deleteExpense(req.userId, id);
    if (result.localFallback) {
      // Send 200 with warning instead of 204 so the body can be read
      return res.json({ success: true, warning: 'Deleted locally — Supabase is unavailable. Data may not persist across redeploys.' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete expense.' });
  }
});

// Start server
app.listen(PORT, () => {
  const isLocal = !process.env.RENDER;
  console.log(`✅ EXPTRACK server running on port ${PORT}${isLocal ? ` → http://localhost:${PORT}` : ''}`);
});
