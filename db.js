const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const USERS_FILE          = path.join(__dirname, 'data', 'users.json');
const EXPENSES_FILE       = path.join(__dirname, 'data', 'expenses.json');
const PW_RESETS_FILE      = path.join(__dirname, 'data', 'password_resets.json');

// Initialize Supabase if URL and KEY are set
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (supabaseUrl && supabaseKey && supabaseUrl.trim() !== '' && supabaseKey.trim() !== '') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✓ Supabase client initialized with cloud URL:', supabaseUrl);
  } catch (err) {
    console.warn('! Failed to initialize Supabase client:', err.message);
    supabase = null;
  }
} else {
  console.log('ℹ Supabase credentials not set in .env. Running in local multi-user database mode.');
}

// ----------------- Local Storage Helpers -----------------

function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readUsersLocal() {
  ensureDataDir();
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function writeUsersLocal(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readExpensesLocal() {
  ensureDataDir();
  try {
    if (!fs.existsSync(EXPENSES_FILE)) return [];
    const raw = fs.readFileSync(EXPENSES_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading expenses file:', err);
    return [];
  }
}

function writeExpensesLocal(expenses) {
  ensureDataDir();
  fs.writeFileSync(EXPENSES_FILE, JSON.stringify(expenses, null, 2));
}

function readPwResetsLocal() {
  ensureDataDir();
  try {
    if (!fs.existsSync(PW_RESETS_FILE)) return [];
    const raw = fs.readFileSync(PW_RESETS_FILE, 'utf-8');
    const items = JSON.parse(raw || '[]');
    // Cleanly normalize any older records to OTP-based schema
    return items.map((r) => ({
      id: r.id || ('res_' + generateId()),
      userId: r.userId || r.user_id,
      otpHash: r.otpHash || r.tokenHash || r.otp_hash || r.token_hash,
      expiresAt: r.expiresAt || r.expires_at,
      attempts: r.attempts !== undefined ? r.attempts : 0,
      used: Boolean(r.used),
      createdAt: r.createdAt || r.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error('Error reading password_resets file:', err);
    return [];
  }
}

function writePwResetsLocal(resets) {
  ensureDataDir();
  fs.writeFileSync(PW_RESETS_FILE, JSON.stringify(resets, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** SHA-256 hash a string, returning a hex digest. */
function sha256(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

// ----------------- User Management -----------------

async function findUserByEmail(email) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          id: data.id,
          email: data.email,
          passwordHash: data.password_hash || null,
          fullName: data.full_name,
          occupation: data.occupation || '',
          monthlyBudget: data.monthly_budget,
          googleId: data.google_id || null,
          authProvider: data.auth_provider || (data.google_id ? 'google' : 'password'),
          tokenVersion: data.token_version ?? 0,
          createdAt: data.created_at
        };
      }
    } catch (err) {
      console.warn('Supabase findUserByEmail error, falling back to local:', err.message);
    }
  }

  const users = readUsersLocal();
  const u = users.find((item) => (item.email || '').toLowerCase() === normalizedEmail);
  if (!u) return null;

  return {
    ...u,
    passwordHash: u.passwordHash || null,
    googleId: u.googleId || null,
    authProvider: u.authProvider || (u.googleId ? 'google' : 'password'),
    tokenVersion: u.tokenVersion ?? 0
  };
}

async function findUserById(id) {
  if (!id) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          id: data.id,
          email: data.email,
          passwordHash: data.password_hash || null,
          fullName: data.full_name,
          occupation: data.occupation || '',
          monthlyBudget: data.monthly_budget,
          googleId: data.google_id || null,
          authProvider: data.auth_provider || (data.google_id ? 'google' : 'password'),
          tokenVersion: data.token_version ?? 0,
          createdAt: data.created_at
        };
      }
    } catch (err) {
      console.warn('Supabase findUserById error, falling back to local:', err.message);
    }
  }

  const users = readUsersLocal();
  const u = users.find((item) => item.id === id);
  if (!u) return null;

  return {
    ...u,
    passwordHash: u.passwordHash || null,
    googleId: u.googleId || null,
    authProvider: u.authProvider || (u.googleId ? 'google' : 'password'),
    tokenVersion: u.tokenVersion ?? 0
  };
}

async function syncUserToSupabase(user) {
  if (!supabase || !user || !user.id) return false;
  try {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (data) return true;

    // Try full insert with google_id and auth_provider
    const fullPayload = {
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash || 'GOOGLE_OAUTH',
      full_name: user.fullName || 'User',
      occupation: user.occupation || '',
      monthly_budget: user.monthlyBudget || null,
      google_id: user.googleId || null,
      auth_provider: user.authProvider || 'password',
      token_version: user.tokenVersion ?? 0,
      created_at: user.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let { error: insertError } = await supabase.from('users').insert(fullPayload);
    if (insertError) {
      // Fallback: if columns auth_provider or google_id are missing in Supabase schema, insert standard cols
      const fallbackPayload = {
        id: user.id,
        email: user.email,
        password_hash: user.passwordHash || 'GOOGLE_OAUTH',
        full_name: user.fullName || 'User',
        occupation: user.occupation || '',
        monthly_budget: user.monthlyBudget || null,
        token_version: user.tokenVersion ?? 0,
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { error: fallbackError } = await supabase.from('users').insert(fallbackPayload);
      if (fallbackError && !fallbackError.message.includes('duplicate key')) {
        console.warn('Supabase syncUserToSupabase fallback error:', fallbackError.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('syncUserToSupabase exception:', err.message);
    return false;
  }
}

async function createUser({ email, password, fullName, occupation, monthlyBudget }) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Email address is required.');
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const id = 'usr_' + generateId();
  const now = new Date().toISOString();

  const newUser = {
    id,
    email: normalizedEmail,
    passwordHash,
    fullName: fullName ? fullName.trim() : 'User',
    occupation: occupation ? occupation.trim() : '',
    monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null,
    googleId: null,
    authProvider: 'password',
    tokenVersion: 0,
    createdAt: now
  };

  // Always write to local storage as mirror / fallback
  const users = readUsersLocal();
  users.push(newUser);
  writeUsersLocal(users);

  if (supabase) {
    await syncUserToSupabase(newUser);
  }

  // Return user object without sensitive hash
  const { passwordHash: _, ...safeUser } = newUser;
  return safeUser;
}

/**
 * Find or create a user via verified Google credentials.
 * - If no user exists: creates user with googleId, email, name, no password hash, authProvider = 'google'.
 * - If user exists but has no googleId: links Google account by setting googleId.
 * - If user exists with a different googleId: rejects.
 */
async function findOrCreateGoogleUser({ email, name, googleId }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Valid Google email is required.');
  if (!googleId) throw new Error('Google user ID (sub) is required.');

  const existing = await findUserByEmail(normalizedEmail);

  if (existing) {
    if (existing.googleId && existing.googleId !== googleId) {
      throw new Error('This email is already associated with a different Google account.');
    }

    // If existing user does not have googleId yet, link it
    if (!existing.googleId) {
      const now = new Date().toISOString();
      if (supabase) {
        try {
          const { error } = await supabase
            .from('users')
            .update({ google_id: googleId, updated_at: now })
            .eq('id', existing.id);
          if (error) throw error;
        } catch (err) {
          console.warn('Supabase link google_id error:', err.message);
        }
      }

      const users = readUsersLocal();
      const idx = users.findIndex((u) => u.id === existing.id);
      if (idx !== -1) {
        users[idx].googleId = googleId;
        writeUsersLocal(users);
      }
      existing.googleId = googleId;
    }

    return existing;
  }

  // Create new user for Google Sign-In
  const id = 'usr_' + generateId();
  const now = new Date().toISOString();

  const newUser = {
    id,
    email: normalizedEmail,
    passwordHash: null,
    fullName: name && name.trim() ? name.trim() : 'Google User',
    occupation: '',
    monthlyBudget: null,
    googleId,
    authProvider: 'google',
    tokenVersion: 0,
    createdAt: now
  };

  const users = readUsersLocal();
  users.push(newUser);
  writeUsersLocal(users);

  if (supabase) {
    await syncUserToSupabase(newUser);
  }

  return newUser;
}

async function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Increment a user's tokenVersion to invalidate all previously issued JWTs.
 * Called on password change (profile update) and after a successful password reset.
 */
async function bumpTokenVersion(userId) {
  if (!userId) return;
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('token_version')
        .eq('id', userId)
        .maybeSingle();
      if (!fetchError && data) {
        const newVersion = (data.token_version ?? 0) + 1;
        const { error: updateError } = await supabase
          .from('users')
          .update({ token_version: newVersion, updated_at: now })
          .eq('id', userId);
        if (updateError) throw updateError;
      }
    } catch (err) {
      console.warn('Supabase bumpTokenVersion error, updating local only:', err.message);
    }
  }

  // Always update local JSON
  const users = readUsersLocal();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    users[idx].tokenVersion = (users[idx].tokenVersion ?? 0) + 1;
    writeUsersLocal(users);
  }
}

async function resetPassword(userId, newPassword) {
  if (!userId) throw new Error('User ID required for password reset.');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, updated_at: now })
        .eq('id', userId);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase resetPassword failed, updating local:', err.message);
    }
  }

  const users = readUsersLocal();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    users[idx].passwordHash = passwordHash;
    writeUsersLocal(users);
  }

  return true;
}

