<?php
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');

  if (session_status() === PHP_SESSION_NONE) {
    session_start();
  }

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
    case 'getNotifications':
      echo getNotifications($conn);
      break;
    case 'markAsRead':
      echo markAsRead($conn, $json);
      break;
    case 'deleteNotification':
      echo deleteNotification($conn, $json);
      break;
    default:
      echo json_encode(['success' => 0, 'message' => 'Invalid operation']);
  }

  function getNotifications($conn){
    if (!isset($_SESSION['user_id'])){
      return json_encode(['success' => 0, 'message' => 'Not authenticated']);
    }
    
    try {
      // Get employee_id from the logged-in user
      $stmt = $conn->prepare("SELECT employee_id FROM users WHERE user_id = :user_id LIMIT 1");
      $stmt->bindParam(':user_id', $_SESSION['user_id'], PDO::PARAM_INT);
      $stmt->execute();
      $user = $stmt->fetch(PDO::FETCH_ASSOC);
      
      if (!$user || !$user['employee_id']) {
        return json_encode(['success' => 0, 'message' => 'No employee mapping found']);
      }
      
      $employee_id = intval($user['employee_id']);
      
      // Get notifications for this employee
      $stmt = $conn->prepare("SELECT * FROM notifications WHERE employee_id = :employee_id ORDER BY created_at DESC LIMIT 50");
      $stmt->bindParam(':employee_id', $employee_id, PDO::PARAM_INT);
      $stmt->execute();
      
      $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
      
      return json_encode([
        'success' => 1,
        'notifications' => $notifications
      ]);
      
    } catch (Exception $e) {
      return json_encode(['success' => 0, 'message' => 'Database error: ' . $e->getMessage()]);
    }
  }

  function markAsRead($conn, $json){
    if (!isset($_SESSION['user_id'])){
      return json_encode(['success' => 0, 'message' => 'Not authenticated']);
    }
    
    $data = json_decode($json, true);
    if (!isset($data['notification_id'])) {
      return json_encode(['success' => 0, 'message' => 'Notification ID required']);
    }
    
    try {
      $stmt = $conn->prepare("UPDATE notifications SET read_at = NOW() WHERE id = :id");
      $stmt->bindParam(':id', $data['notification_id'], PDO::PARAM_INT);
      $stmt->execute();
      
      return json_encode(['success' => 1]);
      
    } catch (Exception $e) {
      return json_encode(['success' => 0, 'message' => 'Database error: ' . $e->getMessage()]);
    }
  }

  function deleteNotification($conn, $json){
    if (!isset($_SESSION['user_id'])){
      return json_encode(['success' => 0, 'message' => 'Not authenticated']);
    }
    
    $data = json_decode($json, true);
    if (!isset($data['notification_id'])) {
      return json_encode(['success' => 0, 'message' => 'Notification ID required']);
    }
    
    try {
      $stmt = $conn->prepare("DELETE FROM notifications WHERE id = :id");
      $stmt->bindParam(':id', $data['notification_id'], PDO::PARAM_INT);
      $stmt->execute();
      
      return json_encode(['success' => 1]);
      
    } catch (Exception $e) {
      return json_encode(['success' => 0, 'message' => 'Database error: ' . $e->getMessage()]);
    }
  }
?>
