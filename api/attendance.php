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
    case 'getAttendance':
      echo getAttendance($conn);
      break;
    case 'recordAttendance':
      echo recordAttendance($conn);
      break;
    case 'updateAttendance':
      echo updateAttendance($conn);
      break;
    case 'deleteAttendance':
      echo deleteAttendance($conn);
      break;
    default:
      echo json_encode([]);
  }

  function getAttendance($conn){
    $sql = "SELECT a.*, e.first_name, e.last_name, e.department, e.position
            FROM attendance a
            INNER JOIN employees e ON e.employee_id = a.employee_id
            WHERE 1=1";
    $params = [];
    if (!empty($_GET['start_date'])) {
      $sql .= " AND a.attendance_date >= :start_date";
      $params[':start_date'] = $_GET['start_date'];
    }
    if (!empty($_GET['end_date'])) {
      $sql .= " AND a.attendance_date <= :end_date";
      $params[':end_date'] = $_GET['end_date'];
    }
    $sql .= " ORDER BY a.attendance_date DESC, a.attendance_id DESC";

    $stmt = $conn->prepare($sql);
    foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return json_encode($rows);
  }

  function recordAttendance($conn){
    $data = json_decode($_POST['json'], true);
    // prevent duplicate per employee/date using INSERT IGNORE with unique index
    $sql = "INSERT IGNORE INTO attendance(employee_id, attendance_date, time_in, time_out, status, remarks)
            VALUES(:employee_id, :attendance_date, :time_in, :time_out, :status, :remarks)";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':employee_id', $data['employee_id']);
    $stmt->bindParam(':attendance_date', $data['attendance_date']);
    $stmt->bindParam(':time_in', $data['time_in']);
    $stmt->bindParam(':time_out', $data['time_out']);
    $stmt->bindParam(':status', $data['status']);
    $stmt->bindParam(':remarks', $data['remarks']);
    $stmt->execute();
    return json_encode($stmt->rowCount() > 0 ? 1 : 0);
  }

  function updateAttendance($conn){
    $data = json_decode($_POST['json'], true);
    $sql = "UPDATE attendance SET
              employee_id = :employee_id,
              attendance_date = :attendance_date,
              time_in = :time_in,
              time_out = :time_out,
              status = :status,
              remarks = :remarks
            WHERE attendance_id = :attendance_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':attendance_id', $data['attendance_id']);
    $stmt->bindParam(':employee_id', $data['employee_id']);
    $stmt->bindParam(':attendance_date', $data['attendance_date']);
    $stmt->bindParam(':time_in', $data['time_in']);
    $stmt->bindParam(':time_out', $data['time_out']);
    $stmt->bindParam(':status', $data['status']);
    $stmt->bindParam(':remarks', $data['remarks']);
    $stmt->execute();
    return json_encode($stmt->rowCount() > 0 ? 1 : 0);
  }

  function deleteAttendance($conn){
    $data = json_decode($_POST['json'], true);
    $sql = "DELETE FROM attendance WHERE attendance_id = :attendance_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':attendance_id', $data['attendance_id']);
    $stmt->execute();
    return json_encode($stmt->rowCount() > 0 ? 1 : 0);
  }
?>


