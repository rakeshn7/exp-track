const API = '/api/expenses';
const AUTH_API = '/api/auth';

const CATEGORIES = {
  debit: [
    'Food & Dining',
    'Groceries',
    'Transport',
    'Housing & Rent',
    'Utilities & Bills',
    'Health & Medical',
    'Entertainment',
    'Shopping',
    'Pocket Money',
    'Borrowed',
    'Education',
    'Personal Care',
    'Other'
  ],
  credit: [
    'Pocket Money',
    'Borrowed',
    'Salary',
    'Freelance / Business',
    'Investment & Dividends',
    'Gift / Allowance',
    'Cashback & Refunds',
    'Rental Income',
    'Interest',
    'Other'
  ]
};

const state = {
  month: currentMonthString(),
  editingId: null,
  entryType: 'debit',
  currencySymbol: '₹',
  currencyLocale: 'en-IN',
  breakdownView: 'debit',
  filterType: 'all',
  cachedExpenses: [],
  cachedSummary: null,

  token: localStorage.getItem('ledger_auth_token') || null,
  profile: {
    id: null,
    fullName: '',
    phone: '',
    email: '',
    occupation: '',
    monthlyBudget: null,
    loggedIn: false
  }
};

const el = {
  // Expense Entry Form
  form: document.getElementById('expense-form'),
  formHeading: document.getElementById('form-heading'),
  id: document.getElementById('expense-id'),
  entryType: document.getElementById('entry-type'),
  typeDebitBtn: document.getElementById('type-debit-btn'),
  typeCreditBtn: document.getElementById('type-credit-btn'),
  currencySelect: document.getElementById('currency-select'),
  date: document.getElementById('date'),
  category: document.getElementById('category'),
  amount: document.getElementById('amount'),
  description: document.getElementById('description'),
  submitBtn: document.getElementById('submit-btn'),
  cancelEdit: document.getElementById('cancel-edit'),
  formError: document.getElementById('form-error'),

  // Month & Stats
  monthLabel: document.getElementById('month-label'),
  prevMonth: document.getElementById('prev-month'),
  nextMonth: document.getElementById('next-month'),

  statCredit: document.getElementById('stat-credit'),
  statDebit: document.getElementById('stat-debit'),
  statBalance: document.getElementById('stat-balance'),
  statCount: document.getElementById('stat-count'),

  breakdownPills: document.getElementById('breakdown-pills'),
  breakdownBars: document.getElementById('breakdown-bars'),
  entriesFilterPills: document.getElementById('entries-filter-pills'),
  entriesList: document.getElementById('entries-list'),

  // Header
  greetingTime: document.getElementById('greeting-time'),
  greetingName: document.getElementById('greeting-name'),
  headerUserBtn: document.getElementById('header-user-btn'),
  headerAvatar: document.getElementById('header-avatar'),

  // Profile Modal
  profileModal: document.getElementById('profile-modal'),
  profileCloseBtn: document.getElementById('profile-close-btn'),
  modalAvatar: document.getElementById('modal-avatar'),
  modalUserName: document.getElementById('modal-user-name'),
  profileViewMode: document.getElementById('profile-view-mode'),
  profileEditForm: document.getElementById('profile-edit-form'),

  viewFullName: document.getElementById('view-fullname'),
  viewPhone: document.getElementById('view-phone'),
  viewEmail: document.getElementById('view-email'),
  viewOccupation: document.getElementById('view-occupation'),
  viewBudget: document.getElementById('view-budget'),

  startEditProfileBtn: document.getElementById('start-edit-profile-btn'),
  cancelEditProfileBtn: document.getElementById('cancel-edit-profile-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  profileFormError: document.getElementById('profile-form-error'),

  editFullName: document.getElementById('edit-fullname'),
  editPhone: document.getElementById('edit-phone'),
  editEmail: document.getElementById('edit-email'),
  editOccupation: document.getElementById('edit-occupation'),
  editBudget: document.getElementById('edit-budget'),
  editNewPassword: document.getElementById('edit-new-password'),
  toggleEditPw: document.getElementById('toggle-edit-pw'),

  // Auth Modal & Views
  authModal: document.getElementById('auth-modal'),
  authLoginView: document.getElementById('auth-login-view'),
  authRegisterView: document.getElementById('auth-register-view'),
  authForgotView: document.getElementById('auth-forgot-view'),

  // Navigation within Auth Modal
  gotoRegisterBtn: document.getElementById('goto-register-btn'),
  gotoForgotBtn: document.getElementById('goto-forgot-btn'),
  gotoLoginFromRegBtn: document.getElementById('goto-login-from-reg-btn'),
  gotoLoginFromForgotBtn: document.getElementById('goto-login-from-forgot-btn'),

  // Login Form
  authLoginForm: document.getElementById('auth-login-form'),
  authLoginEmail: document.getElementById('auth-login-email'),
  authLoginPassword: document.getElementById('auth-login-password'),
  toggleLoginPw: document.getElementById('toggle-login-pw'),
  authLoginError: document.getElementById('auth-login-error'),
  loginSubmitBtn: document.getElementById('login-submit-btn'),

  // Register Form
  authRegisterForm: document.getElementById('auth-register-form'),
  registerFullname: document.getElementById('register-fullname'),
  registerEmail: document.getElementById('register-email'),
  registerPassword: document.getElementById('register-password'),
  registerPhone: document.getElementById('register-phone'),
  registerBudget: document.getElementById('register-budget'),
  toggleRegPw: document.getElementById('toggle-reg-pw'),
  authRegisterError: document.getElementById('auth-register-error'),
  registerSubmitBtn: document.getElementById('register-submit-btn'),

  // Forgot Password Form
  authForgotForm: document.getElementById('auth-forgot-form'),
  forgotEmail: document.getElementById('forgot-email'),
  forgotNewPassword: document.getElementById('forgot-new-password'),
  toggleForgotPw: document.getElementById('toggle-forgot-pw'),
  authForgotError: document.getElementById('auth-forgot-error'),
  authForgotSuccess: document.getElementById('auth-forgot-success'),
  forgotSubmitBtn: document.getElementById('forgot-submit-btn'),

  // Toast
  greetingToast: document.getElementById('greeting-toast'),
  toastMessage: document.getElementById('toast-message')
};

// ================= ANIMATION UTILITIES =================

/** Trigger the full-page curtain reveal when entering the home screen */
function playCurtainReveal() {
  // Remove any old curtain
  const old = document.getElementById('page-reveal-curtain');
  if (old) old.remove();

  const curtain = document.createElement('div');
  curtain.id = 'page-reveal-curtain';
  curtain.className = 'page-reveal-curtain';
  document.body.appendChild(curtain);

  // Add entering class to the ledger app
  const ledger = document.querySelector('.ledger');
  if (ledger) {
    ledger.classList.remove('app-entering');
    void ledger.offsetWidth; // force reflow
    ledger.classList.add('app-entering');
  }

  curtain.addEventListener('animationend', () => {
    curtain.remove();
    if (ledger) ledger.classList.remove('app-entering');
  }, { once: true });
}

/** Animate the auth card out, then call callback */
function animateAuthCardOut(callback) {
  const card = el.authModal.querySelector('.auth-card');
  if (!card) { callback(); return; }
  card.classList.add('is-exiting');
  card.addEventListener('animationend', () => {
    card.classList.remove('is-exiting');
    callback();
  }, { once: true });
}

/** Add a ripple to a type-chip button at click position */
function addChipRipple(btn, event) {
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'chip-ripple';
  ripple.style.left = `${event.clientX - rect.left - 3}px`;
  ripple.style.top  = `${event.clientY - rect.top  - 3}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

/** Trigger avatar wobble on profile click */
function animateAvatarClick() {
  el.headerAvatar.classList.remove('is-clicking');
  void el.headerAvatar.offsetWidth;
  el.headerAvatar.classList.add('is-clicking');
  el.headerAvatar.addEventListener('animationend', () => {
    el.headerAvatar.classList.remove('is-clicking');
  }, { once: true });
}

/** Flash a stat value element with pop animation */
function popStatValue(el) {
  el.classList.remove('popping');
  void el.offsetWidth;
  el.classList.add('popping');
  el.addEventListener('animationend', () => el.classList.remove('popping'), { once: true });
}

/** Animate month label slide-in based on direction */
function animateMonthLabel(direction) {
  const h2 = el.monthLabel;
  const cls = direction === 'left' ? 'slide-left' : 'slide-right';
  h2.classList.remove('slide-left', 'slide-right');
  void h2.offsetWidth;
  h2.classList.add(cls);
  h2.addEventListener('animationend', () => h2.classList.remove(cls), { once: true });
}

// Wire up debit/credit chip ripples
el.typeDebitBtn.addEventListener('click', (e) => addChipRipple(el.typeDebitBtn, e));
el.typeCreditBtn.addEventListener('click', (e) => addChipRipple(el.typeCreditBtn, e));

// Wire up avatar animation on header user button click
el.headerUserBtn.addEventListener('click', animateAvatarClick, true);

// ----------------- Auth Helper -----------------

async function authFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Unauthenticated or session expired
    handleSessionExpired();
    throw new Error('Session expired or authentication required.');
  }

  return response;
}

function handleSessionExpired() {
  state.token = null;
  localStorage.removeItem('ledger_auth_token');
  state.profile.loggedIn = false;
  state.cachedExpenses = [];
  state.cachedSummary = null;
  updateGreeting();
  renderStats({});
  renderBreakdown();
  renderFilteredEntries();
  openAuthModal('login');
}

// ----------------- Date & Money Helpers -----------------

function currentMonthString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(monthStr, delta) {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatMoney(n, symbol = state.currencySymbol, locale = state.currencyLocale) {
  const num = Math.abs(Number(n) || 0);
  const formatted = num.toLocaleString(locale || 'en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name) {
  if (!name || !name.trim()) return '👤';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function maskPhone(phone) {
  if (!phone) return '—';
  const clean = String(phone).trim();
  if (clean.length <= 4) return '••••';
  const lastFour = clean.slice(-4);
  return `•••• ••${lastFour}`;
}

function maskEmail(email) {
  if (!email) return '—';
  const clean = String(email).trim();
  const parts = clean.split('@');
  if (parts.length !== 2) return '••••••';
  const user = parts[0];
  const domain = parts[1];
  const first = user.slice(0, 2) || user[0] || '';
  return `${first}•••••@${domain}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ----------------- Toast Notification -----------------

let toastTimeout = null;
function showGreetingToast(message) {
  if (!el.greetingToast) return;
  el.toastMessage.textContent = message;
  el.greetingToast.hidden = false;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.greetingToast.hidden = true;
  }, 4000);
}