async function updateUserProfile(id, updates) {
  const user = await findUserById(id);
  if (!user) throw new Error('User not found.');

  const merged = {
    fullName: updates.fullName !== undefined ? updates.fullName.trim() : user.fullName,
    email: updates.email !== undefined ? updates.email.trim().toLowerCase() : user.email,
    occupation: updates.occupation !== undefined ? updates.occupation.trim() : user.occupation,
    monthlyBudget: updates.monthlyBudget !== undefined && updates.monthlyBudget !== '' && updates.monthlyBudget !== null
      ? Number(updates.monthlyBudget)
      : null
  };

  let passwordChanged = false;
  let newPasswordHash = user.passwordHash;
  if (updates.newPassword && String(updates.newPassword).trim().length >= 8) {
    const salt = await bcrypt.genSalt(10);
    newPasswordHash = await bcrypt.hash(String(updates.newPassword).trim(), salt);
    passwordChanged = true;
  }

  const now = new Date().toISOString();

  if (supabase) {
    try {
      const supabaseUpdates = {
        full_name: merged.fullName,
        email: merged.email,
        occupation: merged.occupation,
        monthly_budget: merged.monthlyBudget,
        updated_at: now
      };
      if (passwordChanged) {
        supabaseUpdates.password_hash = newPasswordHash;
      }

      const { error } = await supabase
        .from('users')
        .update(supabaseUpdates)
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase updateUserProfile error:', err.message);
    }
  }

  const users = readUsersLocal();
  const idx = users.findIndex((u) => u.id === id);
  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      ...merged,
      ...(passwordChanged ? { passwordHash: newPasswordHash } : {})
    };
    writeUsersLocal(users);
  }

  if (passwordChanged) {
    await bumpTokenVersion(id);
  }

  return { id, ...merged, passwordChanged };
}

