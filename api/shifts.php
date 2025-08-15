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
  $json = '';
  if ($_SERVER['REQUEST_METHOD'] == 'GET'){
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
  } else if($_SERVER['REQUEST_METHOD'] == 'POST'){
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
  }

  switch ($operation) {
    case 'list':
      echo listShifts($conn);
      break;
    case 'create':
      echo createShift($conn, $json);
      break;
    case 'update':
      echo updateShift($conn, $json);
      break;
    case 'delete':
      echo deleteShift($conn, $json);
      break;
    default:
      echo json_encode([]);
  }

  function listShifts($conn){
    $sql = "SELECT s.*, e.first_name, e.last_name FROM shifts s INNER JOIN employees e ON e.employee_id = s.employee_id WHERE 1=1";
    $params = [];
    if (!empty($_GET['start_date'])) { $sql .= " AND s.shift_date >= :start"; $params[':start'] = $_GET['start_date']; }
    if (!empty($_GET['end_date'])) { $sql .= " AND s.shift_date <= :end"; $params[':end'] = $_GET['end_date']; }
    $sql .= " ORDER BY s.shift_date ASC, s.start_time ASC";
    $stmt = $conn->prepare($sql);
    foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
    $stmt->execute();
    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  function createShift($conn, $json){
    $data = json_decode($json, true);
    $sql = "INSERT INTO shifts(employee_id, shift_date, start_time, end_time, location, notes)
            VALUES(:employee_id, :shift_date, :start_time, :end_time, :location, :notes)";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':employee_id', $data['employee_id']);
    $stmt->bindParam(':shift_date', $data['shift_date']);
    $stmt->bindParam(':start_time', $data['start_time']);
    $stmt->bindParam(':end_time', $data['end_time']);
    $stmt->bindParam(':location', $data['location']);
    $stmt->bindParam(':notes', $data['notes']);
    $stmt->execute();
    return json_encode($stmt->rowCount() > 0 ? 1 : 0);
  }

  function updateShift($conn, $json){
    $data = json_decode($json, true);
    $sql = "UPDATE shifts SET employee_id=:employee_id, shift_date=:shift_date, start_time=:start_time, end_time=:end_time, location=:location, notes=:notes WHERE shift_id=:shift_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':shift_id', $data['shift_id']);
    $stmt->bindParam(':employee_id', $data['employee_id']);
    $stmt->bindParam(':shift_date', $data['shift_date']);
    $stmt->bindParam(':start_time', $data['start_time']);
    $stmt->bindParam(':end_time', $data['end_time']);
    $stmt->bindParam(':location', $data['location']);
    $stmt->bindParam(':notes', $data['notes']);
    $stmt->execute();
    return json_encode($stmt->rowCount() > 0 ? 1 : 0);
  }

  function deleteShift($conn, $json){
    $data = json_decode($json, true);
    $stmt = $conn->prepare('DELETE FROM shifts WHERE shift_id = :id');
    $stmt->bindParam(':id', $data['shift_id']);
    $stmt->execute();
    return json_encode($stmt->rowCount() > 0 ? 1 : 0);
  }
?>