// ----------------- Auth Views Switching -----------------

function openAuthModal(view = 'login') {
  el.authModal.hidden = false;
  showAuthView(view);
}

function closeAuthModal() {
  el.authModal.hidden = true;
}

function showAuthView(viewName) {
  // Hide all views first
  el.authLoginView.hidden = true;
  el.authRegisterView.hidden = true;
  el.authForgotView.hidden = true;

  // Clear previous errors
  el.authLoginError.textContent = '';
  el.authRegisterError.textContent = '';
  el.authForgotError.textContent = '';
  el.authForgotSuccess.textContent = '';

  if (viewName === 'register') {
    el.authRegisterView.hidden = false;
    el.registerFullname.focus();
  } else if (viewName === 'forgot') {
    el.authForgotView.hidden = false;
    el.forgotEmail.focus();
  } else {
    // Default: login view
    el.authLoginView.hidden = false;
    el.authLoginEmail.focus();
  }
}

// Sub-password buttons: Left side "New user? Register" and Right side "Forgot password?"
el.gotoRegisterBtn.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthView('register');
});

el.gotoForgotBtn.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthView('forgot');
});

el.gotoLoginFromRegBtn.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthView('login');
});

el.gotoLoginFromForgotBtn.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthView('login');
});

// Password visibility toggles
function setupPasswordToggle(btn, input) {
  btn.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });
}

