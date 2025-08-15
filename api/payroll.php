<?php
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');

  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
  }

  include 'connection-pdo.php';

  $operation = '';
  if ($_SERVER['REQUEST_METHOD'] == 'GET'){
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
  } else if($_SERVER['REQUEST_METHOD'] == 'POST'){
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
  }

  switch ($operation) {
    case 'generatePayroll':
      echo generatePayroll($conn);
      break;
    case 'listPayroll':
      echo listPayroll($conn);
      break;
    default:
      echo json_encode([]);
  }

  function generatePayroll($conn){
    $data = json_decode($_POST['json'], true);
    $empId = $data['employee_id'];
    $start = $data['payroll_period_start'];
    $end = $data['payroll_period_end'];
    $overtimeHours = floatval($data['overtime_hours']);
    $overtimeRate = floatval($data['overtime_rate']);
    $deductions = floatval($data['deductions']);
    $bonus = floatval($data['bonus']);

    // fetch employee salary
    $stmt = $conn->prepare('SELECT basic_salary FROM employees WHERE employee_id = :id');
    $stmt->bindParam(':id', $empId);
    $stmt->execute();
    $emp = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$emp) return json_encode(0);
    $basic = floatval($emp['basic_salary']);

    $overtimePay = $overtimeHours * $overtimeRate;
    $net = $basic + $overtimePay + $bonus - $deductions;

    $sql = "INSERT INTO payroll(employee_id, payroll_period_start, payroll_period_end, basic_salary, total_overtime_hours, overtime_pay, deductions, net_pay)
            VALUES(:employee_id, :start, :end, :basic, :ot_hours, :ot_pay, :deductions, :net)";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':employee_id', $empId);
    $stmt->bindParam(':start', $start);
    $stmt->bindParam(':end', $end);
    $stmt->bindParam(':basic', $basic);
    $stmt->bindParam(':ot_hours', $overtimeHours);
    $stmt->bindParam(':ot_pay', $overtimePay);
    $stmt->bindParam(':deductions', $deductions);
    $stmt->bindParam(':net', $net);
    $stmt->execute();

    return json_encode($stmt->rowCount() > 0 ? 1 : 0);
  }

  function listPayroll($conn){
    $sql = "SELECT p.*, e.first_name, e.last_name
            FROM payroll p
            INNER JOIN employees e ON e.employee_id = p.employee_id
            WHERE 1=1";
    $params = [];
    if (!empty($_GET['start_date'])) {
      $sql .= " AND p.payroll_period_start >= :start_date";
      $params[':start_date'] = $_GET['start_date'];
    }
    if (!empty($_GET['end_date'])) {
      $sql .= " AND p.payroll_period_end <= :end_date";
      $params[':end_date'] = $_GET['end_date'];
    }
    $sql .= " ORDER BY p.payroll_id DESC";
    $stmt = $conn->prepare($sql);
    foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return json_encode($rows);
  }
?>


