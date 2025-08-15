<?php
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');
  if (session_status() === PHP_SESSION_NONE) { session_start(); }

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
    case 'listRecent':
      echo listRecent($conn);
      break;
    case 'listPending':
      echo listPending($conn);
      break;
    case 'requestLeave':
      echo requestLeave($conn, $json);
      break;
    case 'listByEmployee':
      echo listByEmployee($conn);
      break;
    case 'approve':
      echo setStatus($conn, $json, 'approved');
      break;
    case 'reject':
      echo setStatus($conn, $json, 'rejected');
      break;
    default:
      echo json_encode([]);
  }

  function listRecent($conn){
    $sql = "SELECT l.*, e.first_name, e.last_name,
                   u1.username AS approved_by_username,
                   u2.username AS rejected_by_username
            FROM leaves l
            INNER JOIN employees e ON e.employee_id = l.employee_id
            LEFT JOIN users u1 ON u1.user_id = l.approved_by
            LEFT JOIN users u2 ON u2.user_id = l.rejected_by
            ORDER BY l.created_at DESC LIMIT 20";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  function listPending($conn){
    $sql = "SELECT l.*, e.first_name, e.last_name FROM leaves l
            INNER JOIN employees e ON e.employee_id = l.employee_id
            WHERE l.status = 'pending'
            ORDER BY l.created_at ASC";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  function requestLeave($conn, $json){
    $data = json_decode($json, true);
    $employee_id = isset($data['employee_id']) ? intval($data['employee_id']) : 0;
    if ($employee_id <= 0 && isset($_SESSION['user_id'])){
      // Fallback: derive employee_id from logged-in user
      $u = $conn->prepare('SELECT employee_id FROM users WHERE user_id = :id LIMIT 1');
      $u->bindParam(':id', $_SESSION['user_id'], PDO::PARAM_INT);
      $u->execute();
      $row = $u->fetch(PDO::FETCH_ASSOC);
      if ($row && intval($row['employee_id']) > 0){ $employee_id = intval($row['employee_id']); }
    }
    if ($employee_id <= 0){
      return json_encode(['success' => 0, 'message' => 'No employee mapping']);
    }
    $sql = "INSERT INTO leaves(employee_id, start_date, end_date, reason, status)
            VALUES(:employee_id, :start, :end, :reason, 'pending')";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':employee_id', $employee_id, PDO::PARAM_INT);
    $stmt->bindParam(':start', $data['start_date']);
    $stmt->bindParam(':end', $data['end_date']);
    $stmt->bindParam(':reason', $data['reason']);
    $stmt->execute();
    return json_encode(['success' => $stmt->rowCount() > 0 ? 1 : 0]);
  }

  function listByEmployee($conn){
    $employee_id = isset($_GET['employee_id']) ? intval($_GET['employee_id']) : 0;
    if ($employee_id <= 0) return json_encode([]);
    $sql = "SELECT l.*, u1.username AS approved_by_username, u2.username AS rejected_by_username FROM leaves l
            LEFT JOIN users u1 ON u1.user_id = l.approved_by
            LEFT JOIN users u2 ON u2.user_id = l.rejected_by
            WHERE l.employee_id = :eid
            ORDER BY l.created_at DESC LIMIT 50";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':eid', $employee_id, PDO::PARAM_INT);
    $stmt->execute();
    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  function setStatus($conn, $json, $status){
    $data = json_decode($json, true);
    $actor = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : null;
    $setExtra = '';
    if ($status === 'approved') {
      $setExtra = ', approved_by = :actor, approved_at = NOW(), rejected_by = NULL, rejected_at = NULL';
    } else if ($status === 'rejected') {
      $setExtra = ', rejected_by = :actor, rejected_at = NOW(), approved_by = NULL, approved_at = NULL';
    }
    $sql = "UPDATE leaves SET status = :status" . $setExtra . " WHERE leave_id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':status', $status);
    $stmt->bindParam(':id', $data['leave_id']);
    if ($actor !== null) { $stmt->bindParam(':actor', $actor, PDO::PARAM_INT); }
    $stmt->execute();
    $ok = $stmt->rowCount() > 0;

    // Push a notification to the employee
    if ($ok) {
      try {
        $sel = $conn->prepare('SELECT employee_id FROM leaves WHERE leave_id = :id LIMIT 1');
        $sel->bindParam(':id', $data['leave_id'], PDO::PARAM_INT);
        $sel->execute();
        $row = $sel->fetch(PDO::FETCH_ASSOC);
        if ($row && intval($row['employee_id']) > 0) {
          $message = $status === 'approved' ? 'Your leave request was approved' : 'Your leave request was rejected';
          $ins = $conn->prepare('INSERT INTO notifications(employee_id, message, type, actor_user_id) VALUES(:eid, :msg, :type, :actor)');
          $type = $status;
          $eid = intval($row['employee_id']);
          $ins->bindParam(':eid', $eid, PDO::PARAM_INT);
          $ins->bindParam(':msg', $message);
          $ins->bindParam(':type', $type);
          if ($actor !== null) { $ins->bindParam(':actor', $actor, PDO::PARAM_INT); } else { $null = null; $ins->bindParam(':actor', $null, PDO::PARAM_NULL); }
          $ins->execute();
        }
      } catch (Exception $e) { /* ignore notification errors */ }
    }

    return json_encode($ok ? 1 : 0);
  }
?>