setupPasswordToggle(el.toggleLoginPw, el.authLoginPassword);
setupPasswordToggle(el.toggleRegPw, el.registerPassword);
setupPasswordToggle(el.toggleForgotPw, el.forgotNewPassword);
if (el.toggleEditPw && el.editNewPassword) {
  setupPasswordToggle(el.toggleEditPw, el.editNewPassword);
}

// ----------------- Auth Forms Handling -----------------

// 1. Sign In
el.authLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.authLoginError.textContent = '';
  el.loginSubmitBtn.disabled = true;
  el.loginSubmitBtn.classList.add('is-loading');
  el.loginSubmitBtn.textContent = 'Signing in...';

  const email = el.authLoginEmail.value.trim();
  const password = el.authLoginPassword.value;

  if (!email || !password) {
    el.authLoginError.textContent = 'Please enter both email and password.';
    el.loginSubmitBtn.disabled = false;
    el.loginSubmitBtn.classList.remove('is-loading');
    el.loginSubmitBtn.textContent = 'Sign In to EXPTRACK →';
    return;
  }

  try {
    const res = await fetch(`${AUTH_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed. Please check your credentials.');
    }

    // Successfully logged in — flash the button green briefly
    el.loginSubmitBtn.classList.add('flash-success');
    state.token = data.token;
    localStorage.setItem('ledger_auth_token', data.token);

    state.profile = {
      ...data.user,
      loggedIn: true
    };

    updateGreeting();
    renderProfileView();

    const timeGreeting = getTimeGreeting();

    // Play curtain reveal: close modal WITH animation, then reveal home
    animateAuthCardOut(() => {
      closeAuthModal();
      playCurtainReveal();
    });

    showGreetingToast(`${timeGreeting}, ${state.profile.fullName}! Welcome back.`);

    // Existing user: continue and load their existing entries from database!
    await loadMonth();
  } catch (err) {
    el.authLoginError.textContent = err.message;
    el.loginSubmitBtn.classList.remove('is-loading', 'flash-success');
  } finally {
    el.loginSubmitBtn.disabled = false;
    el.loginSubmitBtn.classList.remove('is-loading');
    el.loginSubmitBtn.textContent = 'Sign In to EXPTRACK →';
  }
});

// 2. Register New User
el.authRegisterForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.authRegisterError.textContent = '';
  el.registerSubmitBtn.disabled = true;
  el.registerSubmitBtn.textContent = 'Creating account...';

  const fullName = el.registerFullname.value.trim();
  const email = el.registerEmail.value.trim();
  const password = el.registerPassword.value;
  const phone = el.registerPhone.value.trim();
  const monthlyBudget = el.registerBudget.value ? Number(el.registerBudget.value) : null;

  if (!fullName) {
    el.authRegisterError.textContent = 'Full name is required.';
    el.registerSubmitBtn.disabled = false;
    el.registerSubmitBtn.textContent = 'Register & Start with Zero →';
    return;
  }
  if (!email) {
    el.authRegisterError.textContent = 'Email address is required.';
    el.registerSubmitBtn.disabled = false;
    el.registerSubmitBtn.textContent = 'Register & Start with Zero →';
    return;
  }
  if (!password || password.length < 4) {
    el.authRegisterError.textContent = 'Password must be at least 4 characters long.';
    el.registerSubmitBtn.disabled = false;
    el.registerSubmitBtn.textContent = 'Register & Start with Zero →';
    return;
  }

  try {
    const res = await fetch(`${AUTH_API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, phone, monthlyBudget })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register account.');
    }

    // Account created! Set session and user state
    state.token = data.token;
    localStorage.setItem('ledger_auth_token', data.token);

    state.profile = {
      ...data.user,
      loggedIn: true
    };

    updateGreeting();
    renderProfileView();

    // New user: starts with zero! — animate reveal
    state.month = currentMonthString();

    animateAuthCardOut(() => {
      closeAuthModal();
      playCurtainReveal();
    });

    showGreetingToast(`Welcome, ${state.profile.fullName}! Your EXPTRACK account starts clean at zero.`);
    await loadMonth();
  } catch (err) {
    el.authRegisterError.textContent = err.message;
  } finally {
    el.registerSubmitBtn.disabled = false;
    el.registerSubmitBtn.classList.remove('is-loading');
    el.registerSubmitBtn.textContent = 'Register & Start with Zero →';
  }
});

