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
    $json = isset($_GET['json']) ? $_GET['json'] : '';
  } else if($_SERVER['REQUEST_METHOD'] == 'POST'){
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
  }

  switch ($operation) {
    case 'getEmployees':
      echo getEmployees($conn);
      break;
    case 'getEmployee':
      echo getEmployee($conn);
      break;
    case 'createEmployee':
      echo createEmployee($conn, $json);
      break;
    case 'updateEmployee':
      echo updateEmployee($conn, $json);
      break;
    case 'deleteEmployee':
      echo deleteEmployee($conn, $json);
      break;
    default:
      echo json_encode([]);
  }

  function getEmployees($conn){
    $sql = "SELECT * FROM employees ORDER BY last_name, first_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return json_encode($rows);
  }

  function getEmployee($conn){
    $id = isset($_GET['employee_id']) ? intval($_GET['employee_id']) : 0;
    if ($id <= 0) { return json_encode(null); }
    $sql = "SELECT * FROM employees WHERE employee_id = :id LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return json_encode($row ?: null);
  }

  function createEmployee($conn, $json){
    $data = json_decode($json, true);
    $sql = "INSERT INTO employees(first_name, last_name, email, phone, department, position, basic_salary, date_hired, status)
            VALUES(:first_name, :last_name, :email, :phone, :department, :position, :basic_salary, :date_hired, :status)";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':first_name', $data['first_name']);
    $stmt->bindParam(':last_name', $data['last_name']);
    $stmt->bindParam(':email', $data['email']);
    $stmt->bindParam(':phone', $data['phone']);
    $stmt->bindParam(':department', $data['department']);
    $stmt->bindParam(':position', $data['position']);
    $stmt->bindParam(':basic_salary', $data['basic_salary']);
    $stmt->bindParam(':date_hired', $data['date_hired']);
    $status = isset($data['status']) ? $data['status'] : 'active';
    $stmt->bindParam(':status', $status);
    $stmt->execute();
    $success = $stmt->rowCount() > 0;
    $response = ['success' => $success ? 1 : 0];
    if ($success && isset($data['position']) && ($data['position'] === 'hr' || $data['position'] === 'employee')){
      // Create account with username = email for HR/Employee when requested
      $email = isset($data['email']) ? trim($data['email']) : '';
      if ($email !== ''){
        $empId = (int)$conn->lastInsertId();
        $exists = $conn->prepare('SELECT user_id FROM users WHERE username = :u LIMIT 1');
        $exists->bindParam(':u', $email);
        $exists->execute();
        $u = $exists->fetch(PDO::FETCH_ASSOC);
        if (!$u){
          $plain = '';
          if (isset($data['user_password']) && $data['user_password'] !== '') { $plain = $data['user_password']; }
          elseif (isset($data['hr_password']) && $data['hr_password'] !== '') { $plain = $data['hr_password']; }
          else { $plain = generateRandomPassword(10); }
          $hash = password_hash($plain, PASSWORD_DEFAULT);
          $role = $data['position'] === 'hr' ? 'hr' : 'employee';
          $ins = $conn->prepare("INSERT INTO users(username, password, role, employee_id) VALUES(:u, :p, :r, :eid)");
          $ins->bindParam(':u', $email);
          $ins->bindParam(':p', $hash);
          $ins->bindParam(':r', $role);
          $ins->bindParam(':eid', $empId, PDO::PARAM_INT);
          $ins->execute();
          $response['generated_password'] = $plain;
        } else {
          // Ensure mapping and role are correct
          $newRole = $data['position'] === 'hr' ? 'hr' : 'employee';
          $upd = $conn->prepare("UPDATE users SET role=:r, employee_id=:eid WHERE username=:u");
          $upd->bindParam(':eid', $empId, PDO::PARAM_INT);
          $upd->bindParam(':r', $newRole);
          $upd->bindParam(':u', $email);
          $upd->execute();
        }
      }
    }
    return json_encode($response);
  }

  function updateEmployee($conn, $json){
    $data = json_decode($json, true);
    // Normalize inputs with safe defaults
    $data['first_name'] = isset($data['first_name']) ? $data['first_name'] : '';
    $data['last_name'] = isset($data['last_name']) ? $data['last_name'] : '';
    $data['email'] = isset($data['email']) ? $data['email'] : '';
    $data['phone'] = isset($data['phone']) ? $data['phone'] : '';
    $data['department'] = isset($data['department']) ? $data['department'] : '';
    $data['position'] = isset($data['position']) ? $data['position'] : 'employee';
    $data['basic_salary'] = isset($data['basic_salary']) ? $data['basic_salary'] : 0;
    $data['date_hired'] = isset($data['date_hired']) ? $data['date_hired'] : null;
    $data['status'] = isset($data['status']) ? $data['status'] : 'active';

    $empId = isset($data['employee_id']) ? intval($data['employee_id']) : 0;
    $inserted = false;
    $success = false;
    $response = ['success' => 0];

    // If no employee_id provided or employee does not exist, create it (upsert behavior)
    if ($empId <= 0) {
      $ins = $conn->prepare("INSERT INTO employees(first_name, last_name, email, phone, department, position, basic_salary, date_hired, status)
                             VALUES(:first_name, :last_name, :email, :phone, :department, :position, :basic_salary, :date_hired, :status)");
      $ins->bindParam(':first_name', $data['first_name']);
      $ins->bindParam(':last_name', $data['last_name']);
      $ins->bindParam(':email', $data['email']);
      $ins->bindParam(':phone', $data['phone']);
      $ins->bindParam(':department', $data['department']);
      $ins->bindParam(':position', $data['position']);
      $ins->bindParam(':basic_salary', $data['basic_salary']);
      $ins->bindParam(':date_hired', $data['date_hired']);
      $ins->bindParam(':status', $data['status']);
      $ins->execute();
      if ($ins->rowCount() > 0) {
        $empId = (int)$conn->lastInsertId();
        $data['employee_id'] = $empId;
        $inserted = true;
        $success = true;
        $response['success'] = 1;

        // If a session user exists, map this employee to that user (avoid creating duplicates)
        if (isset($_SESSION['user_id'])) {
          $uid = intval($_SESSION['user_id']);
          $map = $conn->prepare("UPDATE users SET employee_id = :eid WHERE user_id = :uid");
          $map->bindParam(':eid', $empId, PDO::PARAM_INT);
          $map->bindParam(':uid', $uid, PDO::PARAM_INT);
          $map->execute();

          // Optionally sync username to provided email if set and unique
          $email = trim($data['email']);
          if ($email !== '') {
            $conf = $conn->prepare('SELECT user_id FROM users WHERE username = :u LIMIT 1');
            $conf->bindParam(':u', $email);
            $conf->execute();
            $exists = $conf->fetch(PDO::FETCH_ASSOC);
            if (!$exists || intval($exists['user_id']) === $uid) {
              $updU = $conn->prepare("UPDATE users SET username = :u WHERE user_id = :uid");
              $updU->bindParam(':u', $email);
              $updU->bindParam(':uid', $uid, PDO::PARAM_INT);
              $updU->execute();
            }
          }
          // Set role based on position if sensible
          $role = ($data['position'] === 'hr') ? 'hr' : 'employee';
          $updRole = $conn->prepare("UPDATE users SET role = :r WHERE user_id = :uid");
          $updRole->bindParam(':r', $role);
          $updRole->bindParam(':uid', $uid, PDO::PARAM_INT);
          $updRole->execute();
        }
      }
    } else {
      // Ensure employee exists; if not, fallback to insert
      $sel = $conn->prepare("SELECT 1 FROM employees WHERE employee_id = :id LIMIT 1");
      $sel->bindParam(':id', $empId, PDO::PARAM_INT);
      $sel->execute();
      $exists = $sel->fetch(PDO::FETCH_ASSOC);

      if (!$exists) {
        // Insert instead
        $ins = $conn->prepare("INSERT INTO employees(first_name, last_name, email, phone, department, position, basic_salary, date_hired, status)
                               VALUES(:first_name, :last_name, :email, :phone, :department, :position, :basic_salary, :date_hired, :status)");
        $ins->bindParam(':first_name', $data['first_name']);
        $ins->bindParam(':last_name', $data['last_name']);
        $ins->bindParam(':email', $data['email']);
        $ins->bindParam(':phone', $data['phone']);
        $ins->bindParam(':department', $data['department']);
        $ins->bindParam(':position', $data['position']);
        $ins->bindParam(':basic_salary', $data['basic_salary']);
        $ins->bindParam(':date_hired', $data['date_hired']);
        $ins->bindParam(':status', $data['status']);
        $ins->execute();
        if ($ins->rowCount() > 0) {
          $empId = (int)$conn->lastInsertId();
          $data['employee_id'] = $empId;
          $inserted = true;
          $success = true;
          $response['success'] = 1;
        }
      } else {
        // Perform update
        $sql = "UPDATE employees SET
                  first_name = :first_name,
                  last_name = :last_name,
                  email = :email,
                  phone = :phone,
                  department = :department,
                  position = :position,
                  basic_salary = :basic_salary,
                  date_hired = :date_hired,
                  status = :status
                WHERE employee_id = :employee_id";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':employee_id', $empId, PDO::PARAM_INT);
        $stmt->bindParam(':first_name', $data['first_name']);
        $stmt->bindParam(':last_name', $data['last_name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':phone', $data['phone']);
        $stmt->bindParam(':department', $data['department']);
        $stmt->bindParam(':position', $data['position']);
        $stmt->bindParam(':basic_salary', $data['basic_salary']);
        $stmt->bindParam(':date_hired', $data['date_hired']);
        $stmt->bindParam(':status', $data['status']);
        $stmt->execute();
        $success = $stmt->rowCount() >= 0; // treat as success even if values unchanged
        $response['success'] = $success ? 1 : 0;
      }
    }
    
    // Add notification for profile update
    if ($success) {
      try {
        $message = 'Your profile has been updated successfully';
        $ins = $conn->prepare('INSERT INTO notifications(employee_id, message, type, actor_user_id) VALUES(:eid, :msg, :type, :actor)');
        $eid = intval($data['employee_id']);
        $type = 'profile_update';
        $actor = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : null;
        
        $ins->bindParam(':eid', $eid, PDO::PARAM_INT);
        $ins->bindParam(':msg', $message);
        $ins->bindParam(':type', $type);
        if ($actor !== null) {
          $ins->bindParam(':actor', $actor, PDO::PARAM_INT);
        } else {
          $null = null;
          $ins->bindParam(':actor', $null, PDO::PARAM_NULL);
        }
        $ins->execute();
        $response['notification_created'] = true;
      } catch (Exception $e) {
        // ignore notification errors
        $response['notification_error'] = $e->getMessage();
      }
    }
    
    // Keep login in sync with employee email (for both HR and Employee accounts)
    $email = isset($data['email']) ? trim($data['email']) : '';
    $empId = isset($data['employee_id']) ? intval($data['employee_id']) : 0;
    $plainPwd = isset($data['hr_password']) ? trim($data['hr_password']) : '';
    if ($email !== '' && $empId > 0){
      // Find any user mapped to this employee (hr or employee)
      $byEmp = $conn->prepare("SELECT user_id, username, role FROM users WHERE employee_id = :eid LIMIT 1");
      $byEmp->bindParam(':eid', $empId, PDO::PARAM_INT);
      $byEmp->execute();
      $mapped = $byEmp->fetch(PDO::FETCH_ASSOC);

      if ($mapped){
        if (strcasecmp($mapped['username'], $email) !== 0){
          $conf = $conn->prepare('SELECT user_id FROM users WHERE username = :u LIMIT 1');
          $conf->bindParam(':u', $email);
          $conf->execute();
          $confRow = $conf->fetch(PDO::FETCH_ASSOC);
          if (!$confRow || intval($confRow['user_id']) === intval($mapped['user_id'])){
            $updUser = $conn->prepare("UPDATE users SET username = :u WHERE user_id = :id");
            $updUser->bindParam(':u', $email);
            $updUser->bindParam(':id', $mapped['user_id'], PDO::PARAM_INT);
            $updUser->execute();
            $response['username_updated'] = true;
            $mapped['username'] = $email;
          } else {
            $response['username_conflict'] = true;
          }
        }
        if ($plainPwd !== ''){
          $hash = password_hash($plainPwd, PASSWORD_DEFAULT);
          $updPwd = $conn->prepare("UPDATE users SET password = :p WHERE user_id = :id");
          $updPwd->bindParam(':p', $hash);
          $updPwd->bindParam(':id', $mapped['user_id'], PDO::PARAM_INT);
          $updPwd->execute();
          $response['password_updated'] = true;
        }
        $response['effective_username'] = $mapped['username'];
        
        // Return updated user information for frontend sync
        $response['updated_user'] = [
          'user_id' => $mapped['user_id'],
          'username' => $mapped['username'],
          'role' => $mapped['role'],
          'employee_id' => $empId
        ];
        
        // Also return updated employee information
        $response['updated_employee'] = [
          'employee_id' => $empId,
          'first_name' => $data['first_name'],
          'last_name' => $data['last_name'],
          'email' => $data['email'],
          'phone' => $data['phone'],
          'department' => $data['department'],
          'position' => $data['position']
        ];
      } else {
        // If no mapped user yet, create based on position
        if (isset($data['position']) && $data['position'] === 'hr') {
          // Try to map pre-seeded HR user without employee_id
          $byPrev = $conn->prepare("SELECT user_id FROM users WHERE employee_id IS NULL AND role = 'hr' AND username != :u LIMIT 1");
          $byPrev->bindParam(':u', $email);
          $byPrev->execute();
          $prev = $byPrev->fetch(PDO::FETCH_ASSOC);
          if ($prev){
            $updPrev = $conn->prepare("UPDATE users SET username = :u, employee_id = :eid WHERE user_id = :id");
            $updPrev->bindParam(':u', $email);
            $updPrev->bindParam(':eid', $empId, PDO::PARAM_INT);
            $updPrev->bindParam(':id', $prev['user_id'], PDO::PARAM_INT);
            $updPrev->execute();
            $response['username_updated'] = true;
            if ($plainPwd !== ''){
              $hash = password_hash($plainPwd, PASSWORD_DEFAULT);
              $updPwd = $conn->prepare("UPDATE users SET password = :p WHERE user_id = :id");
              $updPwd->bindParam(':p', $hash);
              $updPwd->bindParam(':id', $prev['user_id'], PDO::PARAM_INT);
              $updPwd->execute();
              $response['password_updated'] = true;
            }
            $response['effective_username'] = $email;
          } else {
            $plain = $plainPwd !== '' ? $plainPwd : generateRandomPassword(10);
            $hash = password_hash($plain, PASSWORD_DEFAULT);
            $ins = $conn->prepare("INSERT INTO users(username, password, role, employee_id) VALUES(:u, :p, 'hr', :eid)");
            $ins->bindParam(':u', $email);
            $ins->bindParam(':p', $hash);
            $ins->bindParam(':eid', $empId, PDO::PARAM_INT);
            $ins->execute();
            $response['generated_password'] = $plain;
            $response['effective_username'] = $email;
          }
        } elseif (isset($data['position']) && $data['position'] === 'employee') {
          $plain = $plainPwd !== '' ? $plainPwd : generateRandomPassword(10);
          $hash = password_hash($plain, PASSWORD_DEFAULT);
          $ins = $conn->prepare("INSERT INTO users(username, password, role, employee_id) VALUES(:u, :p, 'employee', :eid)");
          $ins->bindParam(':u', $email);
          $ins->bindParam(':p', $hash);
          $ins->bindParam(':eid', $empId, PDO::PARAM_INT);
          $ins->execute();
          $response['generated_password'] = $plain;
          $response['effective_username'] = $email;
        }
      }
    }
    return json_encode($response);
  }

  function generateRandomPassword($length = 10){
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    $max = strlen($alphabet) - 1;
    $out = '';
    for ($i = 0; $i < $length; $i++) {
      $out .= $alphabet[random_int(0, $max)];
    }
    return $out;
  }

  function deleteEmployee($conn, $json){
    $data = json_decode($json, true);
    $sql = "DELETE FROM employees WHERE employee_id = :employee_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':employee_id', $data['employee_id']);
    $stmt->execute();
    return json_encode($stmt->rowCount() > 0 ? 1 : 0);
  }
?>


