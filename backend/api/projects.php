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
        handleGetProjects($db);
        break;
    case 'POST':
        handleCreateProject($db);
        break;
    case 'PUT':
        handleUpdateProject($db);
        break;
    case 'DELETE':
        handleDeleteProject($db);
        break;
    default:
        sendErrorResponse('Method not allowed', 405);
}

function handleGetProjects($db) {
    try {
        $query = "SELECT p.*, COUNT(b.id) as bug_count 
                  FROM projects p 
                  LEFT JOIN bugs b ON p.id = b.project_id 
                  GROUP BY p.id 
                  ORDER BY p.created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $projects = $stmt->fetchAll();
        
        sendSuccessResponse(['projects' => $projects]);
        
    } catch (PDOException $e) {
        error_log("Get projects error: " . $e->getMessage());
        sendErrorResponse('Failed to get projects', 500);
    }
}

function handleCreateProject($db) {
    requireAdmin();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $name = sanitizeInput($input['name'] ?? '');
    $description = sanitizeInput($input['description'] ?? '');
    $status = sanitizeInput($input['status'] ?? 'active');
    
    if (empty($name)) {
        sendErrorResponse('Project name is required');
    }
    
    try {
        $stmt = $db->prepare("INSERT INTO projects (name, description, status, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$name, $description, $status]);
        
        $projectId = $db->lastInsertId();
        
        sendSuccessResponse(['project_id' => $projectId], 'Project created successfully');
        
    } catch (PDOException $e) {
        error_log("Create project error: " . $e->getMessage());
        sendErrorResponse('Failed to create project', 500);
    }
}

function handleUpdateProject($db) {
    requireAdmin();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $projectId = intval($input['id'] ?? 0);
    $name = sanitizeInput($input['name'] ?? '');
    $description = sanitizeInput($input['description'] ?? '');
    $status = sanitizeInput($input['status'] ?? '');
    
    if (!$projectId) {
        sendErrorResponse('Project ID is required');
    }
    
    try {
        $updateFields = [];
        $params = [];
        
        if (!empty($name)) {
            $updateFields[] = "name = ?";
            $params[] = $name;
        }
        
        if (!empty($description)) {
            $updateFields[] = "description = ?";
            $params[] = $description;
        }
        
        if (!empty($status)) {
            $updateFields[] = "status = ?";
            $params[] = $status;
        }
        
        if (empty($updateFields)) {
            sendErrorResponse('No fields to update');
        }
        
        $updateFields[] = "updated_at = NOW()";
        $params[] = $projectId;
        
        $query = "UPDATE projects SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        
        sendSuccessResponse([], 'Project updated successfully');
        
    } catch (PDOException $e) {
        error_log("Update project error: " . $e->getMessage());
        sendErrorResponse('Failed to update project', 500);
    }
}

function handleDeleteProject($db) {
    requireAdmin();
    
    $input = json_decode(file_get_contents('php://input'), true);
    $projectId = intval($input['id'] ?? 0);
    
    if (!$projectId) {
        sendErrorResponse('Project ID is required');
    }
    
    try {
        // Check if project has bugs
        $stmt = $db->prepare("SELECT COUNT(*) as bug_count FROM bugs WHERE project_id = ?");
        $stmt->execute([$projectId]);
        $bugCount = $stmt->fetch()['bug_count'];
        
        if ($bugCount > 0) {
            sendErrorResponse('Cannot delete project with existing bugs');
        }
        
        $stmt = $db->prepare("DELETE FROM projects WHERE id = ?");
        $stmt->execute([$projectId]);
        
        if ($stmt->rowCount() === 0) {
            sendErrorResponse('Project not found', 404);
        }
        
        sendSuccessResponse([], 'Project deleted successfully');
        
    } catch (PDOException $e) {
        error_log("Delete project error: " . $e->getMessage());
        sendErrorResponse('Failed to delete project', 500);
    }
}
?>