// 3. Reset Password
el.authForgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.authForgotError.textContent = '';
  el.authForgotSuccess.textContent = '';
  el.forgotSubmitBtn.disabled = true;
  el.forgotSubmitBtn.textContent = 'Updating password...';

  const email = el.forgotEmail.value.trim();
  const newPassword = el.forgotNewPassword.value;

  if (!email) {
    el.authForgotError.textContent = 'Please enter your registered email address.';
    el.forgotSubmitBtn.disabled = false;
    el.forgotSubmitBtn.textContent = 'Reset Password & Sign In →';
    return;
  }
  if (!newPassword || newPassword.length < 4) {
    el.authForgotError.textContent = 'New password must be at least 4 characters.';
    el.forgotSubmitBtn.disabled = false;
    el.forgotSubmitBtn.textContent = 'Reset Password & Sign In →';
    return;
  }

  try {
    const res = await fetch(`${AUTH_API}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }

    el.authForgotSuccess.textContent = 'Password reset successfully! Redirecting to Sign In...';
    setTimeout(() => {
      showAuthView('login');
      el.authLoginEmail.value = email;
      el.authLoginPassword.value = '';
      el.authLoginPassword.focus();
    }, 1500);
  } catch (err) {
    el.authForgotError.textContent = err.message;
  } finally {
    el.forgotSubmitBtn.disabled = false;
    el.forgotSubmitBtn.textContent = 'Reset Password & Sign In →';
  }
});

// ----------------- Profile Modal & Profile Management -----------------

function updateGreeting() {
  const timeGreeting = getTimeGreeting();
  el.greetingTime.textContent = timeGreeting;

  if (state.profile.loggedIn && state.profile.fullName) {
    el.greetingName.textContent = state.profile.fullName;
    const initials = getInitials(state.profile.fullName);
    el.headerAvatar.textContent = initials;
  } else {
    el.greetingName.textContent = 'Sign In / Register';
    el.headerAvatar.textContent = '👤';
  }
}

function renderProfileView() {
  const p = state.profile;
  const initials = getInitials(p.fullName);

  el.modalAvatar.textContent = initials;
  el.modalUserName.textContent = p.fullName || 'User Profile';
  el.viewFullName.textContent = p.fullName || '—';
  el.viewPhone.textContent = p.phone || '—';
  el.viewEmail.textContent = p.email || '—';
  el.viewOccupation.textContent = p.occupation || '—';
  el.viewBudget.textContent = p.monthlyBudget ? formatMoney(p.monthlyBudget) : '—';
}

function openProfileModal() {
  if (!state.profile.loggedIn) {
    openAuthModal('login');
    return;
  }
  renderProfileView();
  el.profileViewMode.hidden = false;
  el.profileEditForm.hidden = true;
  el.profileModal.hidden = false;
}

function closeModals() {
  el.profileModal.hidden = true;
}

el.headerUserBtn.addEventListener('click', () => {
  if (state.profile.loggedIn) {
    openProfileModal();
  } else {
    openAuthModal('login');
  }
});

el.profileCloseBtn.addEventListener('click', closeModals);

window.addEventListener('click', (e) => {
  if (e.target === el.profileModal) {
    closeModals();
  }
});



// Edit Profile Trigger
el.startEditProfileBtn.addEventListener('click', () => {
  const p = state.profile;
  el.editFullName.value = p.fullName || '';
  el.editPhone.value = p.phone || '';
  el.editEmail.value = p.email || '';
  el.editOccupation.value = p.occupation || '';
  el.editBudget.value = p.monthlyBudget || '';
  if (el.editNewPassword) el.editNewPassword.value = '';
  el.profileFormError.textContent = '';

  el.profileViewMode.hidden = true;
  el.profileEditForm.hidden = false;
  el.editFullName.focus();
});

el.cancelEditProfileBtn.addEventListener('click', () => {
  if (el.editNewPassword) el.editNewPassword.value = '';
  el.profileEditForm.hidden = true;
  el.profileViewMode.hidden = false;
});

// Save Profile Updates
el.profileEditForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.profileFormError.textContent = '';

  const fullName = el.editFullName.value.trim();
  if (!fullName) {
    el.profileFormError.textContent = 'Full name is required.';
    return;
  }

  const payload = {
    fullName,
    phone: el.editPhone.value.trim(),
    email: el.editEmail.value.trim(),
    occupation: el.editOccupation.value.trim(),
    monthlyBudget: el.editBudget.value ? Number(el.editBudget.value) : null
  };

  const newPassword = el.editNewPassword ? el.editNewPassword.value.trim() : '';
  if (newPassword && newPassword.length < 4) {
    el.profileFormError.textContent = 'New password must be at least 4 characters long.';
    return;
  }
  if (newPassword) {
    payload.newPassword = newPassword;
  }

  try {
    const res = await authFetch(`${AUTH_API}/profile`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save profile changes.');
    }

    if (data.passwordChanged) {
      // Clear session token so user is forced to log in again with new password
      state.token = null;
      localStorage.removeItem('ledger_auth_token');
      state.profile = {
        id: null,
        fullName: '',
        phone: '',
        email: '',
        occupation: '',
        monthlyBudget: null,
        loggedIn: false
      };

      closeModals();
      updateGreeting();

      // Reset ledger statistics and clear displayed entries
      state.cachedExpenses = [];
      state.cachedSummary = null;
      renderStats({});
      renderBreakdown();
      renderFilteredEntries();

      // Immediately display login modal asking user to log in with the new password
      openAuthModal('login');
      el.authLoginEmail.value = payload.email || state.profile.email;
      el.authLoginPassword.value = '';
      el.authLoginPassword.focus();
      showGreetingToast('Password changed successfully! Please sign in with your new password.');
      return;
    }

    state.profile = { ...state.profile, ...data.user };
    updateGreeting();
    renderProfileView();

    el.profileEditForm.hidden = true;
    el.profileViewMode.hidden = false;

    showGreetingToast(`Profile updated successfully, ${state.profile.fullName}!`);
  } catch (err) {
    el.profileFormError.textContent = err.message;
  }
});


// Sign Out
el.logoutBtn.addEventListener('click', async () => {

  try {
    await fetch(`${AUTH_API}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
  } catch (err) {}

  state.token = null;
  localStorage.removeItem('ledger_auth_token');
  state.profile = {
    id: null,
    fullName: '',
    phone: '',
    email: '',
    occupation: '',
    monthlyBudget: null,
    loggedIn: false
  };

  closeModals();
  updateGreeting();

  // Reset ledger amounts to zero and clear displayed entries
  state.cachedExpenses = [];
  state.cachedSummary = null;
  renderStats({});
  renderBreakdown();
  renderFilteredEntries();

  // Immediately display the Login modal so another user can sign in
  openAuthModal('login');
  showGreetingToast('You have signed out. Sign in to continue.');
});

