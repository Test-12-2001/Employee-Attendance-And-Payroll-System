export async function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-xl font-semibold">Reports</h4>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white rounded-lg shadow h-full">
        <div class="p-4">
          <h6 class="font-semibold mb-3">Attendance Summary</h6>
          <form id="att-form" class="flex flex-wrap items-center gap-2 mb-3">
            <input type="date" id="att_start" class="border rounded px-3 py-2" />
            <input type="date" id="att_end" class="border rounded px-3 py-2" />
            <button class="px-3 py-2 text-sm rounded border">Run</button>
          </form>
          <div id="att-summary"></div>
        </div>
      </div>
      <div class="bg-white rounded-lg shadow h-full">
        <div class="p-4">
          <h6 class="font-semibold mb-3">Payroll Summary</h6>
          <form id="pay-form" class="flex flex-wrap items-center gap-2 mb-3">
            <input type="date" id="pay_start" class="border rounded px-3 py-2" />
            <input type="date" id="pay_end" class="border rounded px-3 py-2" />
            <button class="px-3 py-2 text-sm rounded border">Run</button>
          </form>
          <div id="pay-summary"></div>
        </div>
      </div>
    </div>`;

  document.getElementById('att-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const start_date = document.getElementById('att_start').value || undefined;
    const end_date = document.getElementById('att_end').value || undefined;
    const res = await axios.get(`${window.baseApiUrl}/reports.php`, { params: { operation: 'attendanceSummary', start_date, end_date } });
    const data = res.data || { present: 0, absent: 0, leave: 0 };
    document.getElementById('att-summary').innerHTML = `
      <ul class="divide-y divide-gray-200">
        <li class="flex items-center justify-between py-2"><span>Present</span><strong>${data.present || 0}</strong></li>
        <li class="flex items-center justify-between py-2"><span>Absent</span><strong>${data.absent || 0}</strong></li>
        <li class="flex items-center justify-between py-2"><span>Leave</span><strong>${data.leave || 0}</strong></li>
      </ul>`;
  });

  document.getElementById('pay-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const start_date = document.getElementById('pay_start').value || undefined;
    const end_date = document.getElementById('pay_end').value || undefined;
    const res = await axios.get(`${window.baseApiUrl}/reports.php`, { params: { operation: 'payrollSummary', start_date, end_date } });
    const data = res.data || { total_net_pay: 0, total_deductions: 0, total_overtime_pay: 0 };
    document.getElementById('pay-summary').innerHTML = `
      <ul class="divide-y divide-gray-200">
        <li class="flex items-center justify-between py-2"><span>Total Net Pay</span><strong>${Number(data.total_net_pay || 0).toFixed(2)}</strong></li>
        <li class="flex items-center justify-between py-2"><span>Total Deductions</span><strong>${Number(data.total_deductions || 0).toFixed(2)}</strong></li>
        <li class="flex items-center justify-between py-2"><span>Total Overtime Pay</span><strong>${Number(data.total_overtime_pay || 0).toFixed(2)}</strong></li>
      </ul>`;
  });
}


