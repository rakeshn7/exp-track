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
    'Education',
    'Personal Care',
    'Pocket Money',
    'Borrowed',
    'Other'
  ],
  credit: [
    'Salary',
    'Freelance / Business',
    'Investment & Dividends',
    'Gift / Allowance',
    'Cashback & Refunds',
    'Rental Income',
    'Interest',
    'Pocket Money',
    'Borrowed',
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
  availableMonths: [],

  token: localStorage.getItem('ledger_auth_token') || null,
  profile: {
    id: null,
    fullName: '',
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
  monthJumpSelect: document.getElementById('month-jump-select'),

  statCredit: document.getElementById('stat-credit'),
  statDebit: document.getElementById('stat-debit'),
  statBalance: document.getElementById('stat-balance'),
  statCount: document.getElementById('stat-count'),

  // Budget progress
  budgetSection: document.getElementById('budget-progress-section'),
  budgetLabel: document.getElementById('budget-progress-label'),
  budgetPct: document.getElementById('budget-progress-pct'),
  budgetTrack: document.getElementById('budget-progress-track'),
  budgetFill: document.getElementById('budget-progress-fill'),
  budgetSub: document.getElementById('budget-progress-sub'),

  // Mixed-currency warning
  mixedCurrencyWarning: document.getElementById('mixed-currency-warning'),
  mixedCurrencyText: document.getElementById('mixed-currency-text'),

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
  viewEmail: document.getElementById('view-email'),
  viewOccupation: document.getElementById('view-occupation'),
  viewBudget: document.getElementById('view-budget'),

  startEditProfileBtn: document.getElementById('start-edit-profile-btn'),
  cancelEditProfileBtn: document.getElementById('cancel-edit-profile-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  profileFormError: document.getElementById('profile-form-error'),

  editFullName: document.getElementById('edit-fullname'),
  editEmail: document.getElementById('edit-email'),
  editOccupation: document.getElementById('edit-occupation'),
  editBudget: document.getElementById('edit-budget'),
  editNewPassword: document.getElementById('edit-new-password'),
  toggleEditPw: document.getElementById('toggle-edit-pw'),
  editPwStrength: document.getElementById('edit-pw-strength'),

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
  registerBudget: document.getElementById('register-budget'),
  toggleRegPw: document.getElementById('toggle-reg-pw'),
  registerPwStrength: document.getElementById('register-pw-strength'),
  authRegisterError: document.getElementById('auth-register-error'),
  registerSubmitBtn: document.getElementById('register-submit-btn'),

  // Forgot Password (Step 1)
  authForgotForm: document.getElementById('auth-forgot-form'),
  forgotEmail: document.getElementById('forgot-email'),
  authForgotError: document.getElementById('auth-forgot-error'),
  authForgotSuccess: document.getElementById('auth-forgot-success'),
  forgotSubmitBtn: document.getElementById('forgot-submit-btn'),
  forgotStep1: document.getElementById('forgot-step1'),
  forgotStep2: document.getElementById('forgot-step2'),
  backToStep1Btn: document.getElementById('back-to-step1-btn'),
  otpSentEmailDisplay: document.getElementById('otp-sent-email-display'),
  resendOtpBtn: document.getElementById('resend-otp-btn'),
  resendOtpTimer: document.getElementById('resend-otp-timer'),
  resendCountdown: document.getElementById('resend-countdown'),

  // Reset Password (Step 2)
  authResetForm: document.getElementById('auth-reset-form'),
  resetToken: document.getElementById('reset-token'),
  resetNewPassword: document.getElementById('reset-new-password'),
  resetConfirmPassword: document.getElementById('reset-confirm-password'),
  toggleResetPw: document.getElementById('toggle-reset-pw'),
  toggleConfirmResetPw: document.getElementById('toggle-confirm-reset-pw'),
  resetPwStrength: document.getElementById('reset-pw-strength'),
  authResetError: document.getElementById('auth-reset-error'),
  authResetSuccess: document.getElementById('auth-reset-success'),
  resetSubmitBtn: document.getElementById('reset-submit-btn'),

  // Google Auth
  googleLoginSection: document.getElementById('google-login-section'),
  googleRegisterSection: document.getElementById('google-register-section'),
  googleLoginContainer: document.getElementById('google-login-container'),
  googleRegisterContainer: document.getElementById('google-register-container'),

  // Toast
  greetingToast: document.getElementById('greeting-toast'),
  toastMessage: document.getElementById('toast-message')
};

// ================= ANIMATION UTILITIES =================

/** Trigger the full-page curtain reveal when entering the home screen */
function playCurtainReveal() {
  const old = document.getElementById('page-reveal-curtain');
  if (old) old.remove();

  const curtain = document.createElement('div');
  curtain.id = 'page-reveal-curtain';
  curtain.className = 'page-reveal-curtain';
  document.body.appendChild(curtain);

  const ledger = document.querySelector('.ledger');
  if (ledger) {
    ledger.classList.remove('app-entering');
    void ledger.offsetWidth;
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
function popStatValue(statEl) {
  statEl.classList.remove('popping');
  void statEl.offsetWidth;
  statEl.classList.add('popping');
  statEl.addEventListener('animationend', () => statEl.classList.remove('popping'), { once: true });
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

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Please make sure the server is running and try again.');
  }

  if (response.status === 401) {
    handleSessionExpired();
    throw new Error('Session expired or authentication required.');
  }

  return response;
}

/** Safely parse JSON from a response; throws a friendly error if not JSON. */
async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    // Server returned HTML (likely offline, wrong URL, or a 404 page)
    if (response.status === 404) {
      throw new Error('API endpoint not found (404). Please check your server configuration.');
    }
    if (response.status >= 500) {
      throw new Error('Internal server error. Please check the server logs.');
    }
    throw new Error('Server is offline or not reachable. Please start the server and try again.');
  }
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
  hideBudgetProgress();
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

// ----------------- Password Strength Hint -----------------

/**
 * Evaluate password strength and update a hint element.
 * @param {string} pw   - plaintext password
 * @param {HTMLElement} hintEl - the .pw-strength-hint container
 */
function updatePwStrength(pw, hintEl) {
  if (!hintEl) return;
  if (!pw) {
    hintEl.textContent = '';
    hintEl.className = 'pw-strength-hint';
    return;
  }

  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  let label, cls;
  if (score <= 1)      { label = '⬤ Weak';   cls = 'pw-weak'; }
  else if (score <= 3) { label = '⬤ Fair';   cls = 'pw-fair'; }
  else                 { label = '⬤ Strong'; cls = 'pw-strong'; }

  hintEl.textContent = label;
  hintEl.className = `pw-strength-hint ${cls}`;
}

// Wire strength hints to password inputs
if (el.registerPassword && el.registerPwStrength) {
  el.registerPassword.addEventListener('input', (e) => updatePwStrength(e.target.value, el.registerPwStrength));
}
if (el.resetNewPassword && el.resetPwStrength) {
  el.resetNewPassword.addEventListener('input', (e) => updatePwStrength(e.target.value, el.resetPwStrength));
}
if (el.editNewPassword && el.editPwStrength) {
  el.editNewPassword.addEventListener('input', (e) => updatePwStrength(e.target.value, el.editPwStrength));
}

// ----------------- Toast Notification -----------------

let toastTimeout = null;
function showGreetingToast(message, isWarning = false) {
  if (!el.greetingToast) return;
  el.toastMessage.textContent = message;
  el.greetingToast.hidden = false;
  el.greetingToast.classList.toggle('toast-warning', isWarning);
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.greetingToast.hidden = true;
  }, isWarning ? 6000 : 4000);
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
  el.authLoginView.hidden = true;
  el.authRegisterView.hidden = true;
  el.authForgotView.hidden = true;

  // Clear previous errors
  el.authLoginError.textContent = '';
  el.authRegisterError.textContent = '';
  el.authForgotError.textContent = '';
  el.authForgotSuccess.textContent = '';
  if (el.authResetError) el.authResetError.textContent = '';
  if (el.authResetSuccess) el.authResetSuccess.textContent = '';

  if (viewName === 'register') {
    el.authRegisterView.hidden = false;
    el.registerFullname.focus();
  } else if (viewName === 'forgot') {
    el.authForgotView.hidden = false;
    showForgotStep(1);
  } else {
    el.authLoginView.hidden = false;
    if (el.authLoginEmail) el.authLoginEmail.focus();
  }

  // Ensure Google buttons render for current view
  if (googleClientId) {
    initGoogleSignIn();
  }
}

