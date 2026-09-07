const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const EXPENSES_FILE = path.join(__dirname, 'data', 'expenses.json');

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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          id: data.id,
          email: data.email,
          passwordHash: data.password_hash,
          fullName: data.full_name,
          phone: data.phone || '',
          occupation: data.occupation || '',
          monthlyBudget: data.monthly_budget,
          createdAt: data.created_at
        };
      }
    } catch (err) {
      console.warn('Supabase findUserByEmail error, falling back to local:', err.message);
    }
  }

  const users = readUsersLocal();
  return users.find((u) => u.email.toLowerCase() === normalizedEmail) || null;
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
          passwordHash: data.password_hash,
          fullName: data.full_name,
          phone: data.phone || '',
          occupation: data.occupation || '',
          monthlyBudget: data.monthly_budget,
          createdAt: data.created_at
        };
      }
    } catch (err) {
      console.warn('Supabase findUserById error, falling back to local:', err.message);
    }
  }

  const users = readUsersLocal();
  return users.find((u) => u.id === id) || null;
}

async function createUser({ email, password, fullName, phone, occupation, monthlyBudget }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
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
    phone: phone ? phone.trim() : '',
    occupation: occupation ? occupation.trim() : '',
    monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null,
    createdAt: now
  };

  if (supabase) {
    try {
      const { error } = await supabase.from('users').insert({
        id: newUser.id,
        email: newUser.email,
        password_hash: newUser.passwordHash,
        full_name: newUser.fullName,
        phone: newUser.phone,
        occupation: newUser.occupation,
        monthly_budget: newUser.monthlyBudget,
        created_at: now,
        updated_at: now
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase createUser insert failed, persisting to local:', err.message);
    }
  }

  // Always write to local storage as mirror / fallback
  const users = readUsersLocal();
  users.push(newUser);
  writeUsersLocal(users);

  // Return user object without sensitive hash
  const { passwordHash: _, ...safeUser } = newUser;
  return safeUser;
}

async function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

async function resetPassword(email, newPassword) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error('No user account found with that email address.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, updated_at: now })
        .eq('id', user.id);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase resetPassword failed, updating local:', err.message);
    }
  }

  const users = readUsersLocal();
  const idx = users.findIndex((u) => u.id === user.id);
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
    phone: updates.phone !== undefined ? updates.phone.trim() : user.phone,
    email: updates.email !== undefined ? updates.email.trim().toLowerCase() : user.email,
    occupation: updates.occupation !== undefined ? updates.occupation.trim() : user.occupation,
    monthlyBudget: updates.monthlyBudget !== undefined && updates.monthlyBudget !== '' && updates.monthlyBudget !== null
      ? Number(updates.monthlyBudget)
      : null
  };

  let passwordChanged = false;
  let newPasswordHash = user.passwordHash;
  if (updates.newPassword && String(updates.newPassword).trim().length >= 4) {
    const salt = await bcrypt.genSalt(10);
    newPasswordHash = await bcrypt.hash(String(updates.newPassword).trim(), salt);
    passwordChanged = true;
  }

  const now = new Date().toISOString();

  if (supabase) {
    try {
      const supabaseUpdates = {
        full_name: merged.fullName,
        phone: merged.phone,
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

  return { id, ...merged, passwordChanged };
}


// ----------------- Expense Management (Per-User) -----------------

async function getUserExpenses(userId, { month, type } = {}) {
  if (!userId) return [];

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
      if (error) throw error;
      if (data) {
        return data.map((e) => ({
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
  userExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  return userExpenses;
}

async function getUserSummary(userId, { month } = {}) {
  const expenses = await getUserExpenses(userId, { month });

  let totalDebit = 0;
  let totalCredit = 0;
  const byCategoryDebit = {};
  const byCategoryCredit = {};
  const byCategory = {};

  expenses.forEach((e) => {
    const itemType = e.type === 'credit' ? 'credit' : 'debit';
    const amt = Number(e.amount);
    if (itemType === 'credit') {
      totalCredit += amt;
      byCategoryCredit[e.category] = (byCategoryCredit[e.category] || 0) + amt;
    } else {
      totalDebit += amt;
      byCategoryDebit[e.category] = (byCategoryDebit[e.category] || 0) + amt;
    }
    byCategory[e.category] = (byCategory[e.category] || 0) + amt;
  });

  const netBalance = totalCredit - totalDebit;

  return {
    total: totalDebit,
    totalDebit,
    totalCredit,
    netBalance,
    byCategoryDebit,
    byCategoryCredit,
    byCategory,
    count: expenses.length
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

  if (supabase) {
    try {
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
    }
  }

  const all = readExpensesLocal();
  all.push(record);
  writeExpensesLocal(all);

  return record;
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

  if (supabase) {
    try {
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
    }
  }

  if (idx !== -1) {
    all[idx] = merged;
    writeExpensesLocal(all);
  }

  return merged;
}

async function deleteExpense(userId, id) {
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
    }
  }

  const all = readExpensesLocal();
  const filtered = all.filter((e) => !(e.id === id && e.userId === userId));
  writeExpensesLocal(filtered);
  return true;
}

module.exports = {
  isSupabaseConfigured: () => Boolean(supabase),
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  resetPassword,
  updateUserProfile,
  getUserExpenses,
  getUserSummary,
  getUserMonths,
  addExpense,
  updateExpense,
  deleteExpense
};