// ----------------- Category Handling -----------------

function populateCategories(type, selectedCategory = '') {
  const cats = CATEGORIES[type] || CATEGORIES.debit;
  el.category.innerHTML = '<option value="" disabled>Choose one</option>';

  let found = false;
  cats.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selectedCategory) {
      opt.selected = true;
      found = true;
    }
    el.category.appendChild(opt);
  });

  if (selectedCategory && !found) {
    const opt = document.createElement('option');
    opt.value = selectedCategory;
    opt.textContent = selectedCategory;
    opt.selected = true;
    el.category.appendChild(opt);
  }

  if (!selectedCategory) {
    el.category.selectedIndex = 0;
  }
}

function setEntryType(type, keepCategory = false) {
  state.entryType = type === 'credit' ? 'credit' : 'debit';
  el.entryType.value = state.entryType;

  if (state.entryType === 'credit') {
    el.typeCreditBtn.classList.add('active');
    el.typeDebitBtn.classList.remove('active');
  } else {
    el.typeDebitBtn.classList.add('active');
    el.typeCreditBtn.classList.remove('active');
  }

  const currentCat = keepCategory ? el.category.value : '';
  populateCategories(state.entryType, currentCat);

  if (!state.editingId) {
    el.submitBtn.textContent = state.entryType === 'credit' ? 'Add income' : 'Add debit';
    el.formHeading.textContent = state.entryType === 'credit' ? 'New income entry' : 'New debit entry';
  }
}

