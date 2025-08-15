export async function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="mb-4">
      <h4 class="text-xl font-semibold">Settings</h4>
      <p class="text-sm text-gray-600">Manage users, system config, payroll rules, attendance rules, notifications, security, backups, and audit logs.</p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="bg-white rounded-lg shadow p-4">
        <h5 class="font-semibold mb-2">User Management</h5>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Add, edit, deactivate, delete users</li>
          <li>Assign roles and permissions</li>
          <li>Reset passwords</li>
        </ul>
        <button id="open-user-mgmt" class="mt-3 px-3 py-2 text-sm rounded border">Open</button>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h5 class="font-semibold mb-2">System Configuration</h5>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Company info, work days/hours</li>
          <li>Shift definitions and overtime rules</li>
          <li>Holidays and special days</li>
        </ul>
        <button id="open-system-config" class="mt-3 px-3 py-2 text-sm rounded border">Open</button>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h5 class="font-semibold mb-2">Payroll Settings</h5>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Pay periods and salary rules</li>
          <li>Tax and deductions</li>
          <li>Loans and allowances</li>
        </ul>
        <button id="open-payroll-settings" class="mt-3 px-3 py-2 text-sm rounded border">Open</button>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h5 class="font-semibold mb-2">Attendance Settings</h5>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Clock-in methods</li>
          <li>Late/early/absence rules</li>
          <li>Leave types and policies</li>
        </ul>
        <button id="open-attendance-settings" class="mt-3 px-3 py-2 text-sm rounded border">Open</button>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h5 class="font-semibold mb-2">Notification Settings</h5>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Email/SMS templates</li>
          <li>Triggers and recipients</li>
        </ul>
        <button id="open-notification-settings" class="mt-3 px-3 py-2 text-sm rounded border">Open</button>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h5 class="font-semibold mb-2">Security Settings</h5>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Password policy, 2FA</li>
          <li>Session timeouts, lockouts</li>
        </ul>
        <button id="open-security-settings" class="mt-3 px-3 py-2 text-sm rounded border">Open</button>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h5 class="font-semibold mb-2">Backup & Data</h5>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Auto backups, manual backup/restore</li>
          <li>Import/export data</li>
        </ul>
        <button id="open-backup-settings" class="mt-3 px-3 py-2 text-sm rounded border">Open</button>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h5 class="font-semibold mb-2">Audit Logs</h5>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Logins, data changes</li>
          <li>Payroll runs and approvals</li>
        </ul>
        <button id="open-audit-logs" class="mt-3 px-3 py-2 text-sm rounded border">Open</button>
      </div>
    </div>

    <div id="settings-modal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50" data-close="true"></div>
      <div class="relative mx-auto mt-20 w-full max-w-3xl">
        <div class="bg-white rounded-lg shadow">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h5 class="font-semibold" id="settings-title">Settings</h5>
            <button class="text-gray-500 hover:text-gray-700 text-xl leading-none" data-close="true">×</button>
          </div>
          <div id="settings-body" class="p-4 text-sm text-gray-700">
            <div class="text-gray-500">This is a placeholder. We can wire each section to backend endpoints as needed.</div>
          </div>
          <div class="flex justify-end gap-2 border-t px-4 py-3">
            <button class="px-3 py-2 text-sm rounded border" data-close="true">Close</button>
            <button id="settings-save" class="px-3 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Save</button>
          </div>
        </div>
      </div>
    </div>`;

  const modalEl = document.getElementById('settings-modal');
  const openModal = () => modalEl.classList.remove('hidden');
  const closeModal = () => modalEl.classList.add('hidden');
  modalEl.querySelectorAll('[data-close="true"]').forEach(el => el.addEventListener('click', closeModal));

  const sections = [
    ['open-user-mgmt', 'User Management'],
    ['open-system-config', 'System Configuration'],
    ['open-payroll-settings', 'Payroll Settings'],
    ['open-attendance-settings', 'Attendance Settings'],
    ['open-notification-settings', 'Notification Settings'],
    ['open-security-settings', 'Security Settings'],
    ['open-backup-settings', 'Backup & Data Management'],
    ['open-audit-logs', 'Audit Logs'],
  ];
  sections.forEach(([id, title]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => {
      document.getElementById('settings-title').textContent = title;
      document.getElementById('settings-body').innerHTML = '<div class="text-gray-500">Coming soon – configurable options for ' + title + '.</div>';
      openModal();
    });
  });

  document.getElementById('settings-save').addEventListener('click', () => {
    // Placeholder save
    closeModal();
  });
}


