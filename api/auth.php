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
  include 'email-config.php';

  ensureAdminUser($conn);
  ensureHrUser($conn);

  $operation = '';
  $json = '';
  if ($_SERVER['REQUEST_METHOD'] == 'GET'){
    $operation = isset($_GET['operation']) ? $_GET['operation'] : '';
  } else if($_SERVER['REQUEST_METHOD'] == 'POST'){
    $operation = isset($_POST['operation']) ? $_POST['operation'] : '';
    $json = isset($_POST['json']) ? $_POST['json'] : '';
  }

  switch ($operation) {
    case 'login':
      echo login($conn, $json);
      break;
    case 'me':
      echo me();
      break;
    case 'logout':
      echo logout();
      break;
    case 'updateProfile':
      echo updateProfile($conn, $json);
      break;
    case 'forgotPassword':
      echo forgotPassword($conn, $json);
      break;
    case 'resetPassword':
      echo resetPassword($conn, $json);
      break;
    default:
      echo json_encode(['success' => 0, 'message' => 'Invalid operation']);
  }

  function ensureAdminUser($conn){
    try {
      $stmt = $conn->prepare("SELECT user_id FROM users WHERE username = 'admin' LIMIT 1");
      $stmt->execute();
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$row) {
        $hash = password_hash('admin123', PASSWORD_DEFAULT);
        $ins = $conn->prepare("INSERT INTO users(username, password, role) VALUES('admin', :password, 'admin')");
        $ins->bindParam(':password', $hash);
        $ins->execute();
      }
    } catch (Exception $e) {
      // ignore seeding errors
    }
  }

  function ensureHrUser($conn){
    try {
      $stmt = $conn->prepare("SELECT user_id FROM users WHERE username = 'hr' LIMIT 1");
      $stmt->execute();
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$row) {
        $hash = password_hash('hr123', PASSWORD_DEFAULT);
        $ins = $conn->prepare("INSERT INTO users(username, password, role) VALUES('hr', :password, 'hr')");
        $ins->bindParam(':password', $hash);
        $ins->execute();
      }
    } catch (Exception $e) {
      // ignore seeding errors
    }
  }

  function login($conn, $json){
    $data = json_decode($json, true);
    $username = isset($data['username']) ? $data['username'] : '';
    $password = isset($data['password']) ? $data['password'] : '';
    
    if (!$username || !$password) {
      return json_encode(['success' => 0, 'message' => 'Missing credentials']);
    }
    
    $stmt = $conn->prepare('SELECT user_id, username, password, role, employee_id FROM users WHERE username = :u LIMIT 1');
    $stmt->bindParam(':u', $username);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user && password_verify($password, $user['password'])){
      $_SESSION['user_id'] = $user['user_id'];
      $_SESSION['username'] = $user['username'];
      $_SESSION['role'] = $user['role'];
      $_SESSION['employee_id'] = isset($user['employee_id']) ? $user['employee_id'] : null;
      $respUser = [
        'username' => $user['username'],
        'role' => $user['role'],
        'employee_id' => $_SESSION['employee_id']
      ];
      // Enrich with employee personal details if linked
      if (!empty($_SESSION['employee_id'])) {
        $eid = intval($_SESSION['employee_id']);
        $emp = $conn->prepare('SELECT employee_id, first_name, last_name, email, phone, department, position FROM employees WHERE employee_id = :id LIMIT 1');
        $emp->bindParam(':id', $eid, PDO::PARAM_INT);
        $emp->execute();
        $e = $emp->fetch(PDO::FETCH_ASSOC);
        if ($e){
          $respUser = array_merge($respUser, [
            'first_name' => $e['first_name'],
            'last_name' => $e['last_name'],
            'email' => $e['email'],
            'phone' => $e['phone'],
            'department' => $e['department'],
            'position' => $e['position']
          ]);
        }
      }
      return json_encode(['success' => 1, 'user' => $respUser]);
    }
    return json_encode(['success' => 0, 'message' => 'Invalid username or password']);
  }

  function me(){
    if (isset($_SESSION['user_id'])){
      $user = [
        'username' => isset($_SESSION['username']) ? $_SESSION['username'] : null,
        'role' => isset($_SESSION['role']) ? $_SESSION['role'] : null,
        'employee_id' => isset($_SESSION['employee_id']) ? $_SESSION['employee_id'] : null,
      ];
      // Enrich with employee personal details if linked
      if (!empty($user['employee_id'])){
        include 'connection-pdo.php';
        $eid = intval($user['employee_id']);
        try {
          $emp = $conn->prepare('SELECT employee_id, first_name, last_name, email, phone, department, position FROM employees WHERE employee_id = :id LIMIT 1');
          $emp->bindParam(':id', $eid, PDO::PARAM_INT);
          $emp->execute();
          $e = $emp->fetch(PDO::FETCH_ASSOC);
          if ($e){
            $user = array_merge($user, [
              'first_name' => $e['first_name'],
              'last_name' => $e['last_name'],
              'email' => $e['email'],
              'phone' => $e['phone'],
              'department' => $e['department'],
              'position' => $e['position']
            ]);
          }
        } catch (Exception $e) {
          // ignore enrichment errors
        }
      }
      return json_encode(['authenticated' => true, 'user' => $user]);
    }
    return json_encode(['authenticated' => false]);
  }

  function logout(){
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
      $params = session_get_cookie_params();
      setcookie(session_name(), '', time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
      );
    }
    session_destroy();
    return json_encode(['success' => 1]);
  }

  function updateProfile($conn, $json){
    if (!isset($_SESSION['user_id'])){
      return json_encode(['success' => 0, 'message' => 'Not authenticated']);
    }
    $data = json_decode($json, true);
    if (!$data) $data = [];
    $userId = intval($_SESSION['user_id']);
    $newUsername = isset($data['username']) ? trim($data['username']) : '';
    $newPassword = isset($data['password']) ? trim($data['password']) : '';
    $response = ['success' => 1];
    if ($newUsername !== ''){
      // ensure no conflict with another user
      $conf = $conn->prepare('SELECT user_id FROM users WHERE username = :u AND user_id <> :id LIMIT 1');
      $conf->bindParam(':u', $newUsername);
      $conf->bindParam(':id', $userId, PDO::PARAM_INT);
      $conf->execute();
      $row = $conf->fetch(PDO::FETCH_ASSOC);
      if ($row){
        $response['success'] = 0;
        $response['message'] = 'Username already taken';
        return json_encode($response);
      }
      $upd = $conn->prepare('UPDATE users SET username = :u WHERE user_id = :id');
      $upd->bindParam(':u', $newUsername);
      $upd->bindParam(':id', $userId, PDO::PARAM_INT);
      $upd->execute();
      $_SESSION['username'] = $newUsername;
    }
    if ($newPassword !== ''){
      $hash = password_hash($newPassword, PASSWORD_DEFAULT);
      $upd = $conn->prepare('UPDATE users SET password = :p WHERE user_id = :id');
      $upd->bindParam(':p', $hash);
      $upd->bindParam(':id', $userId, PDO::PARAM_INT);
      $upd->execute();
    }
    return json_encode($response);
  }

  function forgotPassword($conn, $json) {
    $data = json_decode($json, true);
    $username = isset($data['username']) ? trim($data['username']) : '';
    
    if (!$username) {
      return json_encode(['success' => 0, 'message' => 'Username or email is required']);
    }
    
    // Simple rate limiting - check if too many requests from same IP
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateLimitKey = "forgot_password_limit_{$ip}";
    
    if (isset($_SESSION[$rateLimitKey]) && $_SESSION[$rateLimitKey]['count'] >= MAX_RESET_ATTEMPTS) {
      $timeDiff = time() - $_SESSION[$rateLimitKey]['time'];
      if ($timeDiff < (RATE_LIMIT_HOURS * 3600)) { // Convert hours to seconds
        return json_encode(['success' => 0, 'message' => 'Too many requests. Please try again in ' . RATE_LIMIT_HOURS . ' hour(s).']);
      } else {
        // Reset counter after rate limit period
        unset($_SESSION[$rateLimitKey]);
      }
    }
    
    try {
      // Check if user exists and get email
      $stmt = $conn->prepare('SELECT u.user_id, u.username, e.email FROM users u LEFT JOIN employees e ON u.employee_id = e.employee_id WHERE u.username = :u LIMIT 1');
      $stmt->bindParam(':u', $username);
      $stmt->execute();
      $user = $stmt->fetch(PDO::FETCH_ASSOC);
      
      if (!$user) {
        // For security, don't reveal if user exists or not
        // Still apply rate limiting even for non-existent users
        if (!isset($_SESSION[$rateLimitKey])) {
          $_SESSION[$rateLimitKey] = ['count' => 1, 'time' => time()];
        } else {
          $_SESSION[$rateLimitKey]['count']++;
        }
        return json_encode(['success' => 1, 'message' => 'If the username exists, a reset code will be sent to your email']);
      }
      
      // Generate 6-digit code
      $code = sprintf('%06d', mt_rand(0, 999999));
      $expires = date('Y-m-d H:i:s', strtotime('+' . CODE_EXPIRY_MINUTES . ' minutes'));
      
      // Store reset code in database
      $updateStmt = $conn->prepare('UPDATE users SET reset_code = :code, reset_code_expires = :expires WHERE user_id = :id');
      $updateStmt->bindParam(':code', $code);
      $updateStmt->bindParam(':expires', $expires);
      $updateStmt->bindParam(':id', $user['user_id'], PDO::PARAM_INT);
      $updateStmt->execute();
      
      // Update rate limiting
      if (!isset($_SESSION[$rateLimitKey])) {
        $_SESSION[$rateLimitKey] = ['count' => 1, 'time' => time()];
      } else {
        $_SESSION[$rateLimitKey]['count']++;
      }
      
      // Send email with PHPMailer
      $emailSent = sendResetCodeEmail($user['email'] ?? $user['username'], $code, $user['username']);
      
      if ($emailSent) {
        return json_encode(['success' => 1, 'message' => 'A 6-digit reset code has been sent to your email. Please check your inbox.']);
      } else {
        return json_encode(['success' => 0, 'message' => 'Failed to send email. Please try again later.']);
      }
      
    } catch (Exception $e) {
      return json_encode(['success' => 0, 'message' => 'An error occurred while processing your request']);
    }
  }

  function resetPassword($conn, $json) {
    $data = json_decode($json, true);
    $code = isset($data['code']) ? trim($data['code']) : '';
    $newPassword = isset($data['newPassword']) ? trim($data['newPassword']) : '';
    
    if (!$code || strlen($code) !== 6) {
      return json_encode(['success' => 0, 'message' => 'Valid 6-digit code is required']);
    }
    
    if (strlen($newPassword) < 6) {
      return json_encode(['success' => 0, 'message' => 'Password must be at least 6 characters long']);
    }
    
    try {
      // Debug: Log the received code
      error_log("Reset password attempt - Code received: " . $code);
      
      // Find user with valid reset code
      $stmt = $conn->prepare('SELECT user_id, reset_code, reset_code_expires FROM users WHERE reset_code = :code LIMIT 1');
      $stmt->bindParam(':code', $code);
      $stmt->execute();
      $user = $stmt->fetch(PDO::FETCH_ASSOC);
      
      // Debug: Log what we found
      if ($user) {
        error_log("User found - Stored code: " . $user['reset_code'] . ", Expires: " . $user['reset_code_expires']);
      } else {
        error_log("No user found with code: " . $code);
      }
      
      if (!$user) {
        return json_encode(['success' => 0, 'message' => 'Invalid reset code']);
      }
      
      // Check if code is expired
      if ($user['reset_code_expires'] < date('Y-m-d H:i:s')) {
        error_log("Code expired - Current time: " . date('Y-m-d H:i:s') . ", Expires: " . $user['reset_code_expires']);
        return json_encode(['success' => 0, 'message' => 'Reset code has expired. Please request a new one.']);
      }
      
      // Hash new password and update user
      $hash = password_hash($newPassword, PASSWORD_DEFAULT);
      $updateStmt = $conn->prepare('UPDATE users SET password = :password, reset_code = NULL, reset_code_expires = NULL WHERE user_id = :id');
      $updateStmt->bindParam(':password', $hash);
      $updateStmt->bindParam(':id', $user['user_id'], PDO::PARAM_INT);
      $updateStmt->execute();
      
      error_log("Password reset successful for user ID: " . $user['user_id']);
      return json_encode(['success' => 1, 'message' => 'Password reset successfully']);
      
    } catch (Exception $e) {
      error_log("Error in resetPassword: " . $e->getMessage());
      return json_encode(['success' => 0, 'message' => 'An error occurred while resetting your password']);
    }
  }

  function sendResetCodeEmail($email, $code, $username) {
    try {
      // Include PHPMailer
      require_once '../phpmailer-master/src/Exception.php';
      require_once '../phpmailer-master/src/PHPMailer.php';
      require_once '../phpmailer-master/src/SMTP.php';
      
      $mail = new PHPMailer\PHPMailer\PHPMailer(true);
      
      // Set timeout to prevent hanging
      $mail->Timeout = 20; // 20 seconds timeout
      $mail->SMTPKeepAlive = false; // Don't keep connection alive
      
      // Server settings
      $mail->isSMTP();
      $mail->Host = SMTP_HOST;
      $mail->SMTPAuth = true;
      $mail->Username = SMTP_USERNAME;
      $mail->Password = SMTP_PASSWORD;
      $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
      $mail->Port = SMTP_PORT;
      
      // Debug mode (remove in production)
      $mail->SMTPDebug = 0; // Set to 2 for debugging
      
      // Recipients
      $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
      $mail->addAddress($email, $username);
      
      // Content
      $mail->isHTML(true);
      $mail->Subject = EMAIL_SUBJECT;
      $mail->Body = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
          <h2 style='color: #3b82f6;'>Password Reset Request</h2>
          <p>Hello <strong>{$username}</strong>,</p>
          <p>You have requested to reset your password. Use the following 6-digit code to complete the process:</p>
          <div style='background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;'>
            <h1 style='color: #1f2937; font-size: 32px; letter-spacing: 8px; margin: 0;'>{$code}</h1>
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This code will expire in " . CODE_EXPIRY_MINUTES . " minutes</li>
            <li>If you didn't request this, please ignore this email</li>
            <li>Never share this code with anyone</li>
          </ul>
          <p>Best regards,<br>" . SMTP_FROM_NAME . "</p>
        </div>
      ";
      $mail->AltBody = "
        Password Reset Request
        
        Hello {$username},
        
        You have requested to reset your password. Use the following 6-digit code to complete the process:
        
        {$code}
        
        Important:
        - This code will expire in " . CODE_EXPIRY_MINUTES . " minutes
        - If you didn't request this, please ignore this email
        - Never share this code with anyone
        
        Best regards,
        " . SMTP_FROM_NAME . "
      ";
      
      $mail->send();
      error_log("Email sent successfully to: " . $email);
      return true;
      
    } catch (Exception $e) {
      error_log("Email sending failed: " . $e->getMessage());
      return false;
    }
  }
?>


