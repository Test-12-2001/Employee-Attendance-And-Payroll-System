const baseApiUrl = `${location.origin}/intro/api`;

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure employee logged in
  const me = await currentUser();
  if (!me || (me.role !== 'employee' && me.role !== 'manager')) {
    location.href = './login.html';
    return;
  }
  
  // Refresh user data to ensure we have the latest information
  const refreshedUser = await refreshUserData(me);
  
  render(refreshedUser);
  wireLogout();
});

async function currentUser(){
  try {
    // Check session storage first for updated user information
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.user_id) {
          return parsedUser;
        }
      } catch (e) {
        console.log('Could not parse stored user data');
      }
    }
    
    // Fallback to API call
    const res = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
    const user = res.data && res.data.user ? res.data.user : null;
    
    // Store the user in session storage for future use
    if (user) {
      try {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
      } catch (e) {
        console.log('Could not store user in session storage');
      }
    }
    
    return user;
  } catch { return null; }
}

async function refreshUserData(user) {
  try {
    // Get fresh user data from the server
    const res = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
    const freshUser = res.data && res.data.user ? res.data.user : null;
    
    if (freshUser) {
      // Merge with any stored updates
      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsedStored = JSON.parse(storedUser);
          Object.assign(freshUser, parsedStored);
        } catch (e) {
          console.log('Could not merge stored user data');
        }
      }
      
      // Update session storage
      try {
        sessionStorage.setItem('currentUser', JSON.stringify(freshUser));
      } catch (e) {
        console.log('Could not update session storage');
      }
      
      return freshUser;
    }
    
    return user;
  } catch (error) {
    console.error('Failed to refresh user data:', error);
    return user;
  }
}

function wireLogout(){
  const btn = document.getElementById('emp-logout');
  if (btn){
    btn.addEventListener('click', async () => {
      try { 
        await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'logout' }, withCredentials: true }); 
      } catch {}
      
      // Clear session storage
      try {
        sessionStorage.removeItem('currentUser');
      } catch (e) {
        console.log('Could not clear session storage');
      }
      
      location.href = './login.html';
    });
  }
}

