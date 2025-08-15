export async function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-xl font-semibold">Leave Requests</h4>
      <button id="btn-file-leave" class="inline-flex items-center px-3 py-2 text-sm font-medium rounded bg-primary-600 text-white hover:bg-primary-700">File Leave</button>
    </div>
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <form id="filters" class="flex flex-wrap items-center gap-2">
        <select id="status_filter" class="border rounded px-3 py-2">
          <option value="all">All</option>
          <option value="pending" selected>Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input type="date" id="start_date" class="border rounded px-3 py-2" />
        <input type="date" id="end_date" class="border rounded px-3 py-2" />
        <button class="px-3 py-2 text-sm rounded border">Apply</button>
      </form>
    </div>
    <div class="bg-white rounded-lg shadow p-4">
      <div id="leaves-table"></div>
    </div>

    <div id="leaveModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50" data-close="true"></div>
      <div class="relative mx-auto mt-20 w-full max-w-lg">
        <div class="bg-white rounded-lg shadow">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h5 class="font-semibold" id="leaveModalLabel">File Leave</h5>
            <button class="text-gray-500 hover:text-gray-700 text-xl leading-none" data-close="true">×</button>
          </div>
          <div class="p-4">
            <form id="leave-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">Employee</label>
                <select id="employee_id" class="w-full border rounded px-3 py-2" required></select>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Start date</label>
                <input type="date" id="lv_start" class="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">End date</label>
                <input type="date" id="lv_end" class="w-full border rounded px-3 py-2" required />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">Reason</label>
                <textarea id="lv_reason" rows="3" class="w-full border rounded px-3 py-2"></textarea>
              </div>
            </form>
          </div>
          <div class="flex justify-end gap-2 border-t px-4 py-3">
            <button class="px-3 py-2 text-sm rounded border" data-close="true">Close</button>
            <button id="save-leave" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </div>
      </div>
    </div>

    <div id="hrLeaveViewModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50" data-close="true"></div>
      <div class="relative mx-auto mt-24 w-full max-w-lg">
        <div class="bg-white rounded-lg shadow">
          <div class="flex items-center justify-between border-b px-4 py-3"><h5 class="font-semibold">Leave Details</h5><button class="text-gray-500 text-xl" data-close="true">×</button></div>
          <div class="p-4 text-sm space-y-2">
            <div><span class="text-gray-500">Employee:</span> <span id="lvw-emp"></span></div>
            <div><span class="text-gray-500">Dates:</span> <span id="lvw-dates"></span></div>
            <div><span class="text-gray-500">Reason:</span> <div id="lvw-reason" class="mt-1 whitespace-pre-wrap"></div></div>
            <div><span class="text-gray-500">Status:</span> <span id="lvw-status"></span></div>
          </div>
          <div class="flex justify-end gap-2 border-t px-4 py-3">
            <button class="px-3 py-2 text-sm rounded border" data-close="true">Close</button>
          </div>
        </div>
      </div>
    </div>`;

  const modalEl = document.getElementById('leaveModal');
  const openModal = () => modalEl.classList.remove('hidden');
  const closeModal = () => modalEl.classList.add('hidden');
  modalEl.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', closeModal));
  const viewModal = document.getElementById('hrLeaveViewModal');
  const closeView = () => viewModal.classList.add('hidden');
  viewModal.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', closeView));

  document.getElementById('filters').addEventListener('submit', async (e) => {
    e.preventDefault();
    await loadLeaves();
  });
  document.getElementById('btn-file-leave').addEventListener('click', async () => {
    await loadEmployeesSelect();
    resetForm();
    openModal();
  });
  document.getElementById('save-leave').addEventListener('click', async () => {
    await saveLeave();
    closeModal();
    await loadLeaves();
  });

  await loadLeaves();

  async function loadLeaves() {
    const tableDiv = document.getElementById('leaves-table');
    tableDiv.innerHTML = '<div class="text-gray-500">Loading...</div>';
    // server returns last 20 of any status; filter locally by status/date range
    const response = await axios.get(`${window.baseApiUrl}/leaves.php`, { params: { operation: 'listRecent' } });
    let rows = response.data || [];
    const status = document.getElementById('status_filter').value;
    const start = document.getElementById('start_date').value || null;
    const end = document.getElementById('end_date').value || null;
    if (status !== 'all') rows = rows.filter(r => (r.status || '').toLowerCase() === status);
    if (start) rows = rows.filter(r => r.start_date >= start);
    if (end) rows = rows.filter(r => r.end_date <= end);

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
      <thead class="bg-gray-50"><tr>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Dates</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Reason</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Approved By</th>
        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
      </tr></thead>
      <tbody class="divide-y divide-gray-200 bg-white"></tbody>`;
    const tbody = table.querySelector('tbody');
    rows.forEach(l => {
      const tr = document.createElement('tr');
      const name = `${l.first_name} ${l.last_name}`;
      tr.innerHTML = `
        <td class="px-3 py-2 text-sm text-gray-700">${l.leave_id}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${name}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${l.start_date} → ${l.end_date}</td>
        <td class="px-3 py-2 text-sm text-gray-700 truncate max-w-[16rem]" title="${(l.reason||'').replace(/"/g,'&quot;')}">${l.reason || ''}</td>
        <td class="px-3 py-2 text-sm">
          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(l.status)}">${l.status}</span>
        </td>
        <td class="px-3 py-2 text-sm text-gray-700">${l.approved_by_username || ''}</td>
        <td class="px-3 py-2 text-sm text-right space-x-1">
          <button class="px-2 py-1 text-xs rounded border border-gray-400 text-gray-700 hover:bg-gray-50" data-action="view">View</button>
          ${l.status === 'pending' ? `
            <button class="px-2 py-1 text-xs rounded border border-green-600 text-green-700 hover:bg-green-50" data-action="approve">Approve</button>
            <button class="px-2 py-1 text-xs rounded border border-red-600 text-red-700 hover:bg-red-50" data-action="reject">Reject</button>
          ` : ''}
        </td>`;

      tr.querySelector('[data-action="view"]').addEventListener('click', () => openView(l));
      const approveBtn = tr.querySelector('[data-action="approve"]');
      const rejectBtn = tr.querySelector('[data-action="reject"]');
      if (approveBtn) approveBtn.addEventListener('click', async () => { await setStatus(l.leave_id, 'approve'); await loadLeaves(); });
      if (rejectBtn) rejectBtn.addEventListener('click', async () => { await setStatus(l.leave_id, 'reject'); await loadLeaves(); });
      tbody.appendChild(tr);
    });
    tableDiv.innerHTML = '';
    tableDiv.appendChild(table);
  }

  async function loadEmployeesSelect(selectedId){
    const res = await axios.get(`${window.baseApiUrl}/employees.php`, { params: { operation: 'getEmployees' } });
    const list = (res.data || []).filter(e => String(e.position || '').toLowerCase() !== 'hr');
    const select = document.getElementById('employee_id');
    select.innerHTML = '';
    list.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.employee_id;
      opt.textContent = `${e.first_name} ${e.last_name}`;
      if (selectedId && String(selectedId) === String(e.employee_id)) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function resetForm(){ fillForm({}); }
  function fillForm(l){
    document.getElementById('employee_id').value = l.employee_id || '';
    document.getElementById('lv_start').value = l.start_date || '';
    document.getElementById('lv_end').value = l.end_date || '';
    document.getElementById('lv_reason').value = l.reason || '';
  }

  async function saveLeave(){
    const payload = {
      employee_id: document.getElementById('employee_id').value,
      start_date: document.getElementById('lv_start').value,
      end_date: document.getElementById('lv_end').value,
      reason: document.getElementById('lv_reason').value,
    };
    await axios.post(`${window.baseApiUrl}/leaves.php`, buildFormData({ operation: 'requestLeave', json: JSON.stringify(payload) }));
  }

  async function setStatus(leaveId, op){
    const operation = op === 'approve' ? 'approve' : 'reject';
    await axios.post(`${window.baseApiUrl}/leaves.php`, buildFormData({ operation, json: JSON.stringify({ leave_id: leaveId }) }));
  }

  function openView(leave){
    const modal = document.getElementById('hrLeaveViewModal');
    modal.querySelector('#lvw-emp').textContent = `${leave.first_name} ${leave.last_name}`;
    modal.querySelector('#lvw-dates').textContent = `${leave.start_date} → ${leave.end_date}`;
    modal.querySelector('#lvw-reason').textContent = leave.reason || '';
    modal.querySelector('#lvw-status').textContent = leave.status || 'pending';
    modal.classList.remove('hidden');
  }

  function badgeClass(status){
    const s = String(status||'').toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-700';
    if (s === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  }
}

function buildFormData(map) {
  const fd = new FormData();
  Object.entries(map).forEach(([k, v]) => fd.append(k, v));
  return fd;
}