let currentForgotEmail = '';
let resendTimerInterval = null;

function startResendCooldown(seconds = 60) {
  if (!el.resendOtpBtn || !el.resendOtpTimer) return;
  clearInterval(resendTimerInterval);
  let remaining = seconds;
  el.resendOtpBtn.hidden = true;
  el.resendOtpTimer.hidden = false;
  if (el.resendCountdown) el.resendCountdown.textContent = remaining;

  resendTimerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(resendTimerInterval);
      el.resendOtpBtn.hidden = false;
      el.resendOtpTimer.hidden = true;
    } else {
      if (el.resendCountdown) el.resendCountdown.textContent = remaining;
    }
  }, 1000);
}

function showForgotStep(step) {
  el.forgotStep1.hidden = step !== 1;
  el.forgotStep2.hidden = step !== 2;
  if (step === 1) {
    if (el.authForgotError) el.authForgotError.textContent = '';
    if (el.authForgotSuccess) el.authForgotSuccess.textContent = '';
    if (el.forgotSubmitBtn) {
      el.forgotSubmitBtn.textContent = 'Send Code →';
    }
    if (el.forgotEmail) el.forgotEmail.focus();
  } else if (step === 2) {
    if (el.authResetError) el.authResetError.textContent = '';
    if (el.authResetSuccess) el.authResetSuccess.textContent = '';
    if (el.resetToken) {
      el.resetToken.value = '';
      el.resetToken.focus();
    }
    if (el.resetNewPassword) el.resetNewPassword.value = '';
    if (el.resetConfirmPassword) el.resetConfirmPassword.value = '';
    if (el.resetPwStrength) el.resetPwStrength.textContent = '';
  }
}