async function render(user){
  const app = document.getElementById('emp-app');
  app.innerHTML = `
    <section class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4 lg:col-span-2">
        <h3 class="font-semibold mb-2">Welcome, ${user.first_name || user.username || ''} ${user.last_name || ''}</h3>
        <div class="text-sm text-gray-700">Role: ${user.role}</div>
        <div class="text-sm text-gray-600">Email: ${user.username || ''}</div>
        <div class="text-sm text-gray-600">Phone: ${user.phone || 'Not set'}</div>
        <div class="mt-3 text-sm">
          <button id="btn-update-details" class="px-3 py-2 text-sm rounded border">Update personal details</button>
        </div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-semibold mb-2">Today's Attendance</h3>
        <div id="today-att"></div>
        <div class="mt-3 text-sm">
          <button id="btn-clock" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Clock In/Out</button>
        </div>
      </div>
    </section>
    <section class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-semibold mb-2">Attendance Summary (This Month)</h3>
        <ul id="att-summary" class="text-sm space-y-1"></ul>
      </div>
      <div class="bg-white rounded-lg shadow p-4 lg:col-span-2">
        <h3 class="font-semibold mb-2">Payslips</h3>
        <div id="payslips" class="text-sm"></div>
      </div>
    </section>
    <section class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="bg-white rounded-lg shadow p-4 lg:col-span-2">
        <h3 class="font-semibold mb-2">Leave Requests</h3>
        <div class="mb-3">
          <button id="btn-new-leave" class="px-3 py-2 text-sm rounded border">File new leave</button>
        </div>
        <div id="leave-list" class="text-sm"></div>
        <div id="leave-modal" class="fixed inset-0 hidden z-50">
          <div class="absolute inset-0 bg-black/50" data-close="true"></div>
          <div class="relative mx-auto mt-24 w-full max-w-md">
            <div class="bg-white rounded-lg shadow">
              <div class="flex items-center justify-between border-b px-4 py-3"><h5 class="font-semibold">New Leave Request</h5><button class="text-gray-500 text-xl" data-close="true">×</button></div>
              <div class="p-4 grid gap-3">
                <div>
                  <label class="block text-sm text-gray-600 mb-1">Start date</label>
                  <input id="lv-start" type="date" class="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">End date</label>
                  <input id="lv-end" type="date" class="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">Reason</label>
                  <textarea id="lv-reason" rows="3" class="w-full border rounded px-3 py-2"></textarea>
                </div>
              </div>
              <div class="flex justify-end gap-2 border-t px-4 py-3">
                <button class="px-3 py-2 text-sm rounded border" data-close="true">Cancel</button>
                <button id="lv-save" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Submit</button>
              </div>
            </div>
          </div>
        </div>
        <div id="details-modal" class="fixed inset-0 hidden z-50">
          <div class="absolute inset-0 bg-black/50" data-close="true"></div>
          <div class="relative mx-auto mt-24 w-full max-w-md">
            <div class="bg-white rounded-lg shadow">
              <div class="flex items-center justify-between border-b px-4 py-3"><h5 class="font-semibold">Update Personal Details</h5><button class="text-gray-500 text-xl" data-close="true">×</button></div>
              <div class="p-4 grid gap-3">
                <div>
                  <label class="block text-sm text-gray-600 mb-1">First name</label>
                  <input id="pd-first" class="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">Last name</label>
                  <input id="pd-last" class="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">Email</label>
                  <input id="pd-email" type="email" class="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">Phone</label>
                  <input id="pd-phone" class="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">New Password (optional)</label>
                  <input id="pd-password" type="password" class="w-full border rounded px-3 py-2" placeholder="Leave blank to keep current password" />
                </div>
              </div>
              <div class="flex justify-end gap-2 border-t px-4 py-3">
                <button class="px-3 py-2 text-sm rounded border" data-close="true">Cancel</button>
                <button id="details-save" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-semibold mb-2 flex items-center justify-between">
          Notifications 
          <span id="notif-count" class="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full hidden">0</span>
          <button id="refresh-notifs" class="text-xs text-blue-600 hover:text-blue-800">↻</button>
        </h3>
        <ul id="emp-notifs" class="text-sm space-y-1"></ul>
        <div class="mt-3 flex items-center gap-2">
          <input id="notif-input" class="border rounded px-3 py-2 flex-1 text-sm" placeholder="Add a note..." />
          <button id="notif-add" class="px-3 py-2 text-sm rounded border">Add</button>
        </div>
      </div>
    </section>`;

  await Promise.all([
    renderTodayAttendance(user),
    renderAttendanceSummary(user),
    renderPayslips(user),
    renderLeaves(user),
    renderNotifications(user),
    renderHeaderNotifications(user)
  ]);

  // Set up auto-refresh for notifications every 30 seconds
  setInterval(async () => {
    await Promise.all([
      renderNotifications(user),
      renderHeaderNotifications(user)
    ]);
  }, 30000);

  // Wire leave modal
  const modal = document.getElementById('leave-modal');
  const open = () => modal.classList.remove('hidden');
  const close = () => modal.classList.add('hidden');
  document.getElementById('btn-new-leave').addEventListener('click', open);
  modal.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', close));
  document.getElementById('lv-save').addEventListener('click', async () => {
    const start = (document.getElementById('lv-start').value||'').trim();
    const end = (document.getElementById('lv-end').value||'').trim();
    const reason = (document.getElementById('lv-reason').value||'').trim();
    if (!start || !end) { alert('Please select start and end dates'); return; }
    try {
      const fd = new FormData();
      fd.append('operation', 'requestLeave');
      fd.append('json', JSON.stringify({ employee_id: user.employee_id, start_date: start, end_date: end, reason }));
      await axios.post(`${baseApiUrl}/leaves.php`, fd);
      close();
      await renderLeaves(user);
      alert('Leave request submitted');
    } catch { alert('Failed to submit'); }
  });

  // Wire update personal details modal
  const detailsModal = document.getElementById('details-modal');
  const openDetails = () => detailsModal.classList.remove('hidden');
  const closeDetails = () => detailsModal.classList.add('hidden');
  detailsModal.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', closeDetails));
  const updateBtn = document.getElementById('btn-update-details');
  if (updateBtn) {
    updateBtn.addEventListener('click', async () => {
      try {
        const res = await axios.get(`${baseApiUrl}/employees.php`, { params: { operation: 'getEmployee', employee_id: user.employee_id } });
        const e = res.data || {};
        detailsModal.dataset.original = JSON.stringify(e || {});
        const f = (id) => document.getElementById(id);
        if (f('pd-first')) f('pd-first').value = e.first_name || '';
        if (f('pd-last')) f('pd-last').value = e.last_name || '';
        if (f('pd-email')) f('pd-email').value = e.email || '';
        if (f('pd-phone')) f('pd-phone').value = e.phone || '';
        if (f('pd-password')) f('pd-password').value = '';
        openDetails();
      } catch {
        alert('Unable to load your details');
      }
    });
  }
  const saveDetailsBtn = document.getElementById('details-save');
  if (saveDetailsBtn) {
    saveDetailsBtn.addEventListener('click', async () => {
      try {
        const orig = (() => { try { return JSON.parse(detailsModal.dataset.original || '{}'); } catch { return {}; } })();
        const first = (document.getElementById('pd-first').value || '').trim();
        const last = (document.getElementById('pd-last').value || '').trim();
        const email = (document.getElementById('pd-email').value || '').trim();
        const phone = (document.getElementById('pd-phone').value || '').trim();
        const newPwd = (document.getElementById('pd-password').value || '').trim();
        if (!first || !last || !email) { alert('First name, last name and email are required'); return; }
        const payload = {
          employee_id: user.employee_id,
          first_name: first,
          last_name: last,
          email: email,
          phone: phone,
          department: orig.department || '',
          position: orig.position || 'employee',
          basic_salary: orig.basic_salary != null ? orig.basic_salary : 0,
          date_hired: orig.date_hired || '',
          status: orig.status || 'active'
        };
        if (newPwd) payload.hr_password = newPwd;
        const fd = new FormData();
        fd.append('operation', 'updateEmployee');
        fd.append('json', JSON.stringify(payload));
        const response = await axios.post(`${baseApiUrl}/employees.php`, fd);
        
        // Close modal and show success message
        closeDetails();
        alert('Your details have been updated');
        
        // Update the user object with new information from the response
        if (response.data && response.data.success) {
          // Sync user object with updated information from API
          if (response.data.updated_user) {
            user.user_id = response.data.updated_user.user_id;
            user.username = response.data.updated_user.username;
            user.role = response.data.updated_user.role;
            user.employee_id = response.data.updated_user.employee_id;
          }
          
          // Sync employee information
          if (response.data.updated_employee) {
            user.first_name = response.data.updated_employee.first_name;
            user.last_name = response.data.updated_employee.last_name;
            user.email = response.data.updated_employee.email;
            user.phone = response.data.updated_employee.phone;
            user.department = response.data.updated_employee.department;
            user.position = response.data.updated_employee.position;
          }
          
          // Update session storage to persist the changes
          try {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
          } catch (e) {
            console.log('Could not update session storage');
          }
        }
        
        // Automatically refresh the dashboard to show updated information
        await render(user);
        
        // Add background notification about profile update
        addEmployeeNotification(user, 'Profile updated successfully - Your personal details have been updated');
        
        // Show toast notification
        showToast('Profile updated successfully!', 'success');
        
      } catch (error) {
        console.error('Update failed:', error);
        alert('Failed to update details');
      }
    });
  }

  // Wire notifications add button
  const notifAddBtn = document.getElementById('notif-add');
  if (notifAddBtn) {
    notifAddBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const input = document.getElementById('notif-input');
      const text = (input && input.value ? input.value : '').trim();
      if (!text) return;
      addEmployeeNotification(user, text);
      if (input) input.value = '';
      await renderNotifications(user);
    });
  }

  // Wire refresh notifications button
  const refreshBtn = document.getElementById('refresh-notifs');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await renderNotifications(user);
      showToast('Notifications refreshed!', 'success');
    });
  }

  // Header notifications setup
  initHeaderNotifications(user);
}

