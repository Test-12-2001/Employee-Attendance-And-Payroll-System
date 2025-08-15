export async function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-xl font-semibold">Shifts</h4>
      <button id="btn-add-shift" class="inline-flex items-center px-3 py-2 text-sm font-medium rounded bg-primary-600 text-white hover:bg-primary-700">Add Shift</button>
    </div>
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <form id="filters" class="flex flex-wrap items-center gap-2">
        <input type="date" id="start_date" class="border rounded px-3 py-2" />
        <input type="date" id="end_date" class="border rounded px-3 py-2" />
        <button class="px-3 py-2 text-sm rounded border">Filter</button>
      </form>
    </div>
    <div class="bg-white rounded-lg shadow p-4">
      <div id="shifts-table"></div>
    </div>

    <div id="shiftModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50" data-close="true"></div>
      <div class="relative mx-auto mt-20 w-full max-w-lg">
        <div class="bg-white rounded-lg shadow">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h5 class="font-semibold" id="shiftModalLabel">Add Shift</h5>
            <button class="text-gray-500 hover:text-gray-700 text-xl leading-none" data-close="true">×</button>
          </div>
          <div class="p-4">
            <form id="shift-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="hidden" id="shift_id" />
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">Employee</label>
                <select id="employee_id" class="w-full border rounded px-3 py-2" required></select>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Date</label>
                <input type="date" id="shift_date" class="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Start</label>
                <input type="time" id="start_time" class="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">End</label>
                <input type="time" id="end_time" class="w-full border rounded px-3 py-2" required />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">Location</label>
                <input id="location" class="w-full border rounded px-3 py-2" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">Notes</label>
                <input id="notes" class="w-full border rounded px-3 py-2" />
              </div>
            </form>
          </div>
          <div class="flex justify-end gap-2 border-t px-4 py-3">
            <button class="px-3 py-2 text-sm rounded border" data-close="true">Close</button>
            <button id="save-shift" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </div>
      </div>
    </div>`;

  const modalEl = document.getElementById('shiftModal');
  const openModal = () => modalEl.classList.remove('hidden');
  const closeModal = () => modalEl.classList.add('hidden');
  modalEl.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', closeModal));

  document.getElementById('filters').addEventListener('submit', async (e) => {
    e.preventDefault();
    await loadShifts();
  });
  document.getElementById('btn-add-shift').addEventListener('click', async () => {
    await loadEmployeesSelect();
    resetForm();
    openModal();
  });
  document.getElementById('save-shift').addEventListener('click', async () => {
    await saveShift();
    closeModal();
    await loadShifts();
  });

  await loadShifts();

  async function loadShifts(){
    const tableDiv = document.getElementById('shifts-table');
    tableDiv.innerHTML = '<div class="text-gray-500">Loading...</div>';
    const params = { operation: 'list', start_date: document.getElementById('start_date').value || undefined, end_date: document.getElementById('end_date').value || undefined };
    const res = await axios.get(`${window.baseApiUrl}/shifts.php`, { params });
    const rows = res.data || [];
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
      <thead class="bg-gray-50"><tr>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Start</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">End</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Location</th>
        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
      </tr></thead><tbody class="divide-y divide-gray-200 bg-white"></tbody>`;
    const tbody = table.querySelector('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const name = `${r.first_name} ${r.last_name}`;
      tr.innerHTML = `
        <td class="px-3 py-2 text-sm text-gray-700">${r.shift_id}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${name}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.shift_date}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.start_time}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.end_time}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.location || ''}</td>
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
        if (confirm('Delete this shift?')) {
          await axios.post(`${window.baseApiUrl}/shifts.php`, buildFormData({ operation: 'delete', json: JSON.stringify({ shift_id: r.shift_id }) }));
          await loadShifts();
        }
      });
      tbody.appendChild(tr);
    });
    tableDiv.innerHTML = '';
    tableDiv.appendChild(table);
  }

  async function loadEmployeesSelect(selectedId){
    const res = await axios.get(`${window.baseApiUrl}/employees.php`, { params: { operation: 'getEmployees' } });
    const employees = res.data || [];
    const select = document.getElementById('employee_id');
    select.innerHTML = '';
    employees.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.employee_id;
      opt.textContent = `${e.first_name} ${e.last_name}`;
      if (selectedId && String(selectedId) === String(e.employee_id)) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function resetForm(){ fillForm({}); }
  function fillForm(s){
    document.getElementById('shift_id').value = s.shift_id || '';
    document.getElementById('employee_id').value = s.employee_id || '';
    document.getElementById('shift_date').value = s.shift_date || '';
    document.getElementById('start_time').value = s.start_time || '';
    document.getElementById('end_time').value = s.end_time || '';
    document.getElementById('location').value = s.location || '';
    document.getElementById('notes').value = s.notes || '';
  }

  async function saveShift(){
    const payload = {
      shift_id: document.getElementById('shift_id').value || undefined,
      employee_id: document.getElementById('employee_id').value,
      shift_date: document.getElementById('shift_date').value,
      start_time: document.getElementById('start_time').value,
      end_time: document.getElementById('end_time').value,
      location: document.getElementById('location').value,
      notes: document.getElementById('notes').value,
    };
    const operation = payload.shift_id ? 'update' : 'create';
    await axios.post(`${window.baseApiUrl}/shifts.php`, buildFormData({ operation, json: JSON.stringify(payload) }));
  }
}

function buildFormData(map) {
  const fd = new FormData();
  Object.entries(map).forEach(([k, v]) => fd.append(k, v));
  return fd;
}