el.gotoRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); showAuthView('register'); });
el.gotoForgotBtn.addEventListener('click', (e) => { e.preventDefault(); showAuthView('forgot'); });
el.gotoLoginFromRegBtn.addEventListener('click', (e) => { e.preventDefault(); showAuthView('login'); });
el.gotoLoginFromForgotBtn.addEventListener('click', (e) => { e.preventDefault(); showAuthView('login'); });
el.backToStep1Btn.addEventListener('click', (e) => {
  e.preventDefault();
  showForgotStep(1);
});

// Password visibility toggles
function setupPasswordToggle(btn, input) {
  if (!btn || !input) return;
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
setupPasswordToggle(el.toggleResetPw, el.resetNewPassword);
if (el.toggleConfirmResetPw && el.resetConfirmPassword) {
  setupPasswordToggle(el.toggleConfirmResetPw, el.resetConfirmPassword);
}
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

  const email = (el.authLoginEmail ? el.authLoginEmail.value : '').trim();
  const password = el.authLoginPassword.value;

  if (!email || !password) {
    el.authLoginError.textContent = 'Please enter your email address and password.';
    el.loginSubmitBtn.disabled = false;
    el.loginSubmitBtn.classList.remove('is-loading');
    el.loginSubmitBtn.textContent = 'Sign In to EXPTRACK →';
    return;
  }
  if (!email.includes('@')) {
    el.authLoginError.textContent = 'Please enter a valid email address.';
    el.loginSubmitBtn.disabled = false;
    el.loginSubmitBtn.classList.remove('is-loading');
    el.loginSubmitBtn.textContent = 'Sign In to EXPTRACK →';
    return;
  }

  try {
    let res;
    try {
      res = await fetch(`${AUTH_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch (networkErr) {
      throw new Error('Cannot reach the server. Please make sure the server is running and try again.');
    }

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Login failed. Please check your credentials.');
    }

    el.loginSubmitBtn.classList.add('flash-success');
    state.token = data.token;
    localStorage.setItem('ledger_auth_token', data.token);

    state.profile = { ...data.user, loggedIn: true };
    updateGreeting();
    renderProfileView();

    animateAuthCardOut(() => {
      closeAuthModal();
      playCurtainReveal();
    });

    showGreetingToast(`${getTimeGreeting()}, ${state.profile.fullName}! Welcome back.`);
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
  const email = (el.registerEmail ? el.registerEmail.value : '').trim();
  const password = el.registerPassword.value;
  const monthlyBudget = el.registerBudget && el.registerBudget.value ? Number(el.registerBudget.value) : null;

  if (!fullName) {
    el.authRegisterError.textContent = 'Full name is required.';
    el.registerSubmitBtn.disabled = false;
    el.registerSubmitBtn.textContent = 'Register & Start with Zero →';
    return;
  }
  if (!email) {
    el.authRegisterError.textContent = 'Please provide an email address.';
    el.registerSubmitBtn.disabled = false;
    el.registerSubmitBtn.textContent = 'Register & Start with Zero →';
    return;
  }
  if (!email.includes('@')) {
    el.authRegisterError.textContent = 'Please enter a valid email address.';
    el.registerSubmitBtn.disabled = false;
    el.registerSubmitBtn.textContent = 'Register & Start with Zero →';
    return;
  }
  if (!password || password.length < 8) {
    el.authRegisterError.textContent = 'Password must be at least 8 characters long.';
    el.registerSubmitBtn.disabled = false;
    el.registerSubmitBtn.textContent = 'Register & Start with Zero →';
    return;
  }

  const payload = {
    fullName,
    email,
    password,
    monthlyBudget
  };

  try {
    let res;
    try {
      res = await fetch(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (networkErr) {
      throw new Error('Cannot reach the server. Please make sure the server is running and try again.');
    }

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register account.');
    }

    state.token = data.token;
    localStorage.setItem('ledger_auth_token', data.token);
    state.profile = { ...data.user, loggedIn: true };

    updateGreeting();
    renderProfileView();
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

// Auto-restrict OTP input to numbers only (max 6 digits)
if (el.resetToken) {
  el.resetToken.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });
}

// 3a. Forgot Password — Step 1: Request 6-digit OTP
el.authForgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.authForgotError.textContent = '';
  el.authForgotSuccess.textContent = '';
  el.forgotSubmitBtn.disabled = true;
  el.forgotSubmitBtn.textContent = 'Sending Code...';

  const email = (el.forgotEmail ? el.forgotEmail.value : '').trim();
  if (!email) {
    el.authForgotError.textContent = 'Please enter your registered email address.';
    el.forgotSubmitBtn.disabled = false;
    el.forgotSubmitBtn.textContent = 'Send Code →';
    return;
  }
  if (!email.includes('@')) {
    el.authForgotError.textContent = 'Please enter a valid email address.';
    el.forgotSubmitBtn.disabled = false;
    el.forgotSubmitBtn.textContent = 'Send Code →';
    return;
  }

  currentForgotEmail = email;

  try {
    let res;
    try {
      res = await fetch(`${AUTH_API}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (networkErr) {
      throw new Error('Cannot reach the server. Please ensure EXPTRACK server is running and try again.');
    }

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send verification code.');
    }

    if (el.otpSentEmailDisplay) {
      el.otpSentEmailDisplay.textContent = data.maskedEmail || maskEmail(currentForgotEmail);
    }

    el.authForgotSuccess.textContent = data.message || 'A verification code has been sent.';
    startResendCooldown(60);

    setTimeout(() => {
      showForgotStep(2);
      if (el.resetToken) el.resetToken.focus();
    }, 600);
  } catch (err) {
    el.authForgotError.textContent = err.message;
  } finally {
    el.forgotSubmitBtn.disabled = false;
    el.forgotSubmitBtn.textContent = 'Send Code →';
  }
});