// ----------------- Data Loading (Per User) -----------------

async function loadMonth() {
  el.monthLabel.textContent = monthLabel(state.month);

  // If unauthenticated: display zero statistics and empty ledger
  if (!state.profile.loggedIn || !state.token) {
    renderStats({});
    el.breakdownBars.innerHTML = '<p class="empty-note">Please sign in to view your category breakdown.</p>';
    el.entriesList.innerHTML = '<p class="empty-note">Please sign in to view your ledger entries.</p>';
    return;
  }

  try {
    const [expensesRes, summaryRes] = await Promise.all([
      authFetch(`${API}?month=${state.month}`),
      authFetch(`${API}/summary?month=${state.month}`)
    ]);

    const expenses = await expensesRes.json();
    const summary = await summaryRes.json();

    state.cachedExpenses = expenses || [];
    state.cachedSummary = summary || {};

    renderStats(state.cachedSummary);
    renderBreakdown();
    renderFilteredEntries();
  } catch (err) {
    console.error('Failed to load ledger data:', err);
  }
}

function renderStats(summary = {}) {
  const totalCredit = Number(summary.totalCredit || 0);
  const totalDebit = Number(summary.totalDebit || 0);
  const netBalance = summary.netBalance !== undefined ? Number(summary.netBalance) : totalCredit - totalDebit;

  el.statCredit.textContent = formatMoney(totalCredit);
  el.statDebit.textContent = formatMoney(totalDebit);

  const sign = netBalance > 0 ? '+ ' : (netBalance < 0 ? '− ' : '');
  el.statBalance.textContent = `${sign}${formatMoney(Math.abs(netBalance))}`;

  const balanceCard = el.statBalance.closest('.stat-balance');
  if (balanceCard) {
    balanceCard.classList.remove('positive', 'negative');
    if (netBalance > 0) balanceCard.classList.add('positive');
    else if (netBalance < 0) balanceCard.classList.add('negative');
  }

  el.statCount.textContent = summary.count || 0;

  // Pop animations on stat values
  [el.statCredit, el.statDebit, el.statBalance, el.statCount].forEach(popStatValue);
}

