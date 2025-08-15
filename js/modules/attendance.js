export async function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-xl font-semibold">Attendance</h4>
      <button id="btn-add-att" class="inline-flex items-center px-3 py-2 text-sm font-medium rounded bg-primary-600 text-white hover:bg-primary-700">Record Attendance</button>
    </div>
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <form id="filters" class="flex flex-wrap items-center gap-2">
        <input type="date" id="start_date" class="border rounded px-3 py-2" />
        <input type="date" id="end_date" class="border rounded px-3 py-2" />
        <button class="px-3 py-2 text-sm rounded border">Filter</button>
      </form>
    </div>
    <div class="bg-white rounded-lg shadow p-4">
      <div id="attendance-table"></div>
    </div>

    <div id="attModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50" data-close="true"></div>
      <div class="relative mx-auto mt-20 w-full max-w-lg">
        <div class="bg-white rounded-lg shadow">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h5 class="font-semibold">Record Attendance</h5>
            <button class="text-gray-500 hover:text-gray-700 text-xl leading-none" data-close="true">×</button>
          </div>
          <div class="p-4">
            <form id="att-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="hidden" id="attendance_id" />
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">Employee</label>
                <input id="employee_search" type="text" placeholder="Search employee by name..." class="mb-2 w-full border rounded px-3 py-2" />
                <select id="employee_id" class="w-full border rounded px-3 py-2" required></select>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Date</label>
                <input type="date" id="attendance_date" class="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Status</label>
                <select id="status" class="w-full border rounded px-3 py-2">
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Time In</label>
                <input type="time" id="time_in" class="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Time Out</label>
                <input type="time" id="time_out" class="w-full border rounded px-3 py-2" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">Remarks</label>
                <input id="remarks" class="w-full border rounded px-3 py-2" />
              </div>
            </form>
          </div>
          <div class="flex justify-end gap-2 border-t px-4 py-3">
            <button class="px-3 py-2 text-sm rounded border" data-close="true">Close</button>
            <button id="save-att" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </div>
      </div>
    </div>`;

  const modalEl = document.getElementById('attModal');
  const openModal = () => modalEl.classList.remove('hidden');
  const closeModal = () => modalEl.classList.add('hidden');
  modalEl.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', closeModal));

  let employeesCache = [];

  document.getElementById('filters').addEventListener('submit', async (e) => {
    e.preventDefault();
    await loadAttendance();
  });

  document.getElementById('btn-add-att').addEventListener('click', async () => {
    await loadEmployeesSelect();
    resetForm();
    openModal();
  });

  document.getElementById('save-att').addEventListener('click', async () => {
    await saveAttendance();
    closeModal();
    await loadAttendance();
  });

  await loadAttendance();

  async function loadAttendance() {
    const tableDiv = document.getElementById('attendance-table');
    tableDiv.innerHTML = '<div class="text-gray-500">Loading...</div>';
    const params = {
      operation: 'getAttendance',
      start_date: document.getElementById('start_date').value || undefined,
      end_date: document.getElementById('end_date').value || undefined,
    };
    const response = await axios.get(`${window.baseApiUrl}/attendance.php`, { params });
    let rows = response.data || [];
    // In HR portal, show only employees (exclude HR)
    if (isHrPortal()) {
      rows = rows.filter(r => String(r.position || '').toLowerCase() !== 'hr');
    }

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
      <thead class="bg-gray-50">
        <tr>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Time In</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Time Out</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Remarks</th>
          <th class="px-3 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white"></tbody>`;

    const tbody = table.querySelector('tbody');
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      const name = `${r.first_name} ${r.last_name}`;
      tr.innerHTML = `
        <td class="px-3 py-2 text-sm text-gray-700">${r.attendance_id}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.attendance_date}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${name}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.status}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.time_in || ''}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.time_out || ''}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.remarks || ''}</td>
        <td class="px-3 py-2 text-sm text-right">
          <button class="px-2 py-1 text-xs rounded border border-primary-600 text-primary-700 hover:bg-primary-50 mr-1" data-action="edit">Edit</button>
          <button class="px-2 py-1 text-xs rounded border border-red-600 text-red-700 hover:bg-red-50" data-action="delete">Delete</button>
        </td>`;

      tr.querySelector('[data-action="edit"]').addEventListener('click', async () => {
        await loadEmployeesSelect();
        fillForm(r);
        openModal();
      });
      tr.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (confirm('Delete this record?')) {
          await axios.post(`${window.baseApiUrl}/attendance.php`, buildFormData({ operation: 'deleteAttendance', json: JSON.stringify({ attendance_id: r.attendance_id }) }));
          await loadAttendance();
        }
      });
      tbody.appendChild(tr);
    });

    tableDiv.innerHTML = '';
    tableDiv.appendChild(table);
  }

  async function loadEmployeesSelect(selectedId) {
    if (employeesCache.length === 0) {
      const response = await axios.get(`${window.baseApiUrl}/employees.php`, { params: { operation: 'getEmployees' } });
      const list = response.data || [];
      employeesCache = isHrPortal() ? list.filter(e => String(e.position || '').toLowerCase() !== 'hr') : list;
    }
    const searchInput = document.getElementById('employee_search');
    const select = document.getElementById('employee_id');
    const renderOptions = (list, selId) => {
      select.innerHTML = '';
      list.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.employee_id;
        opt.textContent = `${e.first_name} ${e.last_name}`;
        if (selId && String(selId) === String(e.employee_id)) opt.selected = true;
        select.appendChild(opt);
      });
    };
    renderOptions(employeesCache, selectedId);
    searchInput.value = '';
    searchInput.oninput = () => {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = !q ? employeesCache : employeesCache.filter(e => (`${e.first_name} ${e.last_name}`.toLowerCase().includes(q)));
      renderOptions(filtered, select.value);
    };
  }

  function resetForm() {
    fillForm({});
  }

  function fillForm(r) {
    document.getElementById('attendance_id').value = r.attendance_id || '';
    const select = document.getElementById('employee_id');
    if (r.employee_id) {
      Array.from(select.options).forEach(o => { o.selected = String(o.value) === String(r.employee_id); });
      // also prefill search with the selected employee name if available in cache
      const emp = employeesCache.find(e => String(e.employee_id) === String(r.employee_id));
      const searchInput = document.getElementById('employee_search');
      if (emp && searchInput) searchInput.value = `${emp.first_name} ${emp.last_name}`;
    } else {
      Array.from(select.options).forEach(o => { o.selected = false; });
      const searchInput = document.getElementById('employee_search');
      if (searchInput) searchInput.value = '';
    }
    document.getElementById('attendance_date').value = r.attendance_date || '';
    document.getElementById('status').value = r.status || 'present';
    document.getElementById('time_in').value = r.time_in || '';
    document.getElementById('time_out').value = r.time_out || '';
    document.getElementById('remarks').value = r.remarks || '';
  }

  async function saveAttendance() {
    const attendanceId = document.getElementById('attendance_id').value;
    const selected = [document.getElementById('employee_id').value].filter(Boolean);
    const base = {
      attendance_date: document.getElementById('attendance_date').value,
      status: document.getElementById('status').value,
      time_in: document.getElementById('time_in').value || null,
      time_out: document.getElementById('time_out').value || null,
      remarks: document.getElementById('remarks').value,
    };

    if (attendanceId) {
      // single update
      const payload = { ...base, attendance_id: attendanceId, employee_id: selected[0] };
      await axios.post(`${window.baseApiUrl}/attendance.php`, buildFormData({ operation: 'updateAttendance', json: JSON.stringify(payload) }));
    } else {
      const payload = { ...base, employee_id: selected[0] };
      await axios.post(`${window.baseApiUrl}/attendance.php`, buildFormData({ operation: 'recordAttendance', json: JSON.stringify(payload) }));
    }
  }
}

function buildFormData(map) {
  const fd = new FormData();
  Object.entries(map).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

function isHrPortal(){
  return location.pathname.endsWith('/hr.html') || location.pathname.endsWith('hr.html');
}


