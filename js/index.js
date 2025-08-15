const baseApiUrl = `${location.origin}/intro/api`;
window.baseApiUrl = baseApiUrl;

const routes = {
  dashboard: async () => {
    const app = document.getElementById("app");
    app.innerHTML = `
      <section class="mb-6">
        <div class="sticky top-0 z-10 relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-700 to-primary-600 text-white shadow">
          <div class="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10"></div>
          <div class="p-6 flex items-center justify-between relative">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-white">
                  <path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5z"/>
                </svg>
              </div>
              <div>
                <h1 class="text-2xl font-semibold">Welcome, <span id="welcome-name">Admin</span></h1>
                <div class="mt-1 text-white/90 text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M12 8a1 1 0 011 1v3h3a1 1 0 110 2h-4a1 1 0 01-1-1V9a1 1 0 011-1z"/><path fill-rule="evenodd" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-18a8 8 0 100 16 8 8 0 000-16z" clip-rule="evenodd"/></svg>
                  <span id="welcome-date"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4" id="summary-cards-top"></section>
      <section class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6" id="summary-cards-bottom"></section>
      
      <!-- Graphs Section -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Attendance Trend (Last 7 Days)</h3>
            <a href="#attendance" class="text-primary-700 text-sm hover:underline">View Details</a>
          </div>
          <div class="h-64">
            <canvas id="attendanceChart"></canvas>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Payroll Expense Trend (Monthly)</h3>
            <a href="#payroll" class="text-primary-700 text-sm hover:underline">View Details</a>
          </div>
          <div class="h-64">
            <canvas id="payrollTrendChart"></canvas>
          </div>
        </div>
      </section>
      
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4" id="attendance-snapshot">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Recent Attendance Logs</h3>
            <a href="#attendance" class="text-primary-700 text-sm hover:underline">Manage</a>
          </div>
          <div id="attendance-table" class="overflow-x-auto"></div>
        </div>
        <div class="bg-white rounded-lg shadow p-4" id="leave-requests">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Pending Leave Approvals</h3>
          </div>
          <div id="leaves-table" class="overflow-x-auto"></div>
        </div>
      </section>
      <section class="grid grid-cols-1 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4" id="notifications">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Notifications</h3>
          </div>
          <ul id="admin-notif-list" class="space-y-2"></ul>
        </div>
      </section>`;

    await renderSummaryCards();
    await renderAttendanceSnapshot();
    await renderLeaves();
    renderNotifications();
    
    // Welcome header content
    try {
      const me = await getCurrentUser();
      const welcomeNameEl = document.getElementById('welcome-name');
      if (welcomeNameEl && me) {
        const displayName = (() => {
          const first = (me.first_name || '').trim();
          const last = (me.last_name || '').trim();
          if (first || last) return `${first}${first && last ? ' ' : ''}${last}`.trim();
          const u = (me.username || '').trim();
          if (u.includes('@')) return u.split('@')[0];
          return u || 'Admin';
        })();
        welcomeNameEl.textContent = displayName;
      }
    } catch {}
    const dateEl = document.getElementById('welcome-date');
    if (dateEl) {
      if (window.__welcomeInterval) { try { clearInterval(window.__welcomeInterval); } catch {} }
      const tick = () => {
        const now = new Date();
        dateEl.textContent = now.toLocaleString('en-US');
      };
      tick();
      window.__welcomeInterval = setInterval(tick, 1000);
    }
    
    // Render key charts on dashboard
    await renderAttendanceChart();
    await renderPayrollTrendChart();

    // Employee view modal (lazy mount on dashboard init)
    mountEmployeeViewModal();

    async function renderSummaryCards(){
      const [summaryRes, payrollRes] = await Promise.all([
        axios.get(`${window.baseApiUrl}/reports.php`, { params: { operation: 'dashboardSummary' } }),
        axios.get(`${window.baseApiUrl}/reports.php`, { params: { operation: 'payrollSummary' } })
      ]);
      const s = summaryRes.data || { total_employees: 0, present_today: 0, pending_leaves: 0 };
      const p = payrollRes.data || { total_net_pay: 0 };
      const absentToday = Math.max(0, Number(s.total_employees || 0) - Number(s.present_today || 0));
      const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const topCards = [
        { label: 'Total Employees', value: s.total_employees, color: 'blue', icon: 'users' },
        { label: 'Present Today', value: s.present_today, color: 'emerald', icon: 'check' },
        { label: 'Absent Today', value: absentToday, color: 'rose', icon: 'x' }
      ];
      const bottomCards = [
        { label: 'Pending Leave Requests', value: s.pending_leaves, color: 'amber', icon: 'clock' },
        { label: 'Payroll Processed This Month', value: peso(p.total_net_pay), color: 'fuchsia', icon: 'currency' }
      ];

      

      const iconSvg = (name, cls) => {
        if (name === 'users') return `<svg class="w-5 h-5 ${cls}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 100-8 4 4 0 000 8z"/><path d="M2 20c0-3.314 4.03-6 10-6s10 2.686 10 6v1H2v-1z"/></svg>`;
        if (name === 'check') return `<svg class="w-5 h-5 ${cls}" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5a1 1 0 10-1.4 1.4l4.2 4.2a1 1 0 001.4 0l10-10a1 1 0 10-1.4-1.4L9 16.2z"/></svg>`;
        if (name === 'x') return `<svg class="w-5 h-5 ${cls}" viewBox="0 0 24 24" fill="currentColor"><path d="M6.225 4.811a1 1 0 011.414 0L12 9.172l4.361-4.361a1 1 0 111.414 1.414L13.414 10.586l4.361 4.361a1 1 0 01-1.414 1.414L12 12l-4.361 4.361a1 1 0 01-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 010-1.414z"/></svg>`;
        if (name === 'clock') return `<svg class="w-5 h-5 ${cls}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8a1 1 0 011 1v3h3a1 1 0 110 2h-4a1 1 0 01-1-1V9a1 1 0 011-1z"/><path fill-rule="evenodd" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM4 12a8 8 0 1116 0 8 8 0 01-16 0z" clip-rule="evenodd"/></svg>`;
        if (name === 'currency') return `<svg class="w-5 h-5 ${cls}" viewBox="0 0 24 24" fill="currentColor"><path d="M13 5a3 3 0 013 3h2a5 5 0 00-5-5V1h-2v2a5 5 0 000 10h2a3 3 0 110 6h-2a3 3 0 01-3-3H6a5 5 0 005 5v2h2v-2a5 5 0 000-10h-2a3 3 0 110-6h2z"/></svg>`;
        return '';
      };

      const renderCard = (c) => {
        return `
          <div class="rounded-lg bg-white shadow">
            <div class="p-4 flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">${iconSvg(c.icon, 'text-gray-600')}</div>
              <div>
                <div class="text-xs uppercase tracking-wide text-gray-500">${c.label}</div>
                <div class="text-2xl font-semibold">${c.value}</div>
              </div>
            </div>
          </div>`;
      };

      const topWrap = document.getElementById('summary-cards-top');
      const bottomWrap = document.getElementById('summary-cards-bottom');
      if (topWrap) topWrap.innerHTML = topCards.map(renderCard).join('');
      if (bottomWrap) bottomWrap.innerHTML = bottomCards.map(renderCard).join('');
    }

    async function renderAttendanceSnapshot(){
      const params = { operation: 'getAttendance', start_date: new Date().toISOString().slice(0,10), end_date: new Date().toISOString().slice(0,10) };
      const res = await axios.get(`${window.baseApiUrl}/attendance.php`, { params });
      const rows = res.data || [];
      const table = document.createElement('table');
      table.className = 'min-w-full divide-y divide-gray-200';
      table.innerHTML = `
        <thead class="bg-gray-50"><tr>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Time In</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Time Out</th>
        </tr></thead><tbody class="divide-y divide-gray-200 bg-white"></tbody>`;
      const tbody = table.querySelector('tbody');
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="px-3 py-2 text-sm">
            <button class="text-primary-700 hover:underline" data-emp-id="${r.employee_id}">${r.first_name} ${r.last_name}</button>
          </td>
          <td class="px-3 py-2 text-sm text-gray-700">${r.status}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${r.time_in || ''}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${r.time_out || ''}</td>`;
        const btn = tr.querySelector('[data-emp-id]');
        if (btn) {
          btn.addEventListener('click', async () => {
            await showEmployeeDetails(r.employee_id);
          });
        }
        tbody.appendChild(tr);
      });
      document.getElementById('attendance-table').innerHTML = '';
      document.getElementById('attendance-table').appendChild(table);
    }

    async function renderLeaves(){
      const res = await axios.get(`${window.baseApiUrl}/leaves.php`, { params: { operation: 'listPending' } });
      const rows = res.data || [];
      const table = document.createElement('table');
      table.className = 'min-w-full divide-y divide-gray-200';
      table.innerHTML = `
        <thead class="bg-gray-50"><tr>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Dates</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Actions</th>
        </tr></thead><tbody class="divide-y divide-gray-200 bg-white"></tbody>`;
      const tbody = table.querySelector('tbody');
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class=\"px-3 py-2 text-sm text-gray-700\">${r.first_name} ${r.last_name}</td>
          <td class=\"px-3 py-2 text-sm text-gray-700\">${r.start_date} → ${r.end_date}</td>
          <td class=\"px-3 py-2 text-sm\"><button data-view=\"${r.leave_id}\" class=\"px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50\">View</button></td>`;
        const viewBtn = tr.querySelector('[data-view]');
        if (viewBtn) {
          viewBtn.addEventListener('click', async () => {
            try {
              // Use available data, fallback to fetch full details if needed
              if (r && r.reason != null) {
                openLeaveView(r);
              } else {
                const res = await axios.get(`${window.baseApiUrl}/leaves.php`, { params: { operation: 'getLeave', leave_id: r.leave_id } });
                const full = res.data || r;
                openLeaveView(full);
              }
            } catch {
              try { openLeaveView(r); } catch {}
            }
          });
        }
        tbody.appendChild(tr);
      });
      const wrap = document.getElementById('leaves-table');
      wrap.innerHTML = '';
      wrap.appendChild(table);
    }

    function openLeaveView(leave){
      let modal = document.getElementById('leaveViewModal');
      if (!modal){
        modal = document.createElement('div');
        modal.id = 'leaveViewModal';
        modal.className = 'fixed inset-0 z-50 hidden';
        modal.innerHTML = `
          <div class="absolute inset-0 bg-black/50" data-close="true"></div>
          <div class="relative mx-auto mt-24 w-full max-w-lg">
            <div class="bg-white rounded-lg shadow">
              <div class="flex items-center justify-between border-b px-4 py-3"><h5 class="font-semibold">Leave Details</h5><button class="text-gray-500 text-xl" data-close="true">×</button></div>
              <div class="p-4 text-sm space-y-2">
                <div><span class="text-gray-500">Employee:</span> <span id="lv-emp"></span></div>
                <div><span class="text-gray-500">Dates:</span> <span id="lv-dates"></span></div>
                <div><span class="text-gray-500">Reason:</span> <div id="lv-reason" class="mt-1 whitespace-pre-wrap"></div></div>
                <div><span class="text-gray-500">Status:</span> <span id="lv-status"></span></div>
              </div>
              <div class="flex justify-end gap-2 border-t px-4 py-3">
                <button class="px-3 py-2 text-sm rounded border" data-close="true">Close</button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(modal);
        modal.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', () => modal.classList.add('hidden')));
      }
      modal.querySelector('#lv-emp').textContent = `${leave.first_name} ${leave.last_name}`;
      modal.querySelector('#lv-dates').textContent = `${leave.start_date} → ${leave.end_date}`;
      modal.querySelector('#lv-reason').textContent = leave.reason || '';
      modal.querySelector('#lv-status').textContent = leave.status || 'pending';
      modal.classList.remove('hidden');
    }

    async function renderPayrollStatus(){
      const res = await axios.get(`${window.baseApiUrl}/reports.php`, { params: { operation: 'payrollSummary' } });
      const data = res.data || { total_net_pay: 0, total_deductions: 0, total_overtime_pay: 0 };
      document.getElementById('payroll-summary').innerHTML = `
        <ul class="divide-y divide-gray-200">
          <li class="flex items-center justify-between py-2"><span>Total Net Pay (period)</span><strong>${Number(data.total_net_pay || 0).toFixed(2)}</strong></li>
          <li class="flex items-center justify-between py-2"><span>Total Deductions</span><strong>${Number(data.total_deductions || 0).toFixed(2)}</strong></li>
          <li class="flex items-center justify-between py-2"><span>Total Overtime Pay</span><strong>${Number(data.total_overtime_pay || 0).toFixed(2)}</strong></li>
        </ul>`;
    }

    function setupEmployeeSearch(){
      const input = document.getElementById('emp-search');
      const btn = document.getElementById('emp-search-btn');
      const results = document.getElementById('emp-search-results');
      const search = async () => {
        const q = (input.value || '').toLowerCase();
        if (!q) { results.innerHTML = ''; return; }
        const res = await axios.get(`${window.baseApiUrl}/employees.php`, { params: { operation: 'getEmployees' } });
        const employees = (res.data || []).filter(e => (`${e.first_name} ${e.last_name}`.toLowerCase().includes(q)));
        results.innerHTML = employees.slice(0,10).map(e => `
          <div class="flex items-center justify-between py-2 border-b last:border-b-0">
            <div class="text-sm text-gray-700">${e.first_name} ${e.last_name}</div>
            <a href="#employees" class="text-primary-700 text-xs hover:underline">Open</a>
          </div>`).join('');
      };
      btn.addEventListener('click', (e) => { e.preventDefault(); search(); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } });
    }

    async function renderNotifications(){
      const list = document.getElementById('admin-notif-list');
      if (!list) return;
      try {
        const response = await axios.get(`${baseApiUrl}/notifications.php`, {
          params: { operation: 'getNotifications' },
          withCredentials: true
        });
        const notifications = (response.data && response.data.success) ? (response.data.notifications || []) : [];
        if (!notifications.length){
          list.innerHTML = '<li class="text-sm text-gray-500">No notifications</li>';
          return;
        }
        list.innerHTML = notifications.map(n => `
          <li class="text-sm flex items-start justify-between gap-3 py-1 ${n.read_at ? 'opacity-75' : ''}">
            <div class="flex-1">
              <div class="${n.read_at ? 'text-gray-600' : 'text-gray-800 font-medium'}">${escapeHtml(n.message)}</div>
              <div class="text-xs text-gray-400 mt-0.5">${formatTime(n.created_at)}</div>
            </div>
            <div class="flex items-center gap-2 text-xs whitespace-nowrap">
              ${!n.read_at ? `<button data-action="mark-read" data-id="${n.id}" class="px-2 py-1 rounded border border-primary-600 text-primary-700">Mark Read</button>` : ''}
              <button data-action="delete" data-id="${n.id}" class="px-2 py-1 rounded border border-red-600 text-red-700">Delete</button>
            </div>
          </li>
        `).join('');

        list.querySelectorAll('[data-action="mark-read"]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await markNotificationAsRead(id);
            await renderNotifications();
          });
        });
        list.querySelectorAll('[data-action="delete"]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await deleteNotification(id);
            await renderNotifications();
          });
        });
      } catch {
        list.innerHTML = '<li class="text-sm text-red-500">Failed to load notifications</li>';
      }
    }

    function mountEmployeeViewModal(){
      if (document.getElementById('empViewModal')) return;
      const modal = document.createElement('div');
      modal.id = 'empViewModal';
      modal.className = 'fixed inset-0 z-50 hidden';
      modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50" data-close="true"></div>
        <div class="relative mx-auto mt-20 w-full max-w-xl">
          <div class="bg-white rounded-lg shadow">
            <div class="flex items-center justify-between border-b px-4 py-3">
              <h5 class="font-semibold">Employee Details</h5>
              <button class="text-gray-500 hover:text-gray-700 text-xl leading-none" data-close="true">×</button>
            </div>
            <div id="empViewBody" class="p-4 text-sm text-gray-700"></div>
            <div class="flex justify-end gap-2 border-t px-4 py-3">
              <a href="#employees" class="px-3 py-2 text-sm rounded border">Open Employees</a>
              <button class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700" data-close="true">Close</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', () => modal.classList.add('hidden')));
    }

    async function showEmployeeDetails(employeeId){
      const res = await axios.get(`${window.baseApiUrl}/employees.php`, {
        params: { operation: 'getEmployee', employee_id: employeeId }
      });
      const e = res.data || {};
      const body = document.getElementById('empViewBody');
      body.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="text-gray-500">Name</div>
            <div class="font-medium">${e.first_name || ''} ${e.last_name || ''}</div>
          </div>
          <div>
            <div class="text-gray-500">Status</div>
            <div class="font-medium">${e.status || ''}</div>
          </div>
          <div>
            <div class="text-gray-500">Email</div>
            <div class="font-medium">${e.email || ''}</div>
          </div>
          <div>
            <div class="text-gray-500">Phone</div>
            <div class="font-medium">${e.phone || ''}</div>
          </div>
          <div>
            <div class="text-gray-500">Department</div>
            <div class="font-medium">${e.department || ''}</div>
          </div>
          <div>
            <div class="text-gray-500">Position</div>
            <div class="font-medium">${e.position || ''}</div>
          </div>
          <div>
            <div class="text-gray-500">Basic Salary</div>
            <div class="font-medium">${e.basic_salary != null ? Number(e.basic_salary).toFixed(2) : ''}</div>
          </div>
          <div>
            <div class="text-gray-500">Date Hired</div>
            <div class="font-medium">${e.date_hired || ''}</div>
          </div>
        </div>`;
      const modal = document.getElementById('empViewModal');
      modal.classList.remove('hidden');
    }

    // Notifications (header) for admin
    async function renderHeaderNotifications(){
      const badge = document.getElementById('notif-badge');
      const listEl = document.getElementById('admin-notif-dropdown-list');
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
            await renderHeaderNotifications();
          });
        });
      } catch (e) {}
    }

    function initHeaderNotifications(){
      if (window.__adminNotifHeaderWired) return;
      window.__adminNotifHeaderWired = true;
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
          await renderHeaderNotifications();
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
            await renderHeaderNotifications();
          } catch {}
        });
      }
    }

    // Wire admin header notifications after initial render
    initHeaderNotifications();
    // Auto refresh badge every 30s
    setInterval(renderHeaderNotifications, 30000);
    // initial load
    renderHeaderNotifications();
  },
  employees: async () => {
    const module = await import('./modules/employees.js');
    await module.render();
  },
  attendance: async () => {
    const module = await import('./modules/attendance.js');
    await module.render();
  },
  payroll: async () => {
    const module = await import('./modules/payroll.js');
    await module.render();
  },
  reports: async () => {
    const module = await import('./modules/reports.js');
    await module.render();
  },
  settings: async () => {
    const module = await import('./modules/settings.js');
    await module.render();
  },
  LeaveRequests: async () => {
    const module = await import('./modules/leaves.js');
    await module.render();
  },
};