// ----------------- Password Reset & OTP Management -----------------

/**
 * Store a SHA-256 hashed 6-digit OTP in password_resets table.
 * Raw OTP is NEVER stored plain.
 * Any previous active reset records for this user are invalidated first.
 *
 * @param {string} userId
 * @param {string} otpHash   - SHA-256 hex digest of the 6-digit OTP
 * @param {Date}   expiresAt
 */
async function createPasswordReset(userId, otpHash, expiresAt) {
  const nowStr = new Date().toISOString();
  const recordId = 'res_' + generateId();
  const record = {
    id: recordId,
    userId,
    otpHash,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    used: false,
    createdAt: nowStr
  };

  // Invalidate any older unused OTPs for this user
  if (supabase) {
    try {
      await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('user_id', userId)
        .eq('used', false);
    } catch (e) {
      console.warn('Supabase invalidate older resets error:', e.message);
    }
  }

  const resets = readPwResetsLocal();
  resets.forEach((r) => {
    if (r.userId === userId && !r.used) {
      r.used = true;
    }
  });

  if (supabase) {
    try {
      const { error } = await supabase.from('password_resets').insert({
        user_id: userId,
        otp_hash: otpHash,
        expires_at: record.expiresAt,
        attempts: 0,
        used: false,
        created_at: record.createdAt
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase createPasswordReset error, saving locally:', err.message);
    }
  }

  resets.push(record);
  writePwResetsLocal(resets);
  return record;
}

/**
 * Get latest active (unused) password reset record for a user.
 */
async function getLatestPasswordReset(userId) {
  if (!userId) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('user_id', userId)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          otpHash: data.otp_hash,
          expiresAt: data.expires_at,
          attempts: data.attempts ?? 0,
          used: Boolean(data.used),
          createdAt: data.created_at
        };
      }
    } catch (err) {
      console.warn('Supabase getLatestPasswordReset error, falling back to local:', err.message);
    }
  }

  const resets = readPwResetsLocal();
  const match = resets
    .filter((r) => r.userId === userId && !r.used)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return match || null;
}