async function renderTodayAttendance(user){
  const el = document.getElementById('today-att');
  try {
    const today = new Date().toISOString().slice(0,10);
    const res = await axios.get(`${baseApiUrl}/attendance.php`, { params: { operation: 'getAttendance', start_date: today, end_date: today } });
    const rows = (res.data || []).filter(r => String(r.employee_id) === String(user.employee_id));
    if (!rows.length){ el.textContent = 'No record today'; return; }
    const r = rows[0];
    el.textContent = `Status: ${r.status} ${r.time_in ? `— Clocked in at ${r.time_in}` : ''}`;
  } catch { el.textContent = 'Unable to load'; }
}

async function renderAttendanceSummary(user){
  const el = document.getElementById('att-summary');
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const end = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
    const res = await axios.get(`${baseApiUrl}/attendance.php`, { params: { operation: 'getAttendance', start_date: start, end_date: end } });
    const rows = (res.data || []).filter(r => String(r.employee_id) === String(user.employee_id));
    const stats = { present: 0, absent: 0, leave: 0 };
    rows.forEach(r => { stats[r.status] = (stats[r.status]||0)+1; });
    el.innerHTML = `
      <li>Days Present: <strong>${stats.present||0}</strong></li>
      <li>Days Absent: <strong>${stats.absent||0}</strong></li>
      <li>On Leave: <strong>${stats.leave||0}</strong></li>`;
  } catch { el.innerHTML = '<li>Error loading summary</li>'; }
}