function renderBreakdown() {
  const summary = state.cachedSummary || {};
  const isCredit = state.breakdownView === 'credit';
  const breakdownSource = isCredit ? (summary.byCategoryCredit || {}) : (summary.byCategoryDebit || {});
  const total = isCredit ? Number(summary.totalCredit || 0) : Number(summary.totalDebit || 0);

  const entries = Object.entries(breakdownSource).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    el.breakdownBars.innerHTML = `<p class="empty-note">Nothing logged under ${isCredit ? 'credits' : 'debits'} this month.</p>`;
    return;
  }

  el.breakdownBars.innerHTML = entries
    .map(([cat, amt], i) => {
      const pct = total > 0 ? Math.max(3, Math.round((amt / total) * 100)) : 0;
      const fillClass = isCredit ? 'bar-credit' : 'bar-debit';
      return `
        <div class="bar-row" style="animation-delay:${i * 40}ms">
          <span class="bar-cat">${escapeHtml(cat)}</span>
          <div class="bar-track">
            <div class="bar-fill ${fillClass}" style="width:${pct}%"></div>
          </div>
          <span class="bar-amount">${formatMoney(amt)}</span>
        </div>`;
    })
    .join('');
}

function renderFilteredEntries() {
  let list = state.cachedExpenses || [];
  if (state.filterType === 'debit') {
    list = list.filter((e) => (e.type || 'debit') === 'debit');
  } else if (state.filterType === 'credit') {
    list = list.filter((e) => e.type === 'credit');
  }

  renderEntries(list);
}

function renderEntries(expenses) {
  if (expenses.length === 0) {
    let emptyMsg = 'No entries for this month yet. Add one on the left.';
    if (state.filterType === 'debit') emptyMsg = 'No debit entries for this month.';
    if (state.filterType === 'credit') emptyMsg = 'No income/credit entries for this month.';
    el.entriesList.innerHTML = `<p class="empty-note">${emptyMsg}</p>`;
    return;
  }

  el.entriesList.innerHTML = expenses
    .map((e, i) => {
      const isCredit = e.type === 'credit';
      const badgeText = isCredit ? 'Added' : 'Debit';
      const badgeClass = isCredit ? 'badge-credit' : 'badge-debit';
      const amountClass = isCredit ? 'credit-amount' : 'debit-amount';
      const amountPrefix = isCredit ? '+ ' : '− ';
      const currencySymbol = e.currency || state.currencySymbol;

      return `
      <div class="entry-row anim-in" data-id="${e.id}" style="animation-delay:${i * 35}ms">
        <span class="cell-date">${formatDate(e.date)}</span>
        <span><span class="type-badge ${badgeClass}">${badgeText}</span></span>
        <span class="cell-category">${escapeHtml(e.category)}</span>
        <span class="cell-note" title="${escapeHtml(e.description || '')}">${escapeHtml(e.description || '—')}</span>
        <span class="cell-amount ${amountClass}">${amountPrefix}${formatMoney(e.amount, currencySymbol)}</span>
        <span class="row-actions">
          <button class="edit-btn" title="Edit" aria-label="Edit entry">✎</button>
          <button class="delete-btn" title="Delete" aria-label="Delete entry">✕</button>
        </span>
      </div>`;
    })
    .join('');

  el.entriesList.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.entry-row');
      if (row) startEdit(row.dataset.id, state.cachedExpenses);
    });
  });

  el.entriesList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.entry-row');
      if (row) deleteExpense(row.dataset.id);
    });
  });
}

// ----------------- Expense Form Actions -----------------

function startEdit(id, expenses) {
  const expense = expenses.find((e) => e.id === id);
  if (!expense) return;

  state.editingId = id;
  const itemType = expense.type === 'credit' ? 'credit' : 'debit';
  setEntryType(itemType);

  if (expense.currency && el.currencySelect) {
    el.currencySelect.value = expense.currency;
    const selectedOpt = el.currencySelect.selectedOptions[0];
    if (selectedOpt) {
      state.currencySymbol = expense.currency;
      state.currencyLocale = selectedOpt.dataset.locale || 'en-IN';
    }
  }

  el.id.value = id;
  el.date.value = expense.date;
  populateCategories(itemType, expense.category);
  el.amount.value = expense.amount;
  el.description.value = expense.description || '';

  el.formHeading.textContent = 'Edit entry';
  el.submitBtn.textContent = 'Save changes';
  el.cancelEdit.hidden = false;
  el.date.focus();
}

function resetForm() {
  state.editingId = null;
  el.form.reset();
  el.id.value = '';
  setEntryType('debit');
  if (el.currencySelect) {
    el.currencySelect.value = state.currencySymbol;
  }
  el.date.value = new Date().toISOString().slice(0, 10);
  el.cancelEdit.hidden = true;
  el.formError.textContent = '';
}

