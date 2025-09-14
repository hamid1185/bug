<?php
require_once '../config/config.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendErrorResponse('Database connection failed', 500);
}

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetBugs($db);
        break;
    case 'POST':
        handleCreateBug($db);
        break;
    case 'PUT':
        handleUpdateBug($db);
        break;
    case 'DELETE':
        handleDeleteBug($db);
        break;
    default:
        sendErrorResponse('Method not allowed', 405);
}

function handleGetBugs($db) {
    try {
        $page = intval($_GET['page'] ?? 1);
        $limit = intval($_GET['limit'] ?? BUGS_PER_PAGE);
        $offset = ($page - 1) * $limit;
        
        $projectId = $_GET['project_id'] ?? null;
        $status = $_GET['status'] ?? null;
        $priority = $_GET['priority'] ?? null;
        $assignedTo = $_GET['assigned_to'] ?? null;
        
        // Build query
        $whereConditions = [];
        $params = [];
        
        if ($projectId) {
            $whereConditions[] = "b.project_id = ?";
            $params[] = $projectId;
        }
        
        if ($status) {
            $whereConditions[] = "b.status = ?";
            $params[] = $status;
        }
        
        if ($priority) {
            $whereConditions[] = "b.priority = ?";
            $params[] = $priority;
        }
        
        if ($assignedTo) {
            $whereConditions[] = "b.assigned_to = ?";
            $params[] = $assignedTo;
        }
        
        $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM bugs b $whereClause";
        $stmt = $db->prepare($countQuery);
        $stmt->execute($params);
        $total = $stmt->fetch()['total'];
        
        // Get bugs
        $query = "SELECT b.*, p.name as project_name, u.username as assigned_to_name 
                  FROM bugs b 
                  LEFT JOIN projects p ON b.project_id = p.id 
                  LEFT JOIN users u ON b.assigned_to = u.id 
                  $whereClause 
                  ORDER BY b.created_at DESC 
                  LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $bugs = $stmt->fetchAll();
        
        sendSuccessResponse([
            'bugs' => $bugs,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get bugs error: " . $e->getMessage());
        sendErrorResponse('Failed to get bugs', 500);
    }
}

function handleCreateBug($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $title = sanitizeInput($input['title'] ?? '');
    $description = sanitizeInput($input['description'] ?? '');
    $projectId = intval($input['project_id'] ?? 0);
    $priority = sanitizeInput($input['priority'] ?? 'medium');
    $assignedTo = intval($input['assigned_to'] ?? 0) ?: null;
    
    if (empty($title) || empty($description) || !$projectId) {
        sendErrorResponse('Title, description, and project are required');
    }
    
    try {
        $stmt = $db->prepare("INSERT INTO bugs (title, description, project_id, priority, status, assigned_to, reported_by, created_at) VALUES (?, ?, ?, ?, 'open', ?, ?, NOW())");
        $stmt->execute([$title, $description, $projectId, $priority, $assignedTo, $_SESSION['user_id']]);
        
        $bugId = $db->lastInsertId();
        
        // Get the created bug with project name
        $stmt = $db->prepare("SELECT b.*, p.name as project_name FROM bugs b LEFT JOIN projects p ON b.project_id = p.id WHERE b.id = ?");
        $stmt->execute([$bugId]);
        $bug = $stmt->fetch();
        
        sendSuccessResponse(['bug' => $bug], 'Bug created successfully');
        
    } catch (PDOException $e) {
        error_log("Create bug error: " . $e->getMessage());
        sendErrorResponse('Failed to create bug', 500);
    }
}

function handleUpdateBug($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $bugId = intval($input['id'] ?? 0);
    $title = sanitizeInput($input['title'] ?? '');
    $description = sanitizeInput($input['description'] ?? '');
    $priority = sanitizeInput($input['priority'] ?? '');
    $status = sanitizeInput($input['status'] ?? '');
    $assignedTo = intval($input['assigned_to'] ?? 0) ?: null;
    
    if (!$bugId) {
        sendErrorResponse('Bug ID is required');
    }
    
    try {
        // Check if bug exists and user has permission
        $stmt = $db->prepare("SELECT * FROM bugs WHERE id = ?");
        $stmt->execute([$bugId]);
        $bug = $stmt->fetch();
        
        if (!$bug) {
            sendErrorResponse('Bug not found', 404);
        }
        
        // Only admin or assigned user can update
        if (!isAdmin() && $bug['assigned_to'] != $_SESSION['user_id'] && $bug['reported_by'] != $_SESSION['user_id']) {
            sendErrorResponse('Permission denied', 403);
        }
        
        $updateFields = [];
        $params = [];
        
        if (!empty($title)) {
            $updateFields[] = "title = ?";
            $params[] = $title;
        }
        
        if (!empty($description)) {
            $updateFields[] = "description = ?";
            $params[] = $description;
        }
        
        if (!empty($priority)) {
            $updateFields[] = "priority = ?";
            $params[] = $priority;
        }
        
        if (!empty($status)) {
            $updateFields[] = "status = ?";
            $params[] = $status;
        }
        
        if (isset($input['assigned_to'])) {
            $updateFields[] = "assigned_to = ?";
            $params[] = $assignedTo;
        }
        
        if (empty($updateFields)) {
            sendErrorResponse('No fields to update');
        }
        
        $updateFields[] = "updated_at = NOW()";
        $params[] = $bugId;
        
        $query = "UPDATE bugs SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        
        sendSuccessResponse([], 'Bug updated successfully');
        
    } catch (PDOException $e) {
        error_log("Update bug error: " . $e->getMessage());
        sendErrorResponse('Failed to update bug', 500);
    }
}

function handleDeleteBug($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    $bugId = intval($input['id'] ?? 0);
    
    if (!$bugId) {
        sendErrorResponse('Bug ID is required');
    }
    
    // Only admin can delete bugs
    requireAdmin();
    
    try {
        $stmt = $db->prepare("DELETE FROM bugs WHERE id = ?");
        $stmt->execute([$bugId]);
        
        if ($stmt->rowCount() === 0) {
            sendErrorResponse('Bug not found', 404);
        }
        
        sendSuccessResponse([], 'Bug deleted successfully');
        
    } catch (PDOException $e) {
        error_log("Delete bug error: " . $e->getMessage());
        sendErrorResponse('Failed to delete bug', 500);
    }
}
?>
