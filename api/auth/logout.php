<?php
// ==========================================
// API: AUTH - LOGOUT
// POST o GET /api/auth/logout.php
// ==========================================

require_once __DIR__ . '/../config/http.php';

initSession();

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

session_destroy();

jsonResponse(true, null, 'Sesión cerrada correctamente');
