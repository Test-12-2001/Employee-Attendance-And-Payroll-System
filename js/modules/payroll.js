export async function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-xl font-semibold">Payroll</h4>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow h-full">
          <div class="p-4">
            <h6 class="font-semibold mb-3">Generate Payroll</h6>
            <form id="payroll-form" class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-sm text-gray-600 mb-1">Employee</label>
                <select id="employee_id" class="w-full border rounded px-3 py-2" required></select>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Period Start</label>
                <input type="date" id="period_start" class="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Period End</label>
                <input type="date" id="period_end" class="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Overtime Hours</label>
                <input type="number" id="overtime_hours" class="w-full border rounded px-3 py-2" step="0.01" value="0" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Overtime Rate</label>
                <input type="number" id="overtime_rate" class="w-full border rounded px-3 py-2" step="0.01" value="0" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Deductions</label>
                <input type="number" id="deductions" class="w-full border rounded px-3 py-2" step="0.01" value="0" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Bonus</label>
                <input type="number" id="bonus" class="w-full border rounded px-3 py-2" step="0.01" value="0" />
              </div>
              <div class="col-span-2">
                <button class="w-full px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700" id="btn-generate">Generate</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow h-full">
          <div class="p-4">
            <div class="flex items-center justify-between mb-3">
              <h6 class="font-semibold">Payroll Records</h6>
              <form id="filters" class="flex items-center gap-2">
                <input type="date" id="start_date" class="border rounded px-3 py-2" />
                <input type="date" id="end_date" class="border rounded px-3 py-2" />
                <button class="px-3 py-2 text-sm rounded border">Filter</button>
              </form>
            </div>
            <div id="payroll-table"></div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('filters').addEventListener('submit', async (e) => {
    e.preventDefault();
    await loadPayroll();
  });

  document.getElementById('btn-generate').addEventListener('click', async (e) => {
    e.preventDefault();
    await generatePayroll();
    await loadPayroll();
  });

  await loadEmployeesSelect();
  await loadPayroll();

  async function loadEmployeesSelect() {
    const response = await axios.get(`${window.baseApiUrl}/employees.php`, { params: { operation: 'getEmployees' } });
    const employees = response.data || [];
    const select = document.getElementById('employee_id');
    select.innerHTML = '';
    employees.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.employee_id;
      opt.textContent = `${e.first_name} ${e.last_name}`;
      select.appendChild(opt);
    });
  }

  async function loadPayroll() {
    const tableDiv = document.getElementById('payroll-table');
    tableDiv.innerHTML = '<div class="text-gray-500">Loading...</div>';
    const params = {
      operation: 'listPayroll',
      start_date: document.getElementById('start_date').value || undefined,
      end_date: document.getElementById('end_date').value || undefined,
    };
    const response = await axios.get(`${window.baseApiUrl}/payroll.php`, { params });
    const rows = response.data || [];

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
      <thead class="bg-gray-50">
        <tr>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Period</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Basic</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">OT Pay</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Deductions</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600">Net</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white"></tbody>`;
    const tbody = table.querySelector('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const name = `${r.first_name} ${r.last_name}`;
      tr.innerHTML = `
        <td class="px-3 py-2 text-sm text-gray-700">${r.payroll_id}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${name}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${r.payroll_period_start} to ${r.payroll_period_end}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${Number(r.basic_salary).toFixed(2)}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${Number(r.overtime_pay).toFixed(2)}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${Number(r.deductions).toFixed(2)}</td>
        <td class="px-3 py-2 text-sm font-semibold text-gray-900">${Number(r.net_pay).toFixed(2)}</td>`;
      tbody.appendChild(tr);
    });

    tableDiv.innerHTML = '';
    tableDiv.appendChild(table);
  }

  async function generatePayroll() {
    const payload = {
      employee_id: document.getElementById('employee_id').value,
      payroll_period_start: document.getElementById('period_start').value,
      payroll_period_end: document.getElementById('period_end').value,
      overtime_hours: document.getElementById('overtime_hours').value || 0,
      overtime_rate: document.getElementById('overtime_rate').value || 0,
      deductions: document.getElementById('deductions').value || 0,
      bonus: document.getElementById('bonus').value || 0,
    };
    await axios.post(`${window.baseApiUrl}/payroll.php`, buildFormData({ operation: 'generatePayroll', json: JSON.stringify(payload) }));
  }
}

function buildFormData(map) {
  const fd = new FormData();
  Object.entries(map).forEach(([k, v]) => fd.append(k, v));
  return fd;
}