// Resend OTP Action
if (el.resendOtpBtn) {
  el.resendOtpBtn.addEventListener('click', async () => {
    if (!currentForgotEmail) {
      showForgotStep(1);
      return;
    }

    el.resendOtpBtn.disabled = true;
    el.authResetError.textContent = '';
    el.authResetSuccess.textContent = 'Requesting fresh code...';

    try {
      const res = await fetch(`${AUTH_API}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentForgotEmail })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to resend verification code.');

      el.authResetSuccess.textContent = data.message || 'A new verification code has been dispatched.';
      startResendCooldown(60);
    } catch (err) {
      el.authResetError.textContent = err.message;
      el.authResetSuccess.textContent = '';
      el.resendOtpBtn.disabled = false;
    }
  });
}

// 3b. Reset Password — Step 2: Submit 6-digit OTP + new password + confirm password
if (el.authResetForm) {
  el.authResetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.authResetError.textContent = '';
    el.authResetSuccess.textContent = '';
    el.resetSubmitBtn.disabled = true;
    el.resetSubmitBtn.textContent = 'Resetting password...';

    const otp = (el.resetToken ? el.resetToken.value : '').trim();
    const newPassword = el.resetNewPassword ? el.resetNewPassword.value : '';
    const confirmPassword = el.resetConfirmPassword ? el.resetConfirmPassword.value : '';

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      el.authResetError.textContent = 'Please enter the complete 6-digit verification code.';
      el.resetSubmitBtn.disabled = false;
      el.resetSubmitBtn.textContent = 'Reset Password →';
      if (el.resetToken) el.resetToken.focus();
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      el.authResetError.textContent = 'New password must be at least 8 characters long.';
      el.resetSubmitBtn.disabled = false;
      el.resetSubmitBtn.textContent = 'Reset Password →';
      if (el.resetNewPassword) el.resetNewPassword.focus();
      return;
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      el.authResetError.textContent = 'Passwords do not match. Please re-enter.';
      el.resetSubmitBtn.disabled = false;
      el.resetSubmitBtn.textContent = 'Reset Password →';
      if (el.resetConfirmPassword) el.resetConfirmPassword.focus();
      return;
    }

    try {
      let res;
      try {
        res = await fetch(`${AUTH_API}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentForgotEmail,
            otp,
            newPassword
          })
        });
      } catch (networkErr) {
        throw new Error('Cannot reach the server. Please make sure the server is running and try again.');
      }

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed.');
      }

      el.authResetSuccess.textContent = '✓ Password reset successfully! Redirecting to Sign In…';
      setTimeout(() => {
        showAuthView('login');
        if (el.authLoginEmail) el.authLoginEmail.value = currentForgotEmail || el.forgotEmail.value || '';
        if (el.authLoginPassword) {
          el.authLoginPassword.value = '';
          el.authLoginPassword.focus();
        }
      }, 1200);
    } catch (err) {
      el.authResetError.textContent = err.message;
    } finally {
      el.resetSubmitBtn.disabled = false;
      el.resetSubmitBtn.textContent = 'Reset Password →';
    }
  });
}

