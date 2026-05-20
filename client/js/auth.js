/**
 * Authentication Logic
 */

let currentUser = null;
let authToken = null;

const API_URL = '/api'; // Relative to the server serving the file

// ==================== DOM ELEMENTS ====================

// Forms
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const formForgot = document.getElementById('form-forgot');
const formReset = document.getElementById('form-reset');

// Inputs
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginRememberInput = document.getElementById('login-remember');

const regUsernameInput = document.getElementById('reg-username');
const regEmailInput = document.getElementById('reg-email');
const regPasswordInput = document.getElementById('reg-password');

const forgotEmailInput = document.getElementById('forgot-email');

const resetTokenInput = document.getElementById('reset-token');
const resetNewPasswordInput = document.getElementById('reset-new-password');
const resetConfirmPasswordInput = document.getElementById('reset-confirm-password');

// Auth Message (for errors/success)
const authMessage = document.getElementById('auth-message');

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  // Check for reset token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    if (resetTokenInput) resetTokenInput.value = token;
    // Show auth screen, switch to reset form
    if (typeof MapsTo === 'function') MapsTo('screen-auth');
    switchForm('form-reset');
    // Remove token from URL to keep it clean
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  attachAuthListeners();
});

// ==================== AUTH LISTENERS ====================

function attachAuthListeners() {
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = loginUsernameInput.value;
      const password = loginPasswordInput.value;
      const rememberMe = loginRememberInput ? loginRememberInput.checked : false;
      await login(username, password, rememberMe);
    });
  }

  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = regUsernameInput.value;
      const email = regEmailInput.value;
      const password = regPasswordInput.value;
      
      const houseInput = document.querySelector('input[name="house"]:checked');
      const house = houseInput ? houseInput.value : 'gryffindor';

      await register(username, email, password, house);
    });
  }

  if (formForgot) {
    formForgot.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = forgotEmailInput.value;
      await forgotPassword(email);
    });
  }

  if (formReset) {
    formReset.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = resetTokenInput.value;
      const newPassword = resetNewPasswordInput.value;
      const confirmPassword = resetConfirmPasswordInput.value;

      if (newPassword !== confirmPassword) {
        showAuthMessage('Passwords do not match.', false);
        return;
      }

      await resetPassword(token, newPassword);
    });
  }

  // Toggle Forms Links
  const linkToRegister = document.getElementById('link-to-register');
  const linkToLogin = document.getElementById('link-to-login');
  const linkToForgot = document.getElementById('link-to-forgot');
  const linkForgotBack = document.getElementById('link-forgot-back');

  linkToRegister?.addEventListener('click', (e) => { e.preventDefault(); switchForm('form-register'); });
  linkToLogin?.addEventListener('click', (e) => { e.preventDefault(); switchForm('form-login'); });
  linkToForgot?.addEventListener('click', (e) => { e.preventDefault(); switchForm('form-forgot'); });
  linkForgotBack?.addEventListener('click', (e) => { e.preventDefault(); switchForm('form-login'); });

  // Back to login from reset form
  const linkResetBack = document.getElementById('link-reset-back');
  if (linkResetBack) {
    linkResetBack.addEventListener('click', (e) => {
      e.preventDefault();
      switchForm('form-login');
    });
  }
}

// ==================== AUTH FUNCTIONS ====================

async function login(username, password, rememberMe) {
  try {
    hideAuthMessage();
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe })
    });

    const data = await response.json();

    if (!response.ok) {
      showAuthMessage(data.error || 'Login failed', false);
      return;
    }

    if (data.token) {
      authToken = data.token;
      currentUser = data.user;
      window.currentUser = data.user;

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('wizard_token', authToken);
      if (data.user?.id) {
        storage.setItem('wizard_user_id', String(data.user.id));
      }
      if (typeof applyUserToUI === 'function') applyUserToUI(data.user);
      if (typeof setCurrentUserId === 'function') setCurrentUserId(String(data.user.id));
    }

    MapsTo('screen-main');
  } catch (error) {
    console.error('Login error:', error);
    showAuthMessage('An error occurred. Please try again.', false);
  }
}

async function register(username, email, password, house) {
  try {
    hideAuthMessage();

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, house })
    });

    const data = await response.json();

    if (!response.ok) {
      showAuthMessage(data.error || 'Registration failed', false);
      return;
    }

    if (data.token) {
      authToken = data.token;
      currentUser = data.user;
      window.currentUser = data.user;
      localStorage.setItem('wizard_token', authToken);
      if (data.user?.id) {
        localStorage.setItem('wizard_user_id', String(data.user.id));
      }
      if (typeof applyUserToUI === 'function') applyUserToUI(data.user);
      if (typeof setCurrentUserId === 'function') setCurrentUserId(String(data.user.id));
    }

    MapsTo('screen-main');
  } catch (error) {
    console.error('Register error:', error);
    showAuthMessage('An error occurred. Please try again.', false);
  }
}

async function forgotPassword(email) {
  try {
    hideAuthMessage();

    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      showAuthMessage(data.error || 'Request failed', false);
      return;
    }

    showAuthMessage('Reset link sent to your email. Please check your inbox.', true);
    setTimeout(() => switchForm('form-login'), 4000);
  } catch (error) {
    console.error('Forgot password error:', error);
    showAuthMessage('An error occurred. Please try again.', false);
  }
}

async function resetPassword(token, newPassword) {
  try {
    hideAuthMessage();

    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      showAuthMessage(data.error || 'Reset failed', false);
      return;
    }

    showAuthMessage('Password reset successful! Please login.', true);
    setTimeout(() => switchForm('form-login'), 3000);
  } catch (error) {
    console.error('Reset password error:', error);
    showAuthMessage('An error occurred. Please try again.', false);
  }
}

// ==================== HELPER FUNCTIONS ====================

// Note: Making switchForm available globally if other scripts need it
window.switchForm = function(formId) {
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.add('hidden');
    form.classList.remove('active');
  });

  const targetForm = document.getElementById(formId);
  if (targetForm) {
    targetForm.classList.remove('hidden');
    targetForm.classList.add('active');
  }
  
  hideAuthMessage();
};

function showAuthMessage(message, isSuccess = false) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.style.display = 'block';
  authMessage.className = 'auth-message'; // Reset
  if (isSuccess) {
    authMessage.style.color = '#10b981';
  } else {
    authMessage.style.color = '#ef4444';
  }
}

function hideAuthMessage() {
  if (!authMessage) return;
  authMessage.style.display = 'none';
  authMessage.textContent = '';
}