/**
 * Increment the failed attempt counter for a password reset record.
 * Once attempts >= 5, marks the record as used/invalidated.
 */
async function recordFailedResetAttempt(resetRecord) {
  if (!resetRecord) return { attempts: 0, lockedOut: false };
  const newAttempts = (resetRecord.attempts || 0) + 1;
  const shouldLockout = newAttempts >= 5;
  resetRecord.attempts = newAttempts;
  if (shouldLockout) {
    resetRecord.used = true;
  }

  if (supabase && resetRecord.id) {
    try {
      await supabase
        .from('password_resets')
        .update({
          attempts: newAttempts,
          used: shouldLockout ? true : resetRecord.used
        })
        .eq('id', resetRecord.id);
    } catch (err) {
      console.warn('Supabase recordFailedResetAttempt error:', err.message);
    }
  }

  const resets = readPwResetsLocal();
  const idx = resets.findIndex((r) => r.id === resetRecord.id || (r.userId === resetRecord.userId && r.otpHash === resetRecord.otpHash));
  if (idx !== -1) {
    resets[idx].attempts = newAttempts;
    if (shouldLockout) resets[idx].used = true;
    writePwResetsLocal(resets);
  }

  return { attempts: newAttempts, lockedOut: shouldLockout };
}

/**
 * Mark a password reset record as consumed/used.
 */
async function markPasswordResetUsed(resetRecord) {
  if (!resetRecord) return;

  if (supabase && resetRecord.id) {
    try {
      await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('id', resetRecord.id);
    } catch (err) {
      console.warn('Supabase markPasswordResetUsed error:', err.message);
    }
  }

  const resets = readPwResetsLocal();
  const idx = resets.findIndex((r) => r.id === resetRecord.id || (r.userId === resetRecord.userId && r.otpHash === resetRecord.otpHash));
  if (idx !== -1) {
    resets[idx].used = true;
    writePwResetsLocal(resets);
  }
}

// ----------------- Expense Management (Per-User) -----------------

async function getUserExpenses(userId, { month, type } = {}) {
  if (!userId) return [];

  let expenses = [];
  if (supabase) {
    try {
      let query = supabase.from('expenses').select('*').eq('user_id', userId);
      if (month) {
        query = query.like('date', `${month}%`);
      }
      if (type) {
        query = query.eq('type', type);
      }
      query = query.order('date', { ascending: false });
      const { data, error } = await query;
      if (!error && data) {
        expenses = data.map((e) => ({
          id: e.id,
          userId: e.user_id,
          date: e.date,
          category: e.category,
          amount: Number(e.amount),
          type: e.type,
          currency: e.currency || '₹',
          description: e.description || ''
        }));
      }
    } catch (err) {
      console.warn('Supabase getUserExpenses error, using local:', err.message);
    }
  }

  const all = readExpensesLocal();
  let userExpenses = all.filter((e) => e.userId === userId);

  if (month) {
    userExpenses = userExpenses.filter((e) => e.date && e.date.startsWith(month));
  }
  if (type) {
    userExpenses = userExpenses.filter((e) => (e.type || 'debit') === type);
  }

  if (expenses.length > 0) {
    const remoteIds = new Set(expenses.map((e) => e.id));
    for (const le of userExpenses) {
      if (!remoteIds.has(le.id)) {
        expenses.push(le);
      }
    }
  } else {
    expenses = userExpenses;
  }

  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  return expenses;
}