function handleRoute() {
  const hash = location.hash.replace('#', '') || 'dashboard';
  const route = routes[hash] || routes.dashboard;
  route();
}

window.addEventListener('hashchange', handleRoute);
document.addEventListener('DOMContentLoaded', async () => {
  // Determine if this is a cold start (first tab after all tabs were closed)
  const sessionKey = 'introAppAlive';
  const isFirstLoadInThisTab = !sessionStorage.getItem(sessionKey);
  if (isFirstLoadInThisTab) sessionStorage.setItem(sessionKey, '1');
  const prevOpenTabs = Number(localStorage.getItem('introOpenTabs') || '0');
  localStorage.setItem('introOpenTabs', String(prevOpenTabs + 1));
  window.addEventListener('unload', () => {
    const n = Number(localStorage.getItem('introOpenTabs') || '1');
    localStorage.setItem('introOpenTabs', String(Math.max(0, n - 1)));
  });

  // Skip cold-start logout if we just logged in via login page redirect
  const justLoggedIn = sessionStorage.getItem('introJustLoggedIn') === '1';
  if (justLoggedIn) {
    try { sessionStorage.removeItem('introJustLoggedIn'); } catch {}
  }

  // If this is a true cold start AND user was authenticated, force logout (unless just logged in)
  if (!justLoggedIn && isFirstLoadInThisTab && prevOpenTabs === 0) {
    try {
      const meCheck = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
      if (meCheck.data && meCheck.data.authenticated) {
        try { await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'logout' }, withCredentials: true }); } catch {}
        location.href = './login.html';
        return;
      }
    } catch {}
  }

  const me = await getCurrentUser();
  if (!me) {
    location.href = './login.html';
    return;
  }
  if (me.role === 'hr') {
    location.href = './hr.html#dashboard';
    return;
  }
  // If employee logs in here, route them to employee dashboard
  if (me.role === 'employee' || me.role === 'manager') {
    location.href = './employee.html';
    return;
  }
  await fillProfile();
  wireLogout();
  handleRoute();
});

