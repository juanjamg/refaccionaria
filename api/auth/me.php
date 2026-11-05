<?php
// ==========================================
// API: AUTH - SESIÓN ACTUAL (ME)
// GET /api/auth/me.php
// ==========================================

require_once __DIR__ . '/../config/http.php';

initSession();

$user = getCurrentUser();

if (!$user) {
    jsonResponse(false, null, 'No hay sesión activa', 401);
}

jsonResponse(true, $user, 'Sesión activa');
