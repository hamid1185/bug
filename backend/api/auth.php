<?php
require_once '../config/config.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendErrorResponse('Database connection failed', 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'POST':
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'login':
                handleLogin($db, $input);
                break;
            case 'register':
                handleRegister($db, $input);
                break;
            case 'logout':
                handleLogout();
                break;
            default:
                sendErrorResponse('Invalid action');
        }
        break;
    
    case 'GET':
        handleGetUser($db);
        break;
    
    default:
        sendErrorResponse('Method not allowed', 405);
}

function handleLogin($db, $input) {
    $username = sanitizeInput($input['username'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        sendErrorResponse('Username and password are required');
    }
    
    try {
        $stmt = $db->prepare("SELECT id, username, email, password, role, status FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendErrorResponse('Invalid credentials');
        }
        
        if ($user['status'] !== 'active') {
            sendErrorResponse('Account is not active');
        }
        
        if (!verifyPassword($password, $user['password'])) {
            sendErrorResponse('Invalid credentials');
        }
        
        // Set session variables
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_email'] = $user['email'];
        
        // Update last login
        $stmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $stmt->execute([$user['id']]);
        
        sendSuccessResponse([
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ], 'Login successful');
        
    } catch (PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        sendErrorResponse('Login failed', 500);
    }
}

function handleRegister($db, $input) {
    $username = sanitizeInput($input['username'] ?? '');
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $confirmPassword = $input['confirmPassword'] ?? '';
    
    // Validation
    if (empty($username) || empty($email) || empty($password)) {
        sendErrorResponse('All fields are required');
    }
    
    if (!validateEmail($email)) {
        sendErrorResponse('Invalid email format');
    }
    
    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        sendErrorResponse('Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters');
    }
    
    if ($password !== $confirmPassword) {
        sendErrorResponse('Passwords do not match');
    }
    
    try {
        // Check if username or email already exists
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            sendErrorResponse('Username or email already exists');
        }
        
        // Create user
        $hashedPassword = hashPassword($password);
        $stmt = $db->prepare("INSERT INTO users (username, email, password, role, status, created_at) VALUES (?, ?, ?, 'user', 'active', NOW())");
        $stmt->execute([$username, $email, $hashedPassword]);
        
        $userId = $db->lastInsertId();
        
        // Auto-login after registration
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['user_role'] = 'user';
        $_SESSION['user_email'] = $email;
        
        sendSuccessResponse([
            'user' => [
                'id' => $userId,
                'username' => $username,
                'email' => $email,
                'role' => 'user'
            ]
        ], 'Registration successful');
        
    } catch (PDOException $e) {
        error_log("Registration error: " . $e->getMessage());
        sendErrorResponse('Registration failed', 500);
    }
}

function handleLogout() {
    session_destroy();
    sendSuccessResponse([], 'Logout successful');
}

function handleGetUser($db) {
    if (!isLoggedIn()) {
        sendErrorResponse('Not authenticated', 401);
    }
    
    try {
        $stmt = $db->prepare("SELECT id, username, email, role FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendErrorResponse('User not found', 404);
        }
        
        sendSuccessResponse(['user' => $user]);
        
    } catch (PDOException $e) {
        error_log("Get user error: " . $e->getMessage());
        sendErrorResponse('Failed to get user info', 500);
    }
}
?>