async function isAuthenticated(){
  try {
    const res = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
    return !!(res.data && res.data.authenticated);
  } catch { return false; }
}

function wireLogout(){
  const btn = document.getElementById('btn-logout');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'logout' }, withCredentials: true });
    } catch {}
    location.href = './login.html';
  });
}

// Header profile dropdown
document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.getElementById('profile-trigger');
  const menu = document.getElementById('profile-menu');
  const headerLogout = document.getElementById('header-logout');
  if (trigger && menu){
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      menu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('hidden')){
        const within = trigger.contains(e.target) || menu.contains(e.target);
        if (!within) menu.classList.add('hidden');
      }
    });
  }
  if (headerLogout){
    headerLogout.addEventListener('click', async () => {
    try {
      await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'logout' }, withCredentials: true });
    } catch {}
    location.href = './login.html';
    });
  }
});

async function fillProfile(){
  try {
    const res = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
    const user = res.data && res.data.user ? res.data.user : { username: 'Admin', role: 'admin' };
    const nameEl = document.getElementById('profile-name');
    const roleEl = document.getElementById('profile-role');
    const avatarEl = document.getElementById('profile-avatar');
    const displayName = (() => {
      const first = (user.first_name || '').trim();
      const last = (user.last_name || '').trim();
      if (first || last) return `${first}${first && last ? ' ' : ''}${last}`.trim();
      const u = (user.username || '').trim();
      if (u.includes('@')) return u.split('@')[0];
      return u || 'Admin';
    })();
    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = user.role || 'admin';
    if (avatarEl) avatarEl.textContent = (displayName || 'A').substring(0,1).toUpperCase();
  } catch {}
}

