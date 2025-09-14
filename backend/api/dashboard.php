<?php
require_once '../config/config.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendErrorResponse('Database connection failed', 500);
}

requireLogin();

try {
    // Get dashboard statistics
    $stats = [];
    
    // Total bugs
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM bugs");
    $stmt->execute();
    $stats['total_bugs'] = $stmt->fetch()['total'];
    
    // Open bugs
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM bugs WHERE status = 'open'");
    $stmt->execute();
    $stats['open_bugs'] = $stmt->fetch()['total'];
    
    // In progress bugs
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM bugs WHERE status = 'in-progress'");
    $stmt->execute();
    $stats['in_progress_bugs'] = $stmt->fetch()['total'];
    
    // Resolved bugs
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM bugs WHERE status = 'closed'");
    $stmt->execute();
    $stats['resolved_bugs'] = $stmt->fetch()['total'];
    
    // Critical bugs
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM bugs WHERE priority = 'high' AND status != 'closed'");
    $stmt->execute();
    $stats['critical_bugs'] = $stmt->fetch()['total'];
    
    // Total projects
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM projects WHERE status = 'active'");
    $stmt->execute();
    $stats['total_projects'] = $stmt->fetch()['total'];
    
    // Recent bugs (last 10)
    $stmt = $db->prepare("SELECT b.*, p.name as project_name FROM bugs b LEFT JOIN projects p ON b.project_id = p.id ORDER BY b.created_at DESC LIMIT 10");
    $stmt->execute();
    $recent_bugs = $stmt->fetchAll();
    
    // My assigned bugs (if user is not admin)
    $my_bugs = [];
    if (!isAdmin()) {
        $stmt = $db->prepare("SELECT b.*, p.name as project_name FROM bugs b LEFT JOIN projects p ON b.project_id = p.id WHERE b.assigned_to = ? ORDER BY b.created_at DESC LIMIT 10");
        $stmt->execute([$_SESSION['user_id']]);
        $my_bugs = $stmt->fetchAll();
    }
    
    // Bug status distribution for chart
    $stmt = $db->prepare("SELECT status, COUNT(*) as count FROM bugs GROUP BY status");
    $stmt->execute();
    $status_distribution = $stmt->fetchAll();
    
    // Priority distribution for chart
    $stmt = $db->prepare("SELECT priority, COUNT(*) as count FROM bugs GROUP BY priority");
    $stmt->execute();
    $priority_distribution = $stmt->fetchAll();
    
    sendSuccessResponse([
        'stats' => $stats,
        'recent_bugs' => $recent_bugs,
        'my_bugs' => $my_bugs,
        'charts' => [
            'status_distribution' => $status_distribution,
            'priority_distribution' => $priority_distribution
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Dashboard error: " . $e->getMessage());
    sendErrorResponse('Failed to load dashboard data', 500);
}
?>
