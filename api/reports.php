<?php
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');

  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
  }

  include 'connection-pdo.php';

  $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
  switch ($operation) {
    case 'attendanceSummary':
      echo attendanceSummary($conn);
      break;
    case 'payrollSummary':
      echo payrollSummary($conn);
      break;
    case 'dashboardSummary':
      echo dashboardSummary($conn);
      break;
    case 'attendanceOverview':
      echo attendanceOverview($conn);
      break;
    case 'payrollTrend':
      echo payrollTrend($conn);
      break;
    case 'overtimeDistribution':
      echo overtimeDistribution($conn);
      break;
    case 'leaveTypeDistribution':
      echo leaveTypeDistribution($conn);
      break;
    case 'deductionsBreakdown':
      echo deductionsBreakdown($conn);
      break;
    case 'employeeCountTrend':
      echo employeeCountTrend($conn);
      break;
    case 'absenceByDepartment':
      echo absenceByDepartment($conn);
      break;
    default:
      echo json_encode([]);
  }

  function attendanceSummary($conn){
    $sql = "SELECT status, COUNT(*) as cnt FROM attendance WHERE 1=1";
    $params = [];
    if (!empty($_GET['start_date'])) { $sql .= " AND attendance_date >= :start"; $params[':start'] = $_GET['start_date']; }
    if (!empty($_GET['end_date'])) { $sql .= " AND attendance_date <= :end"; $params[':end'] = $_GET['end_date']; }
    $sql .= " GROUP BY status";
    $stmt = $conn->prepare($sql);
    foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $out = ['present' => 0, 'absent' => 0, 'leave' => 0];
    foreach ($rows as $r) { $out[$r['status']] = intval($r['cnt']); }
    return json_encode($out);
  }

  function payrollSummary($conn){
    $sql = "SELECT COALESCE(SUM(net_pay),0) total_net_pay,
                   COALESCE(SUM(deductions),0) total_deductions,
                   COALESCE(SUM(overtime_pay),0) total_overtime_pay
            FROM payroll WHERE 1=1";
    $params = [];
    if (!empty($_GET['start_date'])) { $sql .= " AND payroll_period_start >= :start"; $params[':start'] = $_GET['start_date']; }
    if (!empty($_GET['end_date'])) { $sql .= " AND payroll_period_end <= :end"; $params[':end'] = $_GET['end_date']; }
    $stmt = $conn->prepare($sql);
    foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return json_encode($row ?: ['total_net_pay' => 0, 'total_deductions' => 0, 'total_overtime_pay' => 0]);
  }

  function dashboardSummary($conn){
    // total employees
    $total = (int)$conn->query("SELECT COUNT(*) FROM employees")->fetchColumn();
    $presentToday = (int)$conn->query("SELECT COUNT(*) FROM attendance WHERE attendance_date = CURDATE() AND status='present'")->fetchColumn();
    $pendingLeaves = (int)$conn->query("SELECT COUNT(*) FROM leaves WHERE status='pending'")->fetchColumn();
    $processedPayrolls = (int)$conn->query("SELECT COUNT(*) FROM payroll WHERE MONTH(payroll_period_end)=MONTH(CURDATE()) AND YEAR(payroll_period_end)=YEAR(CURDATE())")->fetchColumn();

    // Upcoming birthdays (next 30 days)
    $birthdays = $conn->query("SELECT employee_id, first_name, last_name, DATE_FORMAT(date_of_birth, '%m-%d') md FROM employees WHERE date_of_birth IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC);
    $upcoming_birthdays = [];
    $todayMd = date('m-d');
    $window = new DateTime('+30 days');
    foreach ($birthdays as $b) {
      $year = date('Y');
      $dateThisYear = DateTime::createFromFormat('Y-m-d', $year . '-' . $b['md']);
      if (!$dateThisYear) { continue; }
      $now = new DateTime('today');
      if ($dateThisYear < $now) { $dateThisYear->modify('+1 year'); }
      $diff = $now->diff($dateThisYear)->days;
      if ($diff <= 30) {
        $upcoming_birthdays[] = [
          'employee_id' => $b['employee_id'],
          'name' => $b['first_name'] . ' ' . $b['last_name'],
          'date' => $dateThisYear->format('Y-m-d')
        ];
      }
    }

    // Upcoming work anniversaries (next 30 days)
    $annivRows = $conn->query("SELECT employee_id, first_name, last_name, DATE_FORMAT(date_hired, '%m-%d') md FROM employees WHERE date_hired IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC);
    $upcoming_anniversaries = [];
    foreach ($annivRows as $a) {
      $year = date('Y');
      $dateThisYear = DateTime::createFromFormat('Y-m-d', $year . '-' . $a['md']);
      if (!$dateThisYear) { continue; }
      $now = new DateTime('today');
      if ($dateThisYear < $now) { $dateThisYear->modify('+1 year'); }
      $diff = $now->diff($dateThisYear)->days;
      if ($diff <= 30) {
        $upcoming_anniversaries[] = [
          'employee_id' => $a['employee_id'],
          'name' => $a['first_name'] . ' ' . $a['last_name'],
          'date' => $dateThisYear->format('Y-m-d')
        ];
      }
    }

    return json_encode([
      'total_employees' => $total,
      'present_today' => $presentToday,
      'pending_leaves' => $pendingLeaves,
      'payrolls_processed_this_month' => $processedPayrolls,
      'upcoming_birthdays' => $upcoming_birthdays,
      'upcoming_anniversaries' => $upcoming_anniversaries,
    ]);
  }

  // Chart Functions
  function attendanceOverview($conn) {
    $period = isset($_GET['period']) ? $_GET['period'] : 'week';
    
    if ($period === 'week') {
      $sql = "SELECT 
                DATE(attendance_date) as date,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as onLeave
              FROM attendance 
              WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
              GROUP BY DATE(attendance_date)
              ORDER BY date";
    } else {
      $sql = "SELECT 
                DATE(attendance_date) as date,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as onLeave
              FROM attendance 
              WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
              GROUP BY DATE(attendance_date)
              ORDER BY date";
    }
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $labels = [];
    $present = [];
    $late = [];
    $absent = [];
    $onLeave = [];
    
    foreach ($rows as $row) {
      $labels[] = date('D', strtotime($row['date']));
      $present[] = (int)$row['present'];
      $late[] = (int)$row['late'];
      $absent[] = (int)$row['absent'];
      $onLeave[] = (int)$row['onLeave'];
    }
    
    return json_encode([
      'labels' => $labels,
      'present' => $present,
      'late' => $late,
      'absent' => $absent,
      'onLeave' => $onLeave
    ]);
  }

  function payrollTrend($conn) {
    $months = isset($_GET['months']) ? (int)$_GET['months'] : 6;
    
    $sql = "SELECT 
              DATE_FORMAT(payroll_period_end, '%Y-%m') as month,
              SUM(net_pay + deductions) as total_expense
            FROM payroll 
            WHERE payroll_period_end >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(payroll_period_end, '%Y-%m')
            ORDER BY month";
    
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(1, $months, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $labels = [];
    $expenses = [];
    
    foreach ($rows as $row) {
      $labels[] = date('M', strtotime($row['month'] . '-01'));
      $expenses[] = (float)$row['total_expense'];
    }
    
    return json_encode([
      'labels' => $labels,
      'expenses' => $expenses
    ]);
  }

  function overtimeDistribution($conn) {
    $sql = "SELECT 
              e.department,
              COALESCE(SUM(p.overtime_hours), 0) as total_overtime
            FROM employees e
            LEFT JOIN payroll p ON e.employee_id = p.employee_id
            WHERE e.department IS NOT NULL
            GROUP BY e.department
            HAVING total_overtime > 0
            ORDER BY total_overtime DESC
            LIMIT 10";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $labels = [];
    $hours = [];
    
    foreach ($rows as $row) {
      $labels[] = $row['department'] ?: 'Unknown';
      $hours[] = (int)$row['total_overtime'];
    }
    
    return json_encode([
      'labels' => $labels,
      'hours' => $hours
    ]);
  }

  function leaveTypeDistribution($conn) {
    $sql = "SELECT 
              leave_type,
              COUNT(*) as count
            FROM leaves 
            WHERE status != 'rejected'
            GROUP BY leave_type
            ORDER BY count DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $labels = [];
    $counts = [];
    
    foreach ($rows as $row) {
      $labels[] = ucfirst($row['leave_type'] ?: 'Other');
      $counts[] = (int)$row['count'];
    }
    
    return json_encode([
      'labels' => $labels,
      'counts' => $counts
    ]);
  }

  function deductionsBreakdown($conn) {
    $sql = "SELECT 
              'SSS' as deduction_type,
              COALESCE(SUM(sss_deduction), 0) as amount
            FROM payroll
            UNION ALL
            SELECT 
              'PhilHealth' as deduction_type,
              COALESCE(SUM(philhealth_deduction), 0) as amount
            FROM payroll
            UNION ALL
            SELECT 
              'Pag-IBIG' as deduction_type,
              COALESCE(SUM(pagibig_deduction), 0) as amount
            FROM payroll
            UNION ALL
            SELECT 
              'Tax' as deduction_type,
              COALESCE(SUM(tax_deduction), 0) as amount
            FROM payroll
            UNION ALL
            SELECT 
              'Other' as deduction_type,
              COALESCE(SUM(deductions - COALESCE(sss_deduction, 0) - COALESCE(philhealth_deduction, 0) - COALESCE(pagibig_deduction, 0) - COALESCE(tax_deduction, 0)), 0) as amount
            FROM payroll
            HAVING amount > 0";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $labels = [];
    $amounts = [];
    
    foreach ($rows as $row) {
      $labels[] = $row['deduction_type'];
      $amounts[] = (float)$row['amount'];
    }
    
    return json_encode([
      'labels' => $labels,
      'amounts' => $amounts
    ]);
  }

  function employeeCountTrend($conn) {
    $months = isset($_GET['months']) ? (int)$_GET['months'] : 12;
    
    $sql = "SELECT 
              DATE_FORMAT(date_hired, '%Y-%m') as month,
              COUNT(*) as new_employees
            FROM employees 
            WHERE date_hired >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(date_hired, '%Y-%m')
            ORDER BY month";
    
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(1, $months, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $labels = [];
    $counts = [];
    $runningTotal = 0;
    
    // Generate month labels for the last N months
    for ($i = $months - 1; $i >= 0; $i--) {
      $date = date('Y-m', strtotime("-$i months"));
      $labels[] = date('M', strtotime($date . '-01'));
      
      // Find count for this month
      $monthCount = 0;
      foreach ($rows as $row) {
        if ($row['month'] === $date) {
          $monthCount = (int)$row['new_employees'];
          break;
        }
      }
      
      $runningTotal += $monthCount;
      $counts[] = $runningTotal;
    }
    
    return json_encode([
      'labels' => $labels,
      'counts' => $counts
    ]);
  }

  function absenceByDepartment($conn) {
    $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
    if ($days <= 0) { $days = 30; }
    $sql = "SELECT e.department, COUNT(*) AS absent_count
            FROM attendance a
            INNER JOIN employees e ON e.employee_id = a.employee_id
            WHERE a.status = 'absent' 
              AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
              AND e.department IS NOT NULL AND e.department <> ''
            GROUP BY e.department
            ORDER BY absent_count DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':days', $days, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $labels = [];
    $counts = [];
    foreach ($rows as $row) {
      $labels[] = $row['department'];
      $counts[] = (int)$row['absent_count'];
    }
    return json_encode(['labels' => $labels, 'counts' => $counts]);
  }
?>