el.typeDebitBtn.addEventListener('click', () => setEntryType('debit', true));
el.typeCreditBtn.addEventListener('click', () => setEntryType('credit', true));
el.cancelEdit.addEventListener('click', resetForm);

if (el.currencySelect) {
  el.currencySelect.addEventListener('change', (e) => {
    const selectedOpt = e.target.selectedOptions[0];
    state.currencySymbol = e.target.value;
    state.currencyLocale = selectedOpt ? (selectedOpt.dataset.locale || 'en-IN') : 'en-IN';
    localStorage.setItem('ledger_currency_symbol', state.currencySymbol);
    localStorage.setItem('ledger_currency_locale', state.currencyLocale);
    if (state.profile.loggedIn) {
      renderStats(state.cachedSummary);
      renderBreakdown();
      renderFilteredEntries();
    }
  });
}

el.form.addEventListener('submit', async (evt) => {
  evt.preventDefault();
  el.formError.textContent = '';

  if (!state.profile.loggedIn) {
    el.formError.textContent = 'Please sign in or register before adding entries.';
    openAuthModal('login');
    return;
  }

  const payload = {
    type: state.entryType,
    currency: state.currencySymbol,
    date: el.date.value,
    category: el.category.value,
    amount: el.amount.value,
    description: el.description.value
  };

  if (!payload.date || !payload.category || payload.amount === '') {
    el.formError.textContent = 'Please fill in date, category, and amount.';
    return;
  }
  if (Number(payload.amount) <= 0) {
    el.formError.textContent = 'Amount must be greater than zero.';
    return;
  }

  try {
    let res;
    if (state.editingId) {
      res = await authFetch(`${API}/${state.editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await authFetch(API, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Something went wrong saving that entry.');
    }

    const savedMonth = payload.date.slice(0, 7);
    resetForm();
    if (savedMonth !== state.month) {
      state.month = savedMonth;
    }
    await loadMonth();
  } catch (err) {
    el.formError.textContent = err.message;
  }
});

async function deleteExpense(id) {
  if (!confirm('Delete this entry?')) return;
  try {
    const res = await authFetch(`${API}/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      if (state.editingId === id) resetForm();
      await loadMonth();
    }
  } catch (err) {
    alert('Failed to delete entry.');
  }
}

// ----------------- Filter & Month Navigation -----------------

el.breakdownPills.querySelectorAll('.pill-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    el.breakdownPills.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
    e.target.classList.add('active');
    state.breakdownView = e.target.dataset.breakdown;
    if (state.profile.loggedIn) {
      renderBreakdown();
    }
  });
});

el.entriesFilterPills.querySelectorAll('.pill-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    el.entriesFilterPills.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
    e.target.classList.add('active');
    state.filterType = e.target.dataset.filter;
    if (state.profile.loggedIn) {
      renderFilteredEntries();
    }
  });
});

el.prevMonth.addEventListener('click', () => {
  state.month = shiftMonth(state.month, -1);
  animateMonthLabel('right');
  loadMonth();
});

el.nextMonth.addEventListener('click', () => {
  state.month = shiftMonth(state.month, 1);
  animateMonthLabel('left');
  loadMonth();
});

// ----------------- Initialization -----------------

async function init() {
  const savedSymbol = localStorage.getItem('ledger_currency_symbol');
  const savedLocale = localStorage.getItem('ledger_currency_locale');
  if (savedSymbol && el.currencySelect) {
    state.currencySymbol = savedSymbol;
    state.currencyLocale = savedLocale || 'en-IN';
    el.currencySelect.value = savedSymbol;
  }

  setEntryType('debit');
  el.date.value = new Date().toISOString().slice(0, 10);

  // Check existing session
  if (state.token) {
    try {
      const res = await fetch(`${AUTH_API}/me`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });

      if (res.ok) {
        const data = await res.json();
        state.profile = {
          ...data.user,
          loggedIn: true
        };
        updateGreeting();
        renderProfileView();
        closeAuthModal();

        const timeGreeting = getTimeGreeting();
        showGreetingToast(`${timeGreeting}, ${state.profile.fullName}! Welcome back.`);
        await loadMonth();
        return;
      }
    } catch (err) {
      console.warn('Session verification failed:', err);
    }
  }

  // If not logged in or invalid token:
  // Reset token and state, and show login modal immediately!
  state.token = null;
  localStorage.removeItem('ledger_auth_token');
  state.profile.loggedIn = false;
  updateGreeting();
  loadMonth(); // Displays 0 statistics & blank ledger
  openAuthModal('login');
}

init();