async function getCurrentUser(){
  try {
    const res = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
    return res.data && res.data.user ? res.data.user : null;
  } catch { return null; }
}

// Chart rendering functions
async function renderAttendanceChart() {
  try {
    const res = await axios.get(`${window.baseApiUrl}/reports.php`, { 
      params: { operation: 'attendanceOverview', period: 'week' } 
    });
    const data = res.data || { labels: [], present: [], late: [], absent: [], onLeave: [] };
    
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Present',
            data: data.present || [25, 24, 26, 23, 25, 0, 0],
            backgroundColor: '#10b981',
            borderColor: '#059669',
            borderWidth: 1
          },
          {
            label: 'Late',
            data: data.late || [3, 2, 1, 4, 2, 0, 0],
            backgroundColor: '#f59e0b',
            borderColor: '#d97706',
            borderWidth: 1
          },
          {
            label: 'Absent',
            data: data.absent || [2, 4, 3, 3, 3, 0, 0],
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            borderWidth: 1
          },
          {
            label: 'On Leave',
            data: data.onLeave || [1, 1, 1, 1, 1, 0, 0],
            backgroundColor: '#8b5cf6',
            borderColor: '#7c3aed',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering attendance chart:', error);
  }
}

async function renderPayrollTrendChart() {
  try {
    const res = await axios.get(`${window.baseApiUrl}/reports.php`, { 
      params: { operation: 'payrollTrend', months: 6 } 
    });
    const data = res.data || { labels: [], expenses: [] };
    
    const ctx = document.getElementById('payrollTrendChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Total Payroll Expenses',
          data: data.expenses || [45000, 48000, 52000, 49000, 55000, 58000],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering payroll trend chart:', error);
  }
}

async function renderOvertimeChart() {
  try {
    const res = await axios.get(`${window.baseApiUrl}/reports.php`, { 
      params: { operation: 'overtimeDistribution' } 
    });
    const data = res.data || { labels: [], hours: [] };
    
    const ctx = document.getElementById('overtimeChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels || ['IT', 'HR', 'Finance', 'Operations', 'Sales'],
        datasets: [{
          data: data.hours || [45, 32, 28, 38, 25],
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering overtime chart:', error);
  }
}

async function renderLeaveTypeChart() {
  try {
    const res = await axios.get(`${window.baseApiUrl}/reports.php`, { 
      params: { operation: 'leaveTypeDistribution' } 
    });
    const data = res.data || { labels: [], counts: [] };
    
    const ctx = document.getElementById('leaveTypeChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.labels || ['Vacation', 'Sick Leave', 'Emergency', 'Personal', 'Other'],
        datasets: [{
          data: data.counts || [15, 8, 3, 5, 2],
          backgroundColor: [
            '#10b981',
            '#ef4444',
            '#f59e0b',
            '#3b82f6',
            '#8b5cf6'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering leave type chart:', error);
  }
}

async function renderDeductionsChart() {
  try {
    const res = await axios.get(`${window.baseApiUrl}/reports.php`, { 
      params: { operation: 'deductionsBreakdown' } 
    });
    const data = res.data || { labels: [], amounts: [] };
    
    const ctx = document.getElementById('deductionsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels || ['SSS', 'PhilHealth', 'Pag-IBIG', 'Tax', 'Other'],
        datasets: [{
          label: 'Deduction Amount',
          data: data.amounts || [2500, 1200, 800, 3500, 500],
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6'
          ],
          borderColor: [
            '#2563eb',
            '#059669',
            '#d97706',
            '#dc2626',
            '#7c3aed'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering deductions chart:', error);
  }
}

async function renderEmployeeCountChart() {
  try {
    const res = await axios.get(`${window.baseApiUrl}/reports.php`, { 
      params: { operation: 'employeeCountTrend', months: 12 } 
    });
    const data = res.data || { labels: [], counts: [] };
    
    const ctx = document.getElementById('employeeCountChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Total Employees',
          data: data.counts || [25, 26, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 5
            }
          }
        },
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering employee count chart:', error);
  }
}


function formatTime(iso){
  try { const d = new Date(iso); return d.toLocaleString(); } catch { return ''; }
}

function escapeHtml(text){
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function markNotificationAsRead(notificationId){
  try {
    const fd = new FormData();
    fd.append('operation', 'markAsRead');
    fd.append('json', JSON.stringify({ notification_id: notificationId }));
    await axios.post(`${baseApiUrl}/notifications.php`, fd, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
}

async function deleteNotification(notificationId){
  try {
    const fd = new FormData();
    fd.append('operation', 'deleteNotification');
    fd.append('json', JSON.stringify({ notification_id: notificationId }));
    await axios.post(`${baseApiUrl}/notifications.php`, fd, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
}