async function getUserSummary(userId, { month } = {}) {
  const expenses = await getUserExpenses(userId, { month });

  let totalDebit = 0;
  let totalCredit = 0;
  const byCategoryDebit = {};
  const byCategoryCredit = {};
  const byCategory = {};

  const currencyTotals = {};

  expenses.forEach((e) => {
    const itemType = e.type === 'credit' ? 'credit' : 'debit';
    const amt = Number(e.amount);
    const cur = e.currency || '₹';

    if (!currencyTotals[cur]) currencyTotals[cur] = { totalDebit: 0, totalCredit: 0 };

    if (itemType === 'credit') {
      totalCredit += amt;
      byCategoryCredit[e.category] = (byCategoryCredit[e.category] || 0) + amt;
      currencyTotals[cur].totalCredit += amt;
    } else {
      totalDebit += amt;
      byCategoryDebit[e.category] = (byCategoryDebit[e.category] || 0) + amt;
      currencyTotals[cur].totalDebit += amt;
    }
    byCategory[e.category] = (byCategory[e.category] || 0) + amt;
  });

  const netBalance = totalCredit - totalDebit;
  const currencyKeys = Object.keys(currencyTotals);
  const mixedCurrencies = currencyKeys.length > 1;

  return {
    total: totalDebit,
    totalDebit,
    totalCredit,
    netBalance,
    byCategoryDebit,
    byCategoryCredit,
    byCategory,
    count: expenses.length,
    mixedCurrencies,
    currencyBreakdown: mixedCurrencies ? currencyTotals : null
  };
}

async function getUserMonths(userId) {
  const expenses = await getUserExpenses(userId);
  const months = [...new Set(expenses.map((e) => e.date.slice(0, 7)))]
    .sort()
    .reverse();
  return months;
}

async function addExpense(userId, expense) {
  const id = generateId();
  const record = {
    id,
    userId,
    date: expense.date,
    category: expense.category,
    amount: Number(expense.amount),
    type: expense.type === 'credit' ? 'credit' : 'debit',
    currency: expense.currency || '₹',
    description: expense.description ? String(expense.description).trim() : ''
  };

  let localFallback = false;

  if (supabase) {
    try {
      const user = await findUserById(userId);
      if (user) {
        await syncUserToSupabase(user);
      }

      const { error } = await supabase.from('expenses').insert({
        id: record.id,
        user_id: record.userId,
        date: record.date,
        category: record.category,
        amount: record.amount,
        type: record.type,
        currency: record.currency,
        description: record.description,
        created_at: new Date().toISOString()
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase addExpense error, saving local:', err.message);
      localFallback = true;
    }
  }

  const all = readExpensesLocal();
  all.push(record);
  writeExpensesLocal(all);

  return { ...record, localFallback };
}

async function updateExpense(userId, id, updates) {
  const all = readExpensesLocal();
  const idx = all.findIndex((e) => e.id === id && e.userId === userId);

  let existing = idx !== -1 ? all[idx] : null;

  const merged = {
    id,
    userId,
    date: updates.date ?? (existing ? existing.date : updates.date),
    category: updates.category ?? (existing ? existing.category : updates.category),
    amount: updates.amount !== undefined ? Number(updates.amount) : (existing ? existing.amount : 0),
    type: updates.type !== undefined ? updates.type : (existing ? existing.type : 'debit'),
    currency: updates.currency ?? (existing ? existing.currency : '₹'),
    description: updates.description !== undefined ? String(updates.description).trim() : (existing ? existing.description : '')
  };

  let localFallback = false;

  if (supabase) {
    try {
      const user = await findUserById(userId);
      if (user) {
        await syncUserToSupabase(user);
      }

      const { error } = await supabase
        .from('expenses')
        .update({
          date: merged.date,
          category: merged.category,
          amount: merged.amount,
          type: merged.type,
          currency: merged.currency,
          description: merged.description
        })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase updateExpense error:', err.message);
      localFallback = true;
    }
  }

  if (idx !== -1) {
    all[idx] = merged;
    writeExpensesLocal(all);
  }

  return { ...merged, localFallback };
}

async function deleteExpense(userId, id) {
  let localFallback = false;

  if (supabase) {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase deleteExpense error:', err.message);
      localFallback = true;
    }
  }

  const all = readExpensesLocal();
  const filtered = all.filter((e) => !(e.id === id && e.userId === userId));
  writeExpensesLocal(filtered);
  return { success: true, localFallback };
}

module.exports = {
  isSupabaseConfigured: () => Boolean(supabase),
  findUserByEmail,
  findUserById,
  createUser,
  findOrCreateGoogleUser,
  verifyPassword,
  resetPassword,
  bumpTokenVersion,
  updateUserProfile,
  createPasswordReset,
  getLatestPasswordReset,
  recordFailedResetAttempt,
  markPasswordResetUsed,
  getUserExpenses,
  getUserSummary,
  getUserMonths,
  addExpense,
  updateExpense,
  deleteExpense
};