// ================= GOOGLE SIGN-IN INTEGRATION =================

let googleClientId = '';
let googleSignInInitialized = false;

async function fetchAppConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      googleClientId = (data.googleClientId || '').trim();
      initGoogleSignIn();
    }
  } catch (err) {
    console.warn('Could not load app configuration:', err.message);
  }
}

function initGoogleSignIn() {
  if (!googleClientId) {
    // Hide Google button sections if Google Client ID not configured
    if (el.googleLoginSection) el.googleLoginSection.hidden = true;
    if (el.googleRegisterSection) el.googleRegisterSection.hidden = true;
    return;
  }

  // Ensure sections are visible
  if (el.googleLoginSection) el.googleLoginSection.hidden = false;
  if (el.googleRegisterSection) el.googleRegisterSection.hidden = false;

  if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
    // Retry when GIS script finishes loading
    setTimeout(initGoogleSignIn, 250);
    return;
  }

  try {
    if (!googleSignInInitialized) {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false
      });
      googleSignInInitialized = true;
    }

    const getResponsiveWidth = (container) => {
      if (!container) return 300;
      const parentWidth = container.parentElement ? container.parentElement.clientWidth : container.clientWidth;
      if (parentWidth && parentWidth < 340) {
        return Math.max(220, Math.floor(parentWidth - 10));
      }
      return 320;
    };

    if (el.googleLoginContainer && el.googleLoginContainer.childElementCount === 0) {
      google.accounts.id.renderButton(el.googleLoginContainer, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width: getResponsiveWidth(el.googleLoginContainer)
      });
    }

    if (el.googleRegisterContainer && el.googleRegisterContainer.childElementCount === 0) {
      google.accounts.id.renderButton(el.googleRegisterContainer, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width: getResponsiveWidth(el.googleRegisterContainer)
      });
    }
  } catch (err) {
    console.warn('Error rendering Google Sign-In button:', err.message);
  }
}

