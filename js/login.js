const baseApiUrl = `${location.origin}/intro/api`;

document.addEventListener('DOMContentLoaded', async () => {
  // If already authenticated, go to app
  try {
    const res = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
    if (res.data && res.data.authenticated) {
      location.href = './admin.html#dashboard';
      return;
    }
  } catch {}

  const form = document.getElementById('login-form');
  const error = document.getElementById('login-error');
  const toggle = document.getElementById('toggle-password');
  const pwdInput = document.getElementById('login-password');

  if (toggle && pwdInput){
    toggle.addEventListener('click', () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.classList.add('hidden');
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    const fd = new FormData();
    fd.append('operation', 'login');
    fd.append('json', JSON.stringify({ username, password, rememberMe }));
    
    try {
      const res = await axios.post(`${baseApiUrl}/auth.php`, fd, { withCredentials: true });
      if (res.data && res.data.success){
        const role = res.data.user && res.data.user.role ? res.data.user.role : 'admin';
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('rememberedUsername', username);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberedUsername');
        }
        
        try { sessionStorage.setItem('introJustLoggedIn', '1'); } catch {}
        if (role === 'hr') {
          location.href = './hr.html#overview';
        } else if (role === 'employee' || role === 'manager') {
          location.href = './employee.html';
        } else {
          location.href = './admin.html#dashboard';
        }
      } else {
        error.textContent = res.data && res.data.message ? res.data.message : 'Invalid credentials';
        error.classList.remove('hidden');
      }
    } catch (err) {
      error.textContent = 'Login failed';
      error.classList.remove('hidden');
    }
  });
  
  // Check for remembered username
  const rememberedUsername = localStorage.getItem('rememberedUsername');
  if (rememberedUsername) {
    document.getElementById('login-username').value = rememberedUsername;
    document.getElementById('remember-me').checked = true;
  }
});


