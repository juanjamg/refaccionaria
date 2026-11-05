<?php
// ==========================================
// Helpers compartidos de la API (JSON, seguridad, auth, validación)
// ==========================================

require_once __DIR__ . '/db.php';

// Iniciar sesión con directivas de cookies seguras
function initSession(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

        ini_set('session.cookie_httponly', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_samesite', 'Lax');

        if ($isHttps) {
            ini_set('session.cookie_secure', '1');
        }

        session_start();
    }
}

// Configurar encabezados de seguridad HTTP en todas las respuestas
function setSecurityHeaders(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
}

function jsonResponse(bool $success, $data = null, string $message = '', int $code = 200, ?int $total = null): void
{
    http_response_code($code);
    setSecurityHeaders();

    $response = [
        'success' => $success,
        'data'    => $data,
        'message' => $message,
    ];

    if ($total !== null) {
        $response['total'] = $total;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $input = json_decode($raw, true);

    if (!is_array($input)) {
        jsonResponse(false, null, 'Cuerpo de la petición inválido (se esperaba JSON)', 400);
    }

    return $input;
}

// Sanitizar cadenas básicas previniendo inyección de etiquetas HTML/JS
function sanitizeString(?string $str): string
{
    if ($str === null) return '';
    return trim(strip_tags($str));
}

function requireFields(array $input, array $fields): void
{
    foreach ($fields as $field) {
        if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
            jsonResponse(false, null, "El campo '$field' es obligatorio", 400);
        }
    }
}

function validateLength(string $value, string $fieldName, int $max, int $min = 1): void
{
    $len = mb_strlen($value, 'UTF-8');
    if ($len < $min || $len > $max) {
        jsonResponse(false, null, "El campo '$fieldName' debe tener entre $min y $max caracteres", 400);
    }
}

function getIdParam(): int
{
    $val = $_GET['id'] ?? null;
    $id = filter_var($val, FILTER_VALIDATE_INT);
    if ($id === false || $id === null || $id <= 0) {
        jsonResponse(false, null, 'Falta el parámetro id (o es inválido)', 400);
    }
    return (int) $id;
}

// Control de acceso: requiere que el usuario haya iniciado sesión
function requireAuth(): array
{
    initSession();

    if (empty($_SESSION['refa_user']) || empty($_SESSION['refa_user']['id'])) {
        jsonResponse(false, null, 'No autorizado. Debe iniciar sesión para realizar esta acción.', 401);
    }

    return $_SESSION['refa_user'];
}

// Obtener datos del usuario activo o null si no hay sesión
function getCurrentUser(): ?array
{
    initSession();
    return $_SESSION['refa_user'] ?? null;
}

// Control de acceso para administradores
function requireAdmin(): array
{
    $user = requireAuth();
    $username = strtolower($user['username'] ?? '');
    $rol = strtolower($user['rol'] ?? '');

    if ($username !== 'admin' && !str_contains($rol, 'admin')) {
        jsonResponse(false, null, 'Acceso denegado: se requieren permisos de administrador.', 403);
    }

    return $user;
}

// Manejo centralizado y seguro de errores de base de datos
function handleDbException(PDOException $e, string $defaultMessage = 'Error en la base de datos'): void
{
    // Log interno del error para depuración segura del servidor
    error_log('[Refa DB Exception] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

    // Detección de conflicto de llave foránea (integridad referencial)
    if (str_contains($e->getMessage(), 'REFERENCE constraint') || str_contains($e->getMessage(), 'FK_')) {
        jsonResponse(false, null, 'No se puede eliminar o modificar: el registro tiene relaciones asociadas en otros módulos.', 409);
    }

    // Detección de clave duplicada
    if (str_contains($e->getMessage(), 'UNIQUE KEY') || str_contains($e->getMessage(), 'duplicate key')) {
        jsonResponse(false, null, 'Ya existe un registro con estos datos únicos (nombre o clave repetida).', 409);
    }

    // Mensaje para el cliente
    $message = (defined('APP_DEBUG') && APP_DEBUG)
        ? $defaultMessage . ': ' . $e->getMessage()
        : $defaultMessage . '. Contacte al administrador si el problema persiste.';

    jsonResponse(false, null, $message, 500);
}