async function handleGoogleCredentialResponse(response) {
  const credential = response ? response.credential : null;
  if (!credential) return;

  if (el.authLoginError) el.authLoginError.textContent = '';
  if (el.authRegisterError) el.authRegisterError.textContent = '';

  try {
    const res = await fetch(`${AUTH_API}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Google Sign-In failed.');
    }

    state.token = data.token;
    localStorage.setItem('ledger_auth_token', data.token);
    state.profile = { ...data.user, loggedIn: true };

    updateGreeting();
    renderProfileView();

    animateAuthCardOut(() => {
      closeAuthModal();
      playCurtainReveal();
    });

    showGreetingToast(`${getTimeGreeting()}, ${state.profile.fullName}! Welcome to EXPTRACK.`);
    await loadMonth();
  } catch (err) {
    if (!el.authLoginView.hidden && el.authLoginError) {
      el.authLoginError.textContent = err.message;
    } else if (!el.authRegisterView.hidden && el.authRegisterError) {
      el.authRegisterError.textContent = err.message;
    } else {
      showGreetingToast(err.message, true);
    }
  }
}

// ----------------- Profile Modal & Profile Management -----------------

function updateGreeting() {
  el.greetingTime.textContent = getTimeGreeting();

  if (state.profile.loggedIn && state.profile.fullName) {
    el.greetingName.textContent = state.profile.fullName;
    el.headerAvatar.textContent = getInitials(state.profile.fullName);
  } else {
    el.greetingName.textContent = 'Sign In / Register';
    el.headerAvatar.textContent = '👤';
  }
}

function renderProfileView() {
  const p = state.profile;
  el.modalAvatar.textContent = getInitials(p.fullName);
  el.modalUserName.textContent = p.fullName || 'User Profile';
  el.viewFullName.textContent = p.fullName || '—';
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

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModals();
  }
});

// Edit Profile Trigger
el.startEditProfileBtn.addEventListener('click', () => {
  const p = state.profile;
  el.editFullName.value = p.fullName || '';
  el.editEmail.value = p.email || '';
  el.editOccupation.value = p.occupation || '';
  el.editBudget.value = p.monthlyBudget || '';
  if (el.editNewPassword) el.editNewPassword.value = '';
  if (el.editPwStrength) { el.editPwStrength.textContent = ''; el.editPwStrength.className = 'pw-strength-hint'; }
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
    email: el.editEmail.value.trim(),
    occupation: el.editOccupation.value.trim(),
    monthlyBudget: el.editBudget.value ? Number(el.editBudget.value) : null
  };

  const newPassword = el.editNewPassword ? el.editNewPassword.value.trim() : '';
  if (newPassword && newPassword.length < 8) {
    el.profileFormError.textContent = 'New password must be at least 8 characters long.';
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

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save profile changes.');
    }

    if (data.passwordChanged) {
      // Token is now invalid (tokenVersion bumped server-side) — force re-login
      state.token = null;
      localStorage.removeItem('ledger_auth_token');
      state.profile = { id: null, fullName: '', email: '', occupation: '', monthlyBudget: null, loggedIn: false };

      closeModals();
      updateGreeting();
      state.cachedExpenses = [];
      state.cachedSummary = null;
      renderStats({});
      renderBreakdown();
      renderFilteredEntries();
      hideBudgetProgress();

      openAuthModal('login');
      el.authLoginEmail.value = payload.email || '';
      el.authLoginPassword.value = '';
      el.authLoginPassword.focus();
      showGreetingToast('Password changed. Please sign in with your new password.');
      return;
    }

    state.profile = { ...state.profile, ...data.user };
    updateGreeting();
    renderProfileView();

    // Refresh budget progress if budget changed
    if (state.cachedSummary) {
      renderBudgetProgress(state.cachedSummary);
    }

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
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
  } catch (err) {}

  state.token = null;
  localStorage.removeItem('ledger_auth_token');
  state.profile = { id: null, fullName: '', email: '', occupation: '', monthlyBudget: null, loggedIn: false };

  closeModals();
  updateGreeting();
  state.cachedExpenses = [];
  state.cachedSummary = null;
  renderStats({});
  renderBreakdown();
  renderFilteredEntries();
  hideBudgetProgress();

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

// ----------------- Budget Progress -----------------

function renderBudgetProgress(summary) {
  const budget = state.profile.monthlyBudget;
  if (!budget || budget <= 0) {
    hideBudgetProgress();
    return;
  }

  const totalDebit = Number(summary.totalDebit || 0);
  const pct = Math.min(Math.round((totalDebit / budget) * 100), 999);
  const displayPct = Math.min(pct, 100); // cap fill bar at 100%

  el.budgetSection.hidden = false;
  el.budgetPct.textContent = `${pct}%`;
  el.budgetTrack.setAttribute('aria-valuenow', displayPct);
  el.budgetFill.style.width = `${displayPct}%`;

  // Colour states
  el.budgetFill.classList.remove('fill-ok', 'fill-warn', 'fill-over');
  el.budgetSection.classList.remove('budget-warn', 'budget-over');

  if (pct >= 100) {
    el.budgetFill.classList.add('fill-over');
    el.budgetSection.classList.add('budget-over');
    el.budgetLabel.textContent = 'Budget exceeded!';
    el.budgetSub.textContent = `Spent ${formatMoney(totalDebit)} of ${formatMoney(budget)} — over by ${formatMoney(totalDebit - budget)}.`;
  } else if (pct >= 80) {
    el.budgetFill.classList.add('fill-warn');
    el.budgetSection.classList.add('budget-warn');
    el.budgetLabel.textContent = 'Approaching budget limit';
    el.budgetSub.textContent = `Spent ${formatMoney(totalDebit)} of ${formatMoney(budget)} (${formatMoney(budget - totalDebit)} remaining).`;
  } else {
    el.budgetFill.classList.add('fill-ok');
    el.budgetLabel.textContent = 'Budget used this month';
    el.budgetSub.textContent = `Spent ${formatMoney(totalDebit)} of ${formatMoney(budget)} (${formatMoney(budget - totalDebit)} remaining).`;
  }
}

function hideBudgetProgress() {
  if (el.budgetSection) el.budgetSection.hidden = true;
}

// ----------------- Month Jump Dropdown -----------------

function updateMonthJumpDropdown(months) {
  state.availableMonths = months || [];
  if (!el.monthJumpSelect) return;

  el.monthJumpSelect.innerHTML = '<option value="">Jump to month…</option>';
  months.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = monthLabel(m);
    if (m === state.month) opt.selected = true;
    el.monthJumpSelect.appendChild(opt);
  });
}

if (el.monthJumpSelect) {
  el.monthJumpSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    state.month = val;
    el.monthLabel.textContent = monthLabel(val);
    loadMonth();
  });
}

// ----------------- Data Loading (Per User) -----------------

async function loadMonth() {
  el.monthLabel.textContent = monthLabel(state.month);

  // Sync the jump dropdown selection
  if (el.monthJumpSelect) {
    el.monthJumpSelect.value = state.month;
  }

  if (!state.profile.loggedIn || !state.token) {
    renderStats({});
    el.breakdownBars.innerHTML = '<p class="empty-note">Please sign in to view your category breakdown.</p>';
    el.entriesList.innerHTML = '<p class="empty-note">Please sign in to view your ledger entries.</p>';
    hideBudgetProgress();
    return;
  }

  try {
    const [expensesRes, summaryRes, monthsRes] = await Promise.all([
      authFetch(`${API}?month=${state.month}`),
      authFetch(`${API}/summary?month=${state.month}`),
      authFetch(`${API}/months`)
    ]);

    const expenses = await safeJson(expensesRes);
    const summary = await safeJson(summaryRes);
    const months = await safeJson(monthsRes);

    state.cachedExpenses = Array.isArray(expenses) ? expenses : [];
    state.cachedSummary = (summary && typeof summary === 'object') ? summary : {};

    renderStats(state.cachedSummary);
    renderBudgetProgress(state.cachedSummary);
    renderMixedCurrencyWarning(state.cachedSummary);
    renderBreakdown();
    renderFilteredEntries();
    updateMonthJumpDropdown(Array.isArray(months) ? months : []);
  } catch (err) {
    console.error('Failed to load ledger data:', err);
    el.breakdownBars.innerHTML = `<p class="empty-note" style="color:var(--brick)">${escapeHtml(err.message)}</p>`;
    el.entriesList.innerHTML = `<p class="empty-note" style="color:var(--brick)">Could not load entries — ${escapeHtml(err.message)}</p>`;
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

  [el.statCredit, el.statDebit, el.statBalance, el.statCount].forEach(popStatValue);
}

function renderMixedCurrencyWarning(summary) {
  if (!el.mixedCurrencyWarning) return;

  if (!summary || !summary.mixedCurrencies) {
    el.mixedCurrencyWarning.hidden = true;
    return;
  }

  el.mixedCurrencyWarning.hidden = false;

  // Build per-currency breakdown text
  const breakdown = summary.currencyBreakdown || {};
  const parts = Object.entries(breakdown).map(([cur, totals]) => {
    const sym = cur.trim();
    const items = [];
    if (totals.totalCredit > 0) items.push(`+${sym}${totals.totalCredit.toFixed(2)}`);
    if (totals.totalDebit > 0)  items.push(`−${sym}${totals.totalDebit.toFixed(2)}`);
    return items.join(' / ');
  });

  const breakdownStr = parts.length ? ` (${parts.join('  |  ')})` : '';
  el.mixedCurrencyText.innerHTML =
    `⚠ Multiple currencies detected — totals are raw sums, <strong>not converted</strong>.${escapeHtml(breakdownStr)}`;
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
    let emptyMsg = '';
    if (state.filterType === 'debit') {
      emptyMsg = 'No debit entries for this month.';
    } else if (state.filterType === 'credit') {
      emptyMsg = 'No income/credit entries for this month.';
    } else {
      // First-time empty state CTA
      if (state.profile.loggedIn) {
        el.entriesList.innerHTML = `
          <div class="empty-cta">
            <div class="empty-cta-icon">📒</div>
            <p class="empty-cta-heading">No entries yet for this month</p>
            <p class="empty-cta-sub">Start tracking by adding your first income or expense.</p>
            <button type="button" class="btn-primary empty-cta-btn" id="empty-cta-btn">+ Add your first entry</button>
          </div>`;
        document.getElementById('empty-cta-btn').addEventListener('click', () => {
          el.date.focus();
          el.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      } else {
        emptyMsg = 'No entries for this month yet. Add one on the left.';
      }
    }
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
      const err = await safeJson(res).catch(() => ({}));
      throw new Error(err.error || 'Something went wrong saving that entry.');
    }

    const saved = await safeJson(res).catch(() => ({}));

    // Surface local-fallback warning if Supabase was unavailable
    if (saved.warning) {
      showGreetingToast(`⚠ ${saved.warning}`, true);
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
      // Check for warning in the body (non-204 responses include a body)
      if (res.status !== 204) {
        const body = await safeJson(res).catch(() => ({}));
        if (body.warning) showGreetingToast(`⚠ ${body.warning}`, true);
      }
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
    if (state.profile.loggedIn) renderBreakdown();
  });
});

el.entriesFilterPills.querySelectorAll('.pill-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    el.entriesFilterPills.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
    e.target.classList.add('active');
    state.filterType = e.target.dataset.filter;
    if (state.profile.loggedIn) renderFilteredEntries();
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
  // Fetch dynamic config (including Google Client ID)
  await fetchAppConfig();

  const savedSymbol = localStorage.getItem('ledger_currency_symbol');
  const savedLocale = localStorage.getItem('ledger_currency_locale');
  if (savedSymbol && el.currencySelect) {
    state.currencySymbol = savedSymbol;
    state.currencyLocale = savedLocale || 'en-IN';
    el.currencySelect.value = savedSymbol;
  }

  setEntryType('debit');
  el.date.value = new Date().toISOString().slice(0, 10);

  // Check existing JWT session
  if (state.token) {
    try {
      const res = await fetch(`${AUTH_API}/me`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });

      if (res.ok) {
        const data = await res.json();
        state.profile = { ...data.user, loggedIn: true };
        updateGreeting();
        renderProfileView();
        closeAuthModal();

        showGreetingToast(`${getTimeGreeting()}, ${state.profile.fullName}! Welcome back.`);
        await loadMonth();
        return;
      }
    } catch (err) {
      console.warn('Session verification failed:', err);
    }
  }

  // Invalid or missing token — show login
  state.token = null;
  localStorage.removeItem('ledger_auth_token');
  state.profile.loggedIn = false;
  updateGreeting();
  loadMonth();
  openAuthModal('login');
}

init();