async function renderPayslips(user){
  const el = document.getElementById('payslips');
  try {
    const res = await axios.get(`${baseApiUrl}/payroll.php`, { params: { operation: 'getPayrolls', employee_id: user.employee_id } });
    const rows = res.data || [];
    if (!rows.length){ el.textContent = 'No payslips yet'; return; }
    el.innerHTML = `<div class="divide-y">${rows.map(p => `
      <div class="flex items-center justify-between py-2">
        <div>${p.payroll_period_start} → ${p.payroll_period_end}</div>
        <div class="flex items-center gap-3">
          <span class="font-medium">${Number(p.net_pay||0).toFixed(2)}</span>
          <a class="text-primary-700 hover:underline" href="#" onclick="event.preventDefault()">Download</a>
        </div>
      </div>`).join('')}</div>`;
  } catch { el.textContent = 'Unable to load'; }
}

async function renderLeaves(user){
  const el = document.getElementById('leave-list');
  try {
    const res = await axios.get(`${baseApiUrl}/leaves.php`, { params: { operation: 'listByEmployee', employee_id: user.employee_id } });
    const rows = res.data || [];
    const balances = { vacation: 0, sick: 0, emergency: 0 };
    const balEl = document.createElement('div');
    balEl.className = 'mb-2 text-sm';
    balEl.textContent = `Balances — Vacation: ${balances.vacation}, Sick: ${balances.sick}, Emergency: ${balances.emergency}`;
    const list = document.createElement('div');
    list.innerHTML = rows.length ? rows.map(l => `
      <div class="flex items-center justify-between py-2 border-b last:border-b-0">
        <div>
          <div>${l.start_date} → ${l.end_date}</div>
          ${l.status === 'approved' && l.approved_by_username ? `<div class=\"text-xs text-green-700\">Approved by ${l.approved_by_username}</div>` : ''}
          ${l.status === 'rejected' && l.rejected_by_username ? `<div class=\"text-xs text-red-700\">Rejected by ${l.rejected_by_username}</div>` : ''}
        </div>
        <div class="text-sm">${l.status}</div>
      </div>`).join('') : '<div class="text-sm text-gray-500">No leave requests</div>';
    el.innerHTML = '';
    el.appendChild(balEl);
    el.appendChild(list);
  } catch { el.textContent = 'Unable to load'; }
}

async function renderNotifications(user){
  const el = document.getElementById('emp-notifs');
  const countEl = document.getElementById('notif-count');
  if (!el) return;
  
  try {
    // Fetch notifications from database
    const response = await axios.get(`${baseApiUrl}/notifications.php`, { 
      params: { operation: 'getNotifications' },
      withCredentials: true 
    });
    
    let notifications = [];
    if (response.data && response.data.success) {
      notifications = response.data.notifications || [];
    }
    
    // If no notifications, show helpful tips
    if (notifications.length === 0) {
      el.innerHTML = `
        <li class="text-sm text-gray-500 italic">No notifications yet</li>
        <li class="text-sm text-gray-500 italic">• Reminder: Please clock in before 9:00 AM</li>
        <li class="text-sm text-gray-500 italic">• Tip: You can file a leave request from the dashboard</li>
      `;
      countEl.classList.add('hidden');
      return;
    }
    
    el.innerHTML = notifications.map(n => `
      <li class="flex items-start justify-between gap-3 py-1 ${n.read_at ? 'opacity-75' : ''}">
        <div class="flex-1">
          <span class="${n.read_at ? 'text-gray-500' : 'text-gray-800 font-medium'}">${escapeHtml(n.message)}</span>
          <div class="text-xs text-gray-400">${formatTime(n.created_at)}</div>
          ${n.type ? `<div class="text-xs text-blue-600">${n.type}</div>` : ''}
        </div>
        <div class="flex items-center gap-2 text-xs">
          ${!n.read_at ? 
            `<button class="px-2 py-1 rounded border border-primary-600 text-primary-700" data-action="mark-read" data-id="${n.id}">Mark Read</button>` : 
            `<button class="px-2 py-1 rounded border text-gray-600" data-action="mark-unread" data-id="${n.id}">Mark Unread</button>`
          }
          <button class="px-2 py-1 rounded border border-red-600 text-red-700" data-action="delete" data-id="${n.id}">Delete</button>
        </div>
      </li>`).join('');

    // Wire item actions
    el.querySelectorAll('[data-action="mark-read"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await markNotificationAsRead(id);
        await renderNotifications(user);
      });
    });
    
    el.querySelectorAll('[data-action="mark-unread"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await markNotificationAsUnread(id);
        await renderNotifications(user);
      });
    });
    
    el.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await deleteNotification(id);
        await renderNotifications(user);
      });
    });
    
    // Update notification count badge
    countEl.textContent = notifications.filter(n => !n.read_at).length;
    countEl.classList.remove('hidden');
    
  } catch (error) {
    console.error('Failed to load notifications:', error);
    el.innerHTML = '<li class="text-sm text-red-500">Failed to load notifications</li>';
    countEl.classList.add('hidden');
  }
}

async function renderHeaderNotifications(user){
  const badge = document.getElementById('notif-badge');
  const listEl = document.getElementById('notif-list');
  if (!badge || !listEl) return;
  try {
    const response = await axios.get(`${baseApiUrl}/notifications.php`, {
      params: { operation: 'getNotifications' },
      withCredentials: true
    });
    const notifications = (response.data && response.data.success) ? (response.data.notifications || []) : [];
    const unread = notifications.filter(n => !n.read_at).length;
    if (unread > 0) {
      badge.textContent = unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    listEl.innerHTML = notifications.length ? notifications.map(n => `
      <div class="px-4 py-2 border-t first:border-t-0 ${n.read_at ? 'opacity-75' : ''}">
        <div class="text-sm ${n.read_at ? 'text-gray-600' : 'text-gray-800 font-medium'}">${escapeHtml(n.message)}</div>
        <div class="text-xs text-gray-400 mt-0.5">${formatTime(n.created_at)}</div>
        <div class="mt-2 text-xs">
          ${!n.read_at ? `<button data-action="mark-read" data-id="${n.id}" class="px-2 py-1 rounded border border-primary-600 text-primary-700">Mark read</button>` : ''}
        </div>
      </div>
    `).join('') : '<div class="px-4 py-6 text-sm text-gray-500 text-center">No notifications</div>';

    listEl.querySelectorAll('[data-action="mark-read"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await markNotificationAsRead(id);
        await renderHeaderNotifications(user);
        await renderNotifications(user);
      });
    });
  } catch (e) {
    // silently ignore for header
  }
}

function initHeaderNotifications(user){
  if (window.__notifHeaderWired) return;
  window.__notifHeaderWired = true;
  const toggle = document.getElementById('notif-toggle');
  const dropdown = document.getElementById('notif-dropdown');
  const closeBtn = document.getElementById('notif-close');
  const markAllBtn = document.getElementById('notif-mark-all');
  if (!toggle || !dropdown) return;
  const close = () => dropdown.classList.add('hidden');
  toggle.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      await renderHeaderNotifications(user);
    }
  });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !toggle.contains(e.target)) close();
  });
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const response = await axios.get(`${baseApiUrl}/notifications.php`, { params: { operation: 'getNotifications' }, withCredentials: true });
        const notifications = (response.data && response.data.success) ? (response.data.notifications || []) : [];
        const unread = notifications.filter(n => !n.read_at);
        await Promise.all(unread.map(n => markNotificationAsRead(n.id)));
        await Promise.all([
          renderHeaderNotifications(user),
          renderNotifications(user)
        ]);
      } catch {}
    });
  }
}

function addEmployeeNotification(user, text){
  const employeeId = user && user.employee_id ? user.employee_id : null;
  if (!employeeId) return;
  const list = loadEmployeeNotifications(employeeId);
  list.unshift({ id: String(Date.now()), text, created_at: new Date().toISOString(), read: false });
  saveEmployeeNotifications(employeeId, list);
}

function toggleEmployeeNotificationRead(employeeId, id){
  const list = loadEmployeeNotifications(employeeId);
  const idx = list.findIndex(n => String(n.id) === String(id));
  if (idx >= 0) { list[idx].read = !list[idx].read; }
  saveEmployeeNotifications(employeeId, list);
}

function deleteEmployeeNotification(employeeId, id){
  const list = loadEmployeeNotifications(employeeId).filter(n => String(n.id) !== String(id));
  saveEmployeeNotifications(employeeId, list);
}

function loadEmployeeNotifications(employeeId){
  const key = notifStorageKey(employeeId);
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function saveEmployeeNotifications(employeeId, list){
  const key = notifStorageKey(employeeId);
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

function notifStorageKey(employeeId){
  return `intro_emp_notifs_${employeeId}`;
}

function formatTime(iso){
  try { const d = new Date(iso); return d.toLocaleString(); } catch { return ''; }
}

// Toast notification system
function showToast(message, type = 'info') {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-full`;
  
  // Set color based on type
  switch(type) {
    case 'success':
      toast.style.backgroundColor = '#10B981'; // green
      break;
    case 'error':
      toast.style.backgroundColor = '#EF4444'; // red
      break;
    case 'warning':
      toast.style.backgroundColor = '#F59E0B'; // yellow
      break;
    default:
      toast.style.backgroundColor = '#3B82F6'; // blue
  }
  
  toast.textContent = message;
  
  // Add to body
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 100);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 4000);
  
  // Click to dismiss
  toast.addEventListener('click', () => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  });
}

// Notification management functions
async function markNotificationAsRead(notificationId) {
  try {
    const fd = new FormData();
    fd.append('operation', 'markAsRead');
    fd.append('json', JSON.stringify({ notification_id: notificationId }));
    
    await axios.post(`${baseApiUrl}/notifications.php`, fd, { withCredentials: true });
    return true;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    showToast('Failed to mark notification as read', 'error');
    return false;
  }
}

async function markNotificationAsUnread(notificationId) {
  try {
    // For now, we'll just delete and recreate the notification without read_at
    // In a real implementation, you'd want to add an unread operation to the API
    showToast('Marking as unread is not yet implemented', 'warning');
    return false;
  } catch (error) {
    console.error('Failed to mark notification as unread:', error);
    return false;
  }
}

async function deleteNotification(notificationId) {
  try {
    const fd = new FormData();
    fd.append('operation', 'deleteNotification');
    fd.append('json', JSON.stringify({ notification_id: notificationId }));
    
    await axios.post(`${baseApiUrl}/notifications.php`, fd, { withCredentials: true });
    showToast('Notification deleted', 'success');
    return true;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    showToast('Failed to delete notification', 'error');
    return false;
  }
}

function escapeHtml(text){
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


