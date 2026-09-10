require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const db = require('./db');
const mailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- Google OAuth Client ---------------
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
// Applied to all auth routes: register, login, google, forgot-password, reset-password
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 60,
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

// ================= CONFIG & STATUS ROUTES =================

// Frontend config endpoint — exposes GOOGLE_CLIENT_ID without hardcoding in HTML
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID
  });
});

// Status check (Supabase status)
app.get('/api/status', (req, res) => {
  res.json({
    supabase: db.isSupabaseConfigured(),
    emailConfigured: mailer.isEmailConfigured(),
    googleAuth: Boolean(GOOGLE_CLIENT_ID),
    message: db.isSupabaseConfigured()
      ? 'Connected to Supabase Cloud Database'
      : 'Running in Local Database Mode (Configure SUPABASE_URL and SUPABASE_KEY in .env to connect Supabase)'
  });
});

// ================= AUTH ROUTES =================

// 1. Register new user (email + password)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      occupation,
      monthlyBudget
    } = req.body;

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await db.createUser({
      email: cleanEmail,
      password,
      fullName: fullName.trim(),
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
        occupation: user.occupation || '',
        monthlyBudget: user.monthlyBudget || null,
        authProvider: user.authProvider || 'password'
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to register account.' });
  }
});

// 2. Login existing user (email + password)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email address and password are required.' });
    }

    // Look up user by email
    const user = await db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if account signs in with Google and has no password set
    if (user.authProvider === 'google' && !user.passwordHash) {
      return res.status(400).json({
        error: 'This account uses Google Sign-In — please continue with Google.'
      });
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
        occupation: user.occupation || '',
        monthlyBudget: user.monthlyBudget || null,
        authProvider: user.authProvider || 'password'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// 3. Google Sign-In / Sign-Up
app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google Sign-In is not configured on the server.' });
    }

    // Verify Google ID token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('Google token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Invalid Google credential token.' });
    }

    if (!payload) {
      return res.status(401).json({ error: 'Could not retrieve Google profile payload.' });
    }

    const { email, name, sub, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ error: 'Your Google email address is not verified.' });
    }

    // Look up, link, or create user
    const user = await db.findOrCreateGoogleUser({
      email,
      name: name || '',
      googleId: sub
    });

    const token = issueJwt(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        occupation: user.occupation || '',
        monthlyBudget: user.monthlyBudget || null,
        authProvider: user.authProvider || 'google'
      }
    });
  } catch (err) {
    console.error('Error in /api/auth/google:', err.message);
    res.status(400).json({ error: err.message || 'Google authentication failed.' });
  }
});

// 4. OTP-based Forgot Password — Step 1: Request 6-digit numeric OTP
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const user = await db.findUserByEmail(cleanEmail);

    // Only allow password reset if user exists
    if (!user) {
      return res.status(404).json({
        error: 'This email is not registered with EXPTRACK. Please enter your registered email or create an account.'
      });
    }

    // If account signs in with Google and has no password set
    if (user.authProvider === 'google' && !user.passwordHash) {
      return res.status(400).json({
        error: 'This account signs in with Google — no password to reset.'
      });
    }

    // Generate secure 6-digit numeric OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store hashed OTP — never store or log raw OTP
    await db.createPasswordReset(user.id, otpHash, expiresAt);

    // Send OTP via Gmail SMTP
    try {
      await mailer.sendOtpEmail(user.email, user.fullName, otp);
    } catch (mailErr) {
      console.warn('Mailer dispatch error:', mailErr.message);
    }

    // Compute masked email for friendly UI confirmation (e.g. ra*****@gmail.com)
    const parts = user.email.split('@');
    const u = parts[0] || '';
    const d = parts[1] || '';
    const maskedEmail = `${u.slice(0, 2)}•••••@${d}`;

    res.json({
      success: true,
      message: `Verification code sent to your email (${maskedEmail}).`,
      maskedEmail
    });
  } catch (err) {
    console.error('Error in forgot-password:', err.message);
    res.status(500).json({ error: 'Failed to initiate password reset. Please try again.' });
  }
});

// 5. OTP-based Forgot Password — Step 2: Verify 6-digit OTP and set new password
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const verificationCode = String(otp || '').trim();
    if (!verificationCode || verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({ error: 'A valid 6-digit verification code is required.' });
    }

    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = await db.findUserByEmail(cleanEmail);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    // Retrieve latest active reset record
    const resetRecord = await db.getLatestPasswordReset(user.id);
    if (!resetRecord || resetRecord.used) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    // Check attempt lockout (max 5 attempts)
    if ((resetRecord.attempts || 0) >= 5) {
      await db.recordFailedResetAttempt(resetRecord);
      return res.status(400).json({
        error: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
      });
    }

    // Check expiry (10 minutes)
    if (new Date(resetRecord.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'This verification code has expired. Please request a new code.' });
    }

    // Verify SHA-256 hash
    const submittedHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
    if (submittedHash !== resetRecord.otpHash) {
      const { attempts, lockedOut } = await db.recordFailedResetAttempt(resetRecord);
      if (lockedOut) {
        return res.status(400).json({
          error: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
        });
      }
      const remaining = Math.max(0, 5 - attempts);
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // Hash matches: update password, consume OTP, and bump tokenVersion
    await db.resetPassword(user.id, newPassword);
    await db.markPasswordResetUsed(resetRecord);
    await db.bumpTokenVersion(user.id);

    res.json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.'
    });
  } catch (err) {
    console.error('Error in reset-password:', err.message);
    res.status(400).json({ error: err.message || 'Failed to reset password.' });
  }
});

// 6. Get current logged-in user profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      occupation: req.user.occupation || '',
      monthlyBudget: req.user.monthlyBudget || null,
      authProvider: req.user.authProvider || 'password'
    }
  });
});

// 7. Update profile
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

// 8. Logout — stateless JWT: client removes the token; server just acknowledges
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
  mailer.verifyTransporter().catch((err) => console.warn('Mailer verify notice:', err.message));
});
