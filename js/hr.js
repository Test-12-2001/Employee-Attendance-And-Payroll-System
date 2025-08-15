const baseApiUrl = `${location.origin}/intro/api`;

const routes = {
  dashboard: async () => {
    const app = document.getElementById('app');
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
                <h1 class="text-2xl font-semibold">Welcome, <span id="welcome-name">HR</span></h1>
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
      
      <!-- HR Graphs -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Attendance Rate Trend (Last 30 Days)</h3>
          </div>
          <div class="h-64">
            <canvas id="hrAttendanceTrend"></canvas>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Absence by Department</h3>
          </div>
          <div class="h-64">
            <canvas id="hrAbsenceByDept"></canvas>
          </div>
        </div>
      </section>
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4" id="attendance-snapshot">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Recent Attendance Logs</h3>
          </div>
          <div id="attendance-table" class="overflow-x-auto"></div>
        </div>
        <div class="bg-white rounded-lg shadow p-4" id="leave-requests">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Pending Leave Requests</h3>
          </div>
          <div id="leaves-table" class="overflow-x-auto"></div>
        </div>
      </section>
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4" id="payroll-status">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Payroll Status</h3>
          </div>
          <div id="payroll-summary"></div>
        </div>
      </section>`;

    await renderSummaryCards();
    await renderAttendanceSnapshot();
    await renderLeaves();
    await renderPayrollStatus();
    await renderHrAttendanceTrend();
    await renderHrAbsenceByDepartment();

    // Welcome header content
    try {
      const me = await currentUser();
      const welcomeNameEl = document.getElementById('welcome-name');
      if (welcomeNameEl && me) {
        const displayName = (() => {
          const first = (me.first_name || '').trim();
          const last = (me.last_name || '').trim();
          if (first || last) return `${first}${first && last ? ' ' : ''}${last}`.trim();
          const u = (me.username || '').trim();
          if (u.includes('@')) return u.split('@')[0];
          return u || 'HR';
        })();
        welcomeNameEl.textContent = displayName;
      }
    } catch {}
    const dateEl = document.getElementById('welcome-date');
    if (dateEl) {
      if (window.__hrWelcomeInterval) { try { clearInterval(window.__hrWelcomeInterval); } catch {} }
      const tick = () => {
        const now = new Date();
        dateEl.textContent = now.toLocaleString('en-US');
      };
      tick();
      window.__hrWelcomeInterval = setInterval(tick, 1000);
    }

    async function renderSummaryCards(){
      const [summaryRes, payrollRes] = await Promise.all([
        axios.get(`${baseApiUrl}/reports.php`, { params: { operation: 'dashboardSummary' } }),
        axios.get(`${baseApiUrl}/reports.php`, { params: { operation: 'payrollSummary' } })
      ]);
      const s = summaryRes.data || { total_employees: 0, present_today: 0, pending_leaves: 0 };
      const p = payrollRes.data || { total_net_pay: 0 };
      const absentToday = Math.max(0, Number(s.total_employees || 0) - Number(s.present_today || 0));
      const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const topCards = [
        { label: 'Total Employees', value: s.total_employees, icon: 'users' },
        { label: 'Present Today', value: s.present_today, icon: 'check' },
        { label: 'Absent Today', value: absentToday, icon: 'x' }
      ];
      const bottomCards = [
        { label: 'Pending Leave Requests', value: s.pending_leaves, icon: 'clock' },
        { label: 'Payroll Processed This Month', value: peso(p.total_net_pay), icon: 'currency' }
      ];

      const iconSvg = (name) => {
        if (name === 'users') return `<svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 100-8 4 4 0 000 8z"/><path d="M2 20c0-3.314 4.03-6 10-6s10 2.686 10 6v1H2v-1z"/></svg>`;
        if (name === 'check') return `<svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5a1 1 0 10-1.4 1.4l4.2 4.2a1 1 0 001.4 0l10-10a1 1 0 10-1.4-1.4L9 16.2z"/></svg>`;
        if (name === 'x') return `<svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M6.225 4.811a1 1 0 011.414 0L12 9.172l4.361-4.361a1 1 0 111.414 1.414L13.414 10.586l4.361 4.361a1 1 0 01-1.414 1.414L12 12l-4.361 4.361a1 1 0 01-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 010-1.414z"/></svg>`;
        if (name === 'clock') return `<svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8a1 1 0 011 1v3h3a1 1 0 110 2h-4a1 1 0 01-1-1V9a1 1 0 011-1z"/><path fill-rule="evenodd" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM4 12a8 8 0 1116 0 8 8 0 01-16 0z" clip-rule="evenodd"/></svg>`;
        if (name === 'currency') return `<svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M13 5a3 3 0 013 3h2a5 5 0 00-5-5V1h-2v2a5 5 0 000 10h2a3 3 0 110 6h-2a3 3 0 01-3-3H6a5 5 0 005 5v2h2v-2a5 5 0 000-10h-2a3 3 0 110-6h2z"/></svg>`;
        return '';
      };

      const renderCard = (c) => {
        return `
          <div class="rounded-lg bg-white shadow">
            <div class="p-4 flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">${iconSvg(c.icon)}</div>
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

    // Removed HR-specific employee counters in favor of unified dashboard metrics

    async function renderAttendanceSnapshot(){
      const params = { operation: 'getAttendance', start_date: new Date().toISOString().slice(0,10), end_date: new Date().toISOString().slice(0,10) };
      const res = await axios.get(`${baseApiUrl}/attendance.php`, { params });
      const rows = res.data || [];
      const table = document.createElement('table');
      table.className = 'min-w-full divide-y divide-gray-200';
      table.innerHTML = `
        <thead class="bg-gray-50"><tr>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Department</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Time In</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Time Out</th>
        </tr></thead><tbody class="divide-y divide-gray-200 bg-white"></tbody>`;
      const tbody = table.querySelector('tbody');
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="px-3 py-2 text-sm text-gray-700">${r.first_name} ${r.last_name}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${r.department || ''}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${r.status}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${r.time_in || ''}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${r.time_out || ''}</td>`;
        tbody.appendChild(tr);
      });
      document.getElementById('attendance-table').innerHTML = '';
      document.getElementById('attendance-table').appendChild(table);
    }

    async function renderLeaves(){
      const res = await axios.get(`${baseApiUrl}/leaves.php`, { params: { operation: 'listPending' } });
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
          <td class="px-3 py-2 text-sm text-gray-700">${r.first_name} ${r.last_name}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${r.start_date} → ${r.end_date}</td>
          <td class="px-3 py-2 text-sm">
            <button data-view="${r.leave_id}" class="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50">View</button>
          </td>`;
        tbody.appendChild(tr);
      });
      const wrap = document.getElementById('leaves-table');
      wrap.innerHTML = '';
      wrap.appendChild(table);

      tbody.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-view');
        try {
          const lr = rows.find(x => String(x.leave_id) === String(id));
          if (lr) {
            openLeaveView(lr);
          } else {
            // Fallback fetch
            const res = await axios.get(`${baseApiUrl}/leaves.php`, { params: { operation: 'getLeave', leave_id: id } });
            const leave = res.data || {};
            openLeaveView(leave);
          }
        } catch {}
      }));
    }

    async function renderHrAttendanceTrend(){
      try {
        const res = await axios.get(`${baseApiUrl}/reports.php`, { params: { operation: 'attendanceOverview', period: 'month' } });
        const data = res.data || { labels: [], present: [], absent: [], onLeave: [] };
        const labels = data.labels || [];
        const totalPerDay = labels.map((_, i) => (data.present[i] || 0) + (data.absent[i] || 0) + (data.onLeave[i] || 0));
        const rate = labels.map((_, i) => {
          const t = totalPerDay[i] || 0;
          return t > 0 ? Math.round(((data.present[i] || 0) / t) * 100) : 0;
        });
        const ctx = document.getElementById('hrAttendanceTrend');
        if (!ctx) return;
        new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Attendance Rate %',
              data: rate,
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
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } } },
            plugins: { legend: { position: 'top' } }
          }
        });
      } catch {}
    }

    async function renderHrAbsenceByDepartment(){
      try {
        const res = await axios.get(`${baseApiUrl}/reports.php`, { params: { operation: 'absenceByDepartment', days: 30 } });
        const data = res.data || { labels: [], counts: [] };
        const ctx = document.getElementById('hrAbsenceByDept');
        if (!ctx) return;
        new Chart(ctx, {
          type: 'pie',
          data: {
            labels: data.labels || [],
            datasets: [{
              data: data.counts || [],
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            onClick: async (evt, elements) => {
              if (!elements || !elements.length) return;
              const idx = elements[0].index;
              const label = (data.labels || [])[idx];
              if (label) {
                await openAbsenceDeptDetails(label);
              }
            }
          }
        });
      } catch {}
    }

    function ensureAbsenceDeptModal(){
      if (document.getElementById('absenceDeptModal')) return;
      const modal = document.createElement('div');
      modal.id = 'absenceDeptModal';
      modal.className = 'fixed inset-0 z-50 hidden';
      modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50" data-close="true"></div>
        <div class="relative mx-auto mt-20 w-full max-w-2xl">
          <div class="bg-white rounded-lg shadow">
            <div class="flex items-center justify-between border-b px-4 py-3">
              <h5 id="absenceDeptTitle" class="font-semibold">Absences</h5>
              <button class="text-gray-500 hover:text-gray-700 text-xl leading-none" data-close="true">×</button>
            </div>
            <div id="absenceDeptBody" class="p-4 text-sm text-gray-700"></div>
            <div class="flex justify-end gap-2 border-t px-4 py-3">
              <button class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700" data-close="true">Close</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', () => modal.classList.add('hidden')));
    }

    async function openAbsenceDeptDetails(department){
      ensureAbsenceDeptModal();
      const modal = document.getElementById('absenceDeptModal');
      const title = document.getElementById('absenceDeptTitle');
      const body = document.getElementById('absenceDeptBody');
      if (!modal || !body) return;
      if (title) title.textContent = `Absences — ${department}`;
      body.innerHTML = '<div class="text-gray-500">Loading...</div>';
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 29);
        const startStr = start.toISOString().slice(0,10);
        const endStr = end.toISOString().slice(0,10);
        const params = { operation: 'getAttendance', start_date: startStr, end_date: endStr };
        const res = await axios.get(`${baseApiUrl}/attendance.php`, { params });
        const rows = Array.isArray(res.data) ? res.data : [];
        const deptLc = (department || '').toLowerCase();
        const filtered = rows.filter(r => (r.status || '').toLowerCase() === 'absent' && (r.department || '').toLowerCase() === deptLc);
        if (!filtered.length){
          body.innerHTML = '<div class="text-gray-600">No absence records found for the last 30 days.</div>';
        } else {
          const byEmp = new Map();
          filtered.forEach(r => {
            const key = String(r.employee_id || `${r.first_name}|${r.last_name}`);
            if (!byEmp.has(key)) byEmp.set(key, { name: `${r.first_name || ''} ${r.last_name || ''}`.trim(), dates: [] });
            const dateOnly = (r.date || r.created_at || r.time_in || '').toString().slice(0,10);
            const set = byEmp.get(key);
            if (dateOnly && !set.dates.includes(dateOnly)) set.dates.push(dateOnly);
          });
          const items = Array.from(byEmp.values()).map(x => ({ name: x.name, count: x.dates.length, dates: x.dates.sort() }));
          items.sort((a,b) => b.count - a.count || a.name.localeCompare(b.name));
          body.innerHTML = `
            <div class="text-xs text-gray-500 mb-2">Last 30 days</div>
            <div class="divide-y divide-gray-200">
              ${items.map(it => `
                <div class="py-2">
                  <div class="flex items-center justify-between">
                    <div class="font-medium">${it.name || 'Unknown'}</div>
                    <div class="text-gray-600">${it.count} ${it.count === 1 ? 'day' : 'days'}</div>
                  </div>
                  ${it.dates.length ? `<div class="mt-1 text-xs text-gray-500">${it.dates.join(', ')}</div>` : ''}
                </div>
              `).join('')}
            </div>`;
        }
      } catch {
        body.innerHTML = '<div class="text-red-600">Failed to load details.</div>';
      }
      modal.classList.remove('hidden');
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
      const res = await axios.get(`${baseApiUrl}/reports.php`, { params: { operation: 'payrollSummary' } });
      const data = res.data || { total_net_pay: 0, total_deductions: 0, total_overtime_pay: 0 };
      document.getElementById('payroll-summary').innerHTML = `
        <ul class="divide-y divide-gray-200">
          <li class="flex items-center justify-between py-2"><span>Total Net Pay (period)</span><strong>${Number(data.total_net_pay || 0).toFixed(2)}</strong></li>
          <li class="flex items-center justify-between py-2"><span>Total Deductions</span><strong>${Number(data.total_deductions || 0).toFixed(2)}</strong></li>
          <li class="flex items-center justify-between py-2"><span>Total Overtime Pay</span><strong>${Number(data.total_overtime_pay || 0).toFixed(2)}</strong></li>
        </ul>`;
    }

    
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
  'shift-management': async () => {
    const module = await import('./modules/shifts.js');
    await module.render();
  },
  'leave-management': async () => {
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

  const me = await currentUser();
  if (!me || me.role !== 'hr') {
    location.href = './login.html';
    return;
  }
  fillProfile(me);
  wireProfileMenu();
  mountProfileModal();
  handleRoute();
});

async function currentUser(){
  try {
    const res = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
    return res.data && res.data.user ? res.data.user : null;
  } catch { return null; }
}

function wireProfileMenu(){
  const asideLogout = document.getElementById('btn-logout');
  if (asideLogout){
    asideLogout.addEventListener('click', async () => {
      try { await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'logout' }, withCredentials: true }); } catch {}
      location.href = './login.html';
    });
  }
  const trigger = document.getElementById('profile-trigger');
  const menu = document.getElementById('profile-menu');
  const headerLogout = document.getElementById('header-logout');
  const headerProfile = document.getElementById('header-profile');
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
    try { await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'logout' }, withCredentials: true }); } catch {}
    location.href = './login.html';
    });
  }
  if (headerProfile){
    headerProfile.addEventListener('click', async () => {
      menu && menu.classList.add('hidden');
      await openProfile();
    });
  }
}

function fillProfile(user){
  const nameEl = document.getElementById('profile-name');
  const roleEl = document.getElementById('profile-role');
  const avatarEl = document.getElementById('profile-avatar');
  const displayName = (() => {
    const first = (user.first_name || '').trim();
    const last = (user.last_name || '').trim();
    if (first || last) return `${first}${first && last ? ' ' : ''}${last}`.trim();
    const u = (user.username || '').trim();
    if (u.includes('@')) return u.split('@')[0];
    return u || 'HR';
  })();
  if (nameEl) nameEl.textContent = displayName;
  if (roleEl) roleEl.textContent = user.role || 'hr';
  if (avatarEl) avatarEl.textContent = (displayName || 'H').substring(0,1).toUpperCase();
}

function buildFormData(map) {
  const fd = new FormData();
  Object.entries(map).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

// removed unload-based auto logout to avoid logging out on refresh

function mountProfileModal(){
  if (document.getElementById('hrProfileModal')) return;
  const modal = document.createElement('div');
  modal.id = 'hrProfileModal';
  modal.className = 'fixed inset-0 z-50 hidden';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/50" data-close="true"></div>
    <div class="relative mx-auto mt-24 w-full max-w-md">
      <div class="bg-white rounded-lg shadow">
        <div class="flex items-center justify-between border-b px-4 py-3"><h5 class="font-semibold">My Profile</h5><button class="text-gray-500 text-xl" data-close="true">×</button></div>
        <div class="p-4 grid gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">First name</label>
            <input id="hrp-first" class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">Last name</label>
            <input id="hrp-last" class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">Email/Username</label>
            <input id="hrp-email" type="email" class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">Phone</label>
            <input id="hrp-phone" class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">New Password (optional)</label>
            <input id="hrp-password" type="password" class="w-full border rounded px-3 py-2" placeholder="Leave blank to keep current password" />
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t px-4 py-3">
          <button class="px-3 py-2 text-sm rounded border" data-close="true">Cancel</button>
          <button id="hrp-save" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Save</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', () => modal.classList.add('hidden')));
  const saveBtn = modal.querySelector('#hrp-save');
  if (saveBtn){
    saveBtn.addEventListener('click', async () => {
      await saveProfile();
    });
  }
}

async function openProfile(){
  const modal = document.getElementById('hrProfileModal');
  if (!modal) return;
  try {
    // Get current session user
    const meRes = await axios.get(`${baseApiUrl}/auth.php`, { params: { operation: 'me' }, withCredentials: true });
    const me = meRes.data && meRes.data.user ? meRes.data.user : null;
    if (!me) { alert('Not authenticated'); return; }
    let details = { first_name: '', last_name: '', email: me.username || '', phone: '' };
    if (me.employee_id){
      const res = await axios.get(`${baseApiUrl}/employees.php`, { params: { operation: 'getEmployee', employee_id: me.employee_id } });
      details = res.data || details;
    }
    modal.dataset.me = JSON.stringify(me || {});
    modal.dataset.orig = JSON.stringify(details || {});
    const g = (id) => document.getElementById(id);
    if (g('hrp-first')) g('hrp-first').value = details.first_name || '';
    if (g('hrp-last')) g('hrp-last').value = details.last_name || '';
    if (g('hrp-email')) g('hrp-email').value = details.email || me.username || '';
    if (g('hrp-phone')) g('hrp-phone').value = details.phone || '';
    if (g('hrp-password')) g('hrp-password').value = '';
    modal.classList.remove('hidden');
  } catch {
    alert('Unable to load profile');
  }
}

async function saveProfile(){
  const modal = document.getElementById('hrProfileModal');
  if (!modal) return;
  const me = (() => { try { return JSON.parse(modal.dataset.me || '{}'); } catch { return {}; } })();
  const orig = (() => { try { return JSON.parse(modal.dataset.orig || '{}'); } catch { return {}; } })();
  const first = (document.getElementById('hrp-first').value || '').trim();
  const last = (document.getElementById('hrp-last').value || '').trim();
  const email = (document.getElementById('hrp-email').value || '').trim();
  const phone = (document.getElementById('hrp-phone').value || '').trim();
  const newPwd = (document.getElementById('hrp-password').value || '').trim();
  if (!email) { alert('Email is required'); return; }
  try {
    if (me.employee_id){
      const payload = {
        employee_id: me.employee_id,
        first_name: first || orig.first_name || '',
        last_name: last || orig.last_name || '',
        email: email,
        phone: phone || orig.phone || '',
        department: orig.department || '',
        position: 'hr',
        basic_salary: orig.basic_salary != null ? orig.basic_salary : 0,
        date_hired: orig.date_hired || '',
        status: orig.status || 'active'
      };
      if (newPwd) payload.hr_password = newPwd;
      await axios.post(`${baseApiUrl}/employees.php`, buildFormData({ operation: 'updateEmployee', json: JSON.stringify(payload) }));
    } else {
      // Fallback: update username/password only
      const payload = { username: email, password: newPwd || undefined };
      await axios.post(`${baseApiUrl}/auth.php`, buildFormData({ operation: 'updateProfile', json: JSON.stringify(payload) }));
    }
    modal.classList.add('hidden');
    alert('Profile updated');
    // Refresh header name/avatar
    document.getElementById('profile-name').textContent = email;
    document.getElementById('profile-avatar').textContent = (email || 'H').substring(0,1).toUpperCase();
  } catch {
    alert('Failed to update profile');
  }
}
