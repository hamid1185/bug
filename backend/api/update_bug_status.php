<?php
require_once '../config/config.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendErrorResponse('Database connection failed', 500);
}

requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);

$bugId = intval($input['bug_id'] ?? 0);
$newStatus = sanitizeInput($input['status'] ?? '');

if (!$bugId || !$newStatus) {
    sendErrorResponse('Bug ID and status are required');
}

$allowedStatuses = ['open', 'in-progress', 'testing', 'closed'];
if (!in_array($newStatus, $allowedStatuses)) {
    sendErrorResponse('Invalid status');
}

try {
    // Check if bug exists
    $stmt = $db->prepare("SELECT * FROM bugs WHERE id = ?");
    $stmt->execute([$bugId]);
    $bug = $stmt->fetch();
    
    if (!$bug) {
        sendErrorResponse('Bug not found', 404);
    }
    
    // Check permissions
    if (!isAdmin() && $bug['assigned_to'] != $_SESSION['user_id'] && $bug['reported_by'] != $_SESSION['user_id']) {
        sendErrorResponse('Permission denied', 403);
    }
    
    // Update bug status
    $stmt = $db->prepare("UPDATE bugs SET status = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$newStatus, $bugId]);
    
    sendSuccessResponse([], 'Bug status updated successfully');
    
} catch (PDOException $e) {
    error_log("Update bug status error: " . $e->getMessage());
    sendErrorResponse('Failed to update bug status', 500);
}
?>
