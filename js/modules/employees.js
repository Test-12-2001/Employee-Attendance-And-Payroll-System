export async function render() {
  const app = document.getElementById('app');
  // Local state for filtering and pagination
  let allEmployees = [];
  let currentQuery = '';
  let currentPage = 1;
  let pageSize = 10;
  const roleOptions = isHrPortal()
    ? '<option value="employee">Employee</option>'
    : '<option value="employee">Employee</option><option value="hr">HR</option>';
  app.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-xl font-semibold">Employees</h4>
      <button id="btn-add-employee" class="inline-flex items-center px-3 py-2 text-sm font-medium rounded bg-primary-600 text-white hover:bg-primary-700">Add Employee</button>
    </div>
    <div id="employees-stats" class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"></div>
    <div class="bg-white rounded-lg shadow p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <input id="emp-search-input" class="w-64 border rounded px-3 py-2" placeholder="Search by name, department, role" />
          <button id="emp-search-clear" aria-label="Clear search" class="inline-flex items-center gap-1.5 border border-gray-300 rounded px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1">
            <svg class="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            <span>Clear</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Rows per page</span>
          <select id="emp-page-size" class="border rounded px-2 py-1">
            <option value="10" selected>10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      <div id="employees-table"></div>
      <div id="employees-pagination" class="mt-3 flex items-center justify-between text-sm text-gray-600"></div>
    </div>

    <div id="employeeModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50" data-close="true"></div>
      <div class="relative mx-auto mt-20 w-full max-w-lg">
        <div class="bg-white rounded-lg shadow">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h5 class="font-semibold" id="employeeModalLabel">Add Employee</h5>
            <button class="text-gray-500 hover:text-gray-700 text-xl leading-none" data-close="true">×</button>
          </div>
          <div class="p-4">
            <form id="employee-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="hidden" id="employee_id" />
              <div>
                <label class="block text-sm text-gray-600 mb-1">First name</label>
                <input class="w-full border rounded px-3 py-2" id="first_name" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Last name</label>
                <input class="w-full border rounded px-3 py-2" id="last_name" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Email</label>
                <input class="w-full border rounded px-3 py-2" id="email" type="email" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Phone</label>
                <input class="w-full border rounded px-3 py-2" id="phone" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Department</label>
                <input class="w-full border rounded px-3 py-2" id="department" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Role</label>
                <select class="w-full border rounded px-3 py-2" id="position">${roleOptions}</select>
              </div>
              <div id="hr_pw_wrap" class="hidden">
                <label class="block text-sm text-gray-600 mb-1">Account Password</label>
                <input class="w-full border rounded px-3 py-2" id="hr_password" type="password" placeholder="Set a password (optional for employees)" />
                <div class="text-xs text-gray-500 mt-1">Optional for employees (leave blank to auto-generate). Required for HR. Username will be the email address.</div>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Basic Salary</label>
                <input class="w-full border rounded px-3 py-2" id="basic_salary" type="number" step="0.01" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Date Hired</label>
                <input class="w-full border rounded px-3 py-2" id="date_hired" type="date" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Status</label>
                <select class="w-full border rounded px-3 py-2" id="status">
                  <option value="active" selected>Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </form>
          </div>
          <div class="flex justify-end gap-2 border-t px-4 py-3">
            <button class="px-3 py-2 text-sm rounded border" data-close="true">Close</button>
            <button id="save-employee" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </div>
      </div>
    </div>`;

  const modalEl = document.getElementById('employeeModal');
  const openModal = () => modalEl.classList.remove('hidden');
  const closeModal = () => modalEl.classList.add('hidden');
  modalEl.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', closeModal));

  const roleSelect = document.getElementById('position');
  const hrPwWrap = document.getElementById('hr_pw_wrap');
  const syncHrPwVisibility = () => {
    if (!roleSelect || !hrPwWrap) return;
    const show = roleSelect.value === 'hr' || roleSelect.value === 'employee';
    hrPwWrap.classList.toggle('hidden', !show);
  };
  if (roleSelect) {
    roleSelect.addEventListener('change', syncHrPwVisibility);
    // In HR portal, lock the role to Employee
    if (isHrPortal()) {
      roleSelect.value = 'employee';
      roleSelect.disabled = true;
    }
  }

  document.getElementById('btn-add-employee').addEventListener('click', () => {
    resetForm();
    document.getElementById('employeeModalLabel').innerText = 'Add Employee';
    openModal();
  });

  document.getElementById('save-employee').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const { operation, ok, position, username_updated, username_conflict, generated_password } = await saveEmployee();
      if (ok) {
        closeModal();
        await loadEmployees();
        ensureToastContainer();
        const msg = operation === 'createEmployee'
          ? (position === 'hr' ? 'HR user added successfully' : 'Employee added successfully')
          : 'Employee updated successfully';
        showToast(msg, 'success');
        if (username_updated) {
          showToast('HR username updated to the new email.', 'success');
        }
        if (username_conflict) {
          showToast('New email is already used by another account. Username not changed.', 'error');
        }
        if (generated_password) {
          showToast(`Temporary password: ${generated_password}`, 'success');
        }
      }
    } finally {
      btn.disabled = false;
    }
  });

  // Wire search and page size controls
  const searchInput = document.getElementById('emp-search-input');
  const searchClear = document.getElementById('emp-search-clear');
  const pageSizeSelect = document.getElementById('emp-page-size');
  if (searchInput) {
    const handleSearch = () => {
      currentQuery = (searchInput.value || '').trim().toLowerCase();
      currentPage = 1;
      renderEmployeesTable();
    };
    searchInput.addEventListener('input', handleSearch);
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      currentQuery = '';
      currentPage = 1;
      renderEmployeesTable();
    });
  }
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      const num = Number(pageSizeSelect.value);
      pageSize = Number.isFinite(num) && num > 0 ? num : 10;
      currentPage = 1;
      renderEmployeesTable();
    });
  }

  await loadEmployees();

  async function loadEmployees() {
    const container = document.getElementById('employees-table');
    container.innerHTML = '<div class="text-gray-500">Loading...</div>';
    const response = await axios.get(`${window.baseApiUrl}/employees.php`, { params: { operation: 'getEmployees' } });
    // Exclude HR from list only in HR portal; show all in admin area
    const employeesRaw = response.data || [];
    allEmployees = isHrPortal()
      ? employeesRaw.filter(e => (e.position || '').toLowerCase() !== 'hr')
      : employeesRaw;

    // Render stats
    // In admin area include HR in stats; in HR portal exclude
    const base = isHrPortal() ? allEmployees.filter(e => (e.position || '').toLowerCase() !== 'hr') : allEmployees;
    const total = base.length;
    const active = base.filter(e => e.status === 'active').length;
    const inactive = total - active;
    const stats = document.getElementById('employees-stats');
    stats.innerHTML = `
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Total Employees</div>
        <div class="text-2xl font-semibold">${total}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Active</div>
        <div class="text-2xl font-semibold text-green-700">${active}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">Inactive</div>
        <div class="text-2xl font-semibold text-gray-700">${inactive}</div>
      </div>`;

    renderEmployeesTable();
  }

  function getFilteredEmployees() {
    if (!currentQuery) return allEmployees.slice();
    const q = currentQuery;
    return allEmployees.filter(e => {
      const name = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
      const dept = (e.department || '').toLowerCase();
      const role = (e.position || '').toLowerCase();
      const email = (e.email || '').toLowerCase();
      return name.includes(q) || dept.includes(q) || role.includes(q) || email.includes(q);
    });
  }

  function renderEmployeesTable() {
    const container = document.getElementById('employees-table');
    if (!container) return;
    const employees = getFilteredEmployees();
    const total = employees.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);
    const pageRows = employees.slice(startIdx, endIdx);

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
      <thead class="bg-gray-50">
        <tr>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Department</th>
           <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Role</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Salary</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
          <th class="px-3 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white"></tbody>`;

    const tbody = table.querySelector('tbody');
    pageRows.forEach((e, i) => {
      const tr = document.createElement('tr');
      const fullName = `${e.first_name} ${e.last_name}`;
      const displayIndex = startIdx + i + 1;
      tr.innerHTML = `
        <td class="px-3 py-2 text-sm text-gray-700">${displayIndex}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${fullName}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${e.department || ''}</td>
         <td class="px-3 py-2 text-sm text-gray-700">${e.position || ''}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${Number(e.basic_salary).toFixed(2)}</td>
        <td class="px-3 py-2 text-sm">
          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}">${e.status}</span>
        </td>
        <td class="px-3 py-2 text-sm text-right">
          <div class="relative inline-block text-left" data-emp-menu-container>
            <button class="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100" aria-label="Actions" data-action="menu-toggle">
              <svg class="w-5 h-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3a2 2 0 110 4 2 2 0 010-4zm0 5a2 2 0 110 4 2 2 0 010-4zm0 5a2 2 0 110 4 2 2 0 010-4z"/></svg>
            </button>
            <div class="hidden origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10" role="menu" data-menu>
              <div class="py-1">
                <button class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" data-menu-action="preview" role="menuitem">Preview</button>
                <button class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" data-menu-action="edit" role="menuitem">Edit</button>
                <button class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50" data-menu-action="delete" role="menuitem">Delete</button>
              </div>
            </div>
          </div>
        </td>`;

      const toggleBtn = tr.querySelector('[data-action="menu-toggle"]');
      const menu = tr.querySelector('[data-menu]');
      if (toggleBtn && menu) {
        toggleBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          // Close other open menus first
          document.querySelectorAll('[data-emp-menu-container] [data-menu]').forEach(m => m.classList.add('hidden'));
          menu.classList.toggle('hidden');
        });

        const onPreview = tr.querySelector('[data-menu-action="preview"]');
        const onEdit = tr.querySelector('[data-menu-action="edit"]');
        const onDelete = tr.querySelector('[data-menu-action="delete"]');
        if (onPreview) onPreview.addEventListener('click', async (ev) => {
          ev.preventDefault();
          menu.classList.add('hidden');
          await openPreview(e.employee_id);
        });
        if (onEdit) onEdit.addEventListener('click', (ev) => {
          ev.preventDefault();
          menu.classList.add('hidden');
        fillForm(e);
        document.getElementById('employeeModalLabel').innerText = 'Edit Employee';
        const roleSel = document.getElementById('position');
        if (roleSel) {
          if (isHrPortal()) {
            roleSel.value = 'employee';
            roleSel.disabled = true;
          } else {
            roleSel.disabled = false;
            roleSel.value = (e.position === 'hr' ? 'hr' : 'employee');
          }
        }
        openModal();
      });
        if (onDelete) onDelete.addEventListener('click', async (ev) => {
          ev.preventDefault();
          menu.classList.add('hidden');
        if (confirm('Delete this employee?')) {
          await axios.post(`${window.baseApiUrl}/employees.php`, buildFormData({ operation: 'deleteEmployee', json: JSON.stringify({ employee_id: e.employee_id }) }));
          await loadEmployees();
        }
      });
      }
      tbody.appendChild(tr);
    });

    container.innerHTML = '';
    container.appendChild(table);

    // Pagination footer
    const footer = document.getElementById('employees-pagination');
    if (footer) {
      const showingFrom = total === 0 ? 0 : (startIdx + 1);
      const showingTo = endIdx;
      footer.innerHTML = `
        <div>Showing <span class="font-medium">${showingFrom}</span>–<span class="font-medium">${showingTo}</span> of <span class="font-medium">${total}</span></div>
        <div class="flex items-center gap-2">
          <button id="emp-prev" class="px-2 py-1 text-xs rounded border ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">Prev</button>
          <span>Page ${currentPage} of ${totalPages}</span>
          <button id="emp-next" class="px-2 py-1 text-xs rounded border ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}">Next</button>
        </div>`;
      const prev = document.getElementById('emp-prev');
      const next = document.getElementById('emp-next');
      if (prev) prev.addEventListener('click', () => { if (currentPage > 1) { currentPage -= 1; renderEmployeesTable(); } });
      if (next) next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage += 1; renderEmployeesTable(); } });
    }
  }

  // Global outside-click handler to close any open action menus
  if (!window.__empMenuGlobalClose) {
    window.__empMenuGlobalClose = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('[data-emp-menu-container] [data-menu]').forEach(m => m.classList.add('hidden'));
    });
  }

  function ensurePreviewModal(){
    if (document.getElementById('employeePreviewModal')) return;
    const modal = document.createElement('div');
    modal.id = 'employeePreviewModal';
    modal.className = 'fixed inset-0 z-50 hidden';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/50" data-close="true"></div>
      <div class="relative mx-auto mt-20 w-full max-w-xl">
        <div class="bg-white rounded-lg shadow">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h5 class="font-semibold">Employee Preview</h5>
            <button class="text-gray-500 hover:text-gray-700 text-xl leading-none" data-close="true">×</button>
          </div>
          <div id="empPreviewBody" class="p-4 text-sm text-gray-700"></div>
          <div class="flex justify-end gap-2 border-t px-4 py-3">
            <button class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700" data-close="true">Close</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', () => modal.classList.add('hidden')));
  }

  async function openPreview(employeeId){
    ensurePreviewModal();
    const modal = document.getElementById('employeePreviewModal');
    const body = document.getElementById('empPreviewBody');
    if (!modal || !body) return;
    body.innerHTML = '<div class="text-gray-500">Loading...</div>';
    try {
      const res = await axios.get(`${window.baseApiUrl}/employees.php`, { params: { operation: 'getEmployee', employee_id: employeeId } });
      const e = res.data || {};
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
            <div class="text-gray-500">Role</div>
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
    } catch {
      body.innerHTML = '<div class="text-red-600">Failed to load employee details.</div>';
    }
    modal.classList.remove('hidden');
  }

  function fillForm(e) {
    document.getElementById('employee_id').value = e.employee_id || '';
    document.getElementById('first_name').value = e.first_name || '';
    document.getElementById('last_name').value = e.last_name || '';
    document.getElementById('email').value = e.email || '';
    document.getElementById('phone').value = e.phone || '';
    document.getElementById('department').value = e.department || '';
    document.getElementById('position').value = (e.position === 'hr' ? 'hr' : 'employee');
    if (isHrPortal()) {
      const roleSel = document.getElementById('position');
      if (roleSel) roleSel.value = 'employee';
    }
    const hrPwd = document.getElementById('hr_password');
    if (hrPwd) hrPwd.value = '';
    syncHrPwVisibility();
    document.getElementById('basic_salary').value = e.basic_salary || '';
    document.getElementById('date_hired').value = e.date_hired || '';
    document.getElementById('status').value = e.status || 'active';
  }

  function resetForm() {
    fillForm({});
  }

  async function saveEmployee() {
    const payload = {
      employee_id: document.getElementById('employee_id').value || undefined,
      first_name: document.getElementById('first_name').value,
      last_name: document.getElementById('last_name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      department: document.getElementById('department').value,
      position: document.getElementById('position').value,
      basic_salary: document.getElementById('basic_salary').value,
      date_hired: document.getElementById('date_hired').value,
      status: document.getElementById('status').value,
    };
    // In HR portal, force employee role only
    if (isHrPortal()) {
      payload.position = 'employee';
    }
    // Validate all required fields
    resetValidation();
    const invalidEls = [];
    const requiredIds = ['first_name','last_name','email','phone','department','position','basic_salary','date_hired','status'];
    requiredIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const value = (el.value || '').toString().trim();
      if (!value) invalidEls.push(el);
    });
    // Numeric validation for salary
    const salaryNum = Number(payload.basic_salary);
    if (!Number.isFinite(salaryNum) || salaryNum <= 0) invalidEls.push(document.getElementById('basic_salary'));

    // Account password rules
    if (!payload.email || !payload.email.includes('@')) invalidEls.push(document.getElementById('email'));
    const accPwd = document.getElementById('hr_password').value;
    // Require password only when creating HR accounts; for employees it's optional
    if (payload.position === 'hr' && !payload.employee_id && !accPwd) {
      invalidEls.push(document.getElementById('hr_password'));
    }
    if (accPwd) payload.user_password = accPwd;

    if (invalidEls.length){
      ensureToastContainer();
      showToast('Please complete all fields correctly before saving.', 'error');
      markInvalid(invalidEls);
      invalidEls[0].focus();
      return { operation: payload.employee_id ? 'updateEmployee' : 'createEmployee', ok: false, position: payload.position };
    }

    const operation = payload.employee_id ? 'updateEmployee' : 'createEmployee';
    try {
      const res = await axios.post(`${window.baseApiUrl}/employees.php`, buildFormData({ operation, json: JSON.stringify(payload) }));
      const data = res && res.data ? res.data : {};
      return { operation, ok: true, position: payload.position, username_updated: !!data.username_updated, username_conflict: !!data.username_conflict, generated_password: data.generated_password };
    } catch {
      ensureToastContainer();
      showToast('Failed to save employee', 'error');
      return { operation, ok: false, position: payload.position };
    }
  }

  function ensureToastContainer(){
    if (document.getElementById('toast-container')) return;
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(container);
  }

  function showToast(message, variant){
    const container = document.getElementById('toast-container');
    if (!container) return;
    const bg = variant === 'error' ? 'bg-red-600' : 'bg-green-600';
    const toast = document.createElement('div');
    toast.className = `${bg} text-white rounded shadow px-4 py-2 text-sm transition-opacity duration-300 opacity-0`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.classList.remove('opacity-0'); });
    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => { toast.remove(); }, 300);
    }, 2500);
  }

  function resetValidation(){
    const ids = ['first_name','last_name','email','phone','department','position','basic_salary','date_hired','status','hr_password'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('border-red-500','focus:ring-red-500','focus:border-red-500');
    });
  }

  function markInvalid(elements){
    const arr = Array.isArray(elements) ? elements : [elements];
    arr.forEach(el => {
      if (!el) return;
      el.classList.add('border-red-500','focus:ring-red-500','focus:border-red-500');
    });
  }

  function isHrPortal(){
    return location.pathname.endsWith('/hr.html') || location.pathname.endsWith('hr.html');
  }
}

function buildFormData(map) {
  const fd = new FormData();
  Object.entries(map).forEach(([k, v]) => fd.append(k, v));
  return fd;
}


