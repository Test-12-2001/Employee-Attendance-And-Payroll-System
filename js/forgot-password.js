const baseApiUrl = `${location.origin}/intro/api`;

document.addEventListener('DOMContentLoaded', () => {
  const requestForm = document.getElementById('request-code-form');
  const resetForm = document.getElementById('reset-password-form');
  const requestMessage = document.getElementById('request-message');
  const resetMessage = document.getElementById('reset-message');
  const toggle = document.getElementById('toggle-password');
  const pwdInput = document.getElementById('new-password');
  
  // Step 1: Request Code
  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('forgot-username').value.trim();
    if (!username) {
      showMessage(requestMessage, 'Please enter a username or email', 'error');
      return;
    }
    
    // Show loading state
    const sendBtn = document.getElementById('send-code-btn');
    const btnText = document.getElementById('btn-text');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    sendBtn.disabled = true;
    btnText.textContent = 'Sending...';
    loadingSpinner.classList.remove('hidden');
    
    try {
      const fd = new FormData();
      fd.append('operation', 'forgotPassword');
      fd.append('json', JSON.stringify({ username }));
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await axios.post(`${baseApiUrl}/auth.php`, fd, { 
        signal: controller.signal,
        timeout: 30000 // 30 second timeout
      });
      
      clearTimeout(timeoutId);
      
      if (res.data && res.data.success) {
        showMessage(requestMessage, 'A 6-digit code has been sent to your email. Please check your inbox.', 'success');
        // Hide request form and show reset form
        requestForm.classList.add('hidden');
        resetForm.classList.remove('hidden');
        // Pre-fill username in reset form
        document.getElementById('reset-code').focus();
      } else {
        showMessage(requestMessage, res.data.message || 'Failed to process request', 'error');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Error:', err);
      
      let errorMessage = 'An error occurred. Please try again.';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Connection timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || 'Server error. Please try again.';
      }
      
      showMessage(requestMessage, errorMessage, 'error');
    } finally {
      // Reset button state
      sendBtn.disabled = false;
      btnText.textContent = 'Send Reset Code';
      loadingSpinner.classList.add('hidden');
    }
  });
  
  // Step 2: Reset Password with Code
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const code = document.getElementById('reset-code').value.trim();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!code || code.length !== 6) {
      showMessage(resetMessage, 'Please enter the 6-digit code', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      showMessage(resetMessage, 'Password must be at least 6 characters long', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showMessage(resetMessage, 'Passwords do not match', 'error');
      return;
    }
    
    try {
      const fd = new FormData();
      fd.append('operation', 'resetPassword');
      fd.append('json', JSON.stringify({ 
        code, 
        newPassword 
      }));
      
      const res = await axios.post(`${baseApiUrl}/auth.php`, fd);
      
      if (res.data && res.data.success) {
        showMessage(resetMessage, 'Password reset successfully! Redirecting to login...', 'success');
        setTimeout(() => {
          window.location.href = './login.html';
        }, 2000);
      } else {
        showMessage(resetMessage, res.data.message || 'Failed to reset password', 'error');
      }
    } catch (err) {
      console.error('Error:', err);
      showMessage(resetMessage, 'An error occurred. Please try again.', 'error');
    }
  });
  
  // Password toggle functionality
  if (toggle && pwdInput) {
    toggle.addEventListener('click', () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }
  
  // Password strength checking
  pwdInput.addEventListener('input', () => {
    const password = pwdInput.value;
    const strengthDiv = document.getElementById('password-strength');
    
    if (password.length === 0) {
      strengthDiv.classList.add('hidden');
      return;
    }
    
    strengthDiv.classList.remove('hidden');
    const strength = checkPasswordStrength(password);
    updatePasswordStrengthIndicator(strength);
  });
  
  // Code input formatting (only allow numbers)
  document.getElementById('reset-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
  });
  
  function checkPasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    return Math.min(score, 4);
  }
  
  function updatePasswordStrengthIndicator(strength) {
    const strengthText = document.getElementById('strength-text');
    const strength1 = document.getElementById('strength-1');
    const strength2 = document.getElementById('strength-2');
    const strength3 = document.getElementById('strength-3');
    const strength4 = document.getElementById('strength-4');
    
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
    const texts = ['Very Weak', 'Weak', 'Fair', 'Strong'];
    
    // Reset all indicators
    [strength1, strength2, strength3, strength4].forEach((el, index) => {
      el.className = `w-2 h-2 rounded-full ${index < strength ? colors[strength - 1] : 'bg-gray-300'}`;
    });
    
    strengthText.textContent = texts[strength - 1] || '';
    strengthText.className = `ml-2 ${strength >= 3 ? 'text-green-600' : strength >= 2 ? 'text-yellow-600' : 'text-red-600'}`;
  }
  
  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `text-sm ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    element.classList.remove('hidden');
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        element.classList.add('hidden');
      }, 5000);
    }
  }
});
