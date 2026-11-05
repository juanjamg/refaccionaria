<?php
// ==========================================
// API: AUTH - LOGIN
// POST /api/auth/login.php
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Método no permitido. Use POST.', 405);
}

$input = getJsonInput();
requireFields($input, ['username', 'password']);

$username = trim((string) $input['username']);
$password = (string) $input['password'];

if ($username === '' || $password === '') {
    jsonResponse(false, null, 'Usuario y contraseña requeridos', 400);
}

try {
    $pdo = getDbConnection();

    $stmt = $pdo->prepare('SELECT Id_Usuario, Nombre_Usuario, Nombre_Com_Usuario, Password_Usuario, Status FROM dbo.Usuario WHERE Nombre_Usuario = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    $authFailedMsg = 'Usuario o contraseña incorrectos';

    if (!$user) {
        jsonResponse(false, null, $authFailedMsg, 401);
    }

    // Verificar si el usuario está activo
    if ($user['Status'] !== '1' && $user['Status'] !== 1) {
        jsonResponse(false, null, 'Esta cuenta de usuario se encuentra inactiva. Contacte al administrador.', 403);
    }

    $dbHash = (string) $user['Password_Usuario'];
    $isValid = password_verify($password, $dbHash);

    // Fallback de compatibilidad si alguna contraseña en la BD quedó en texto plano
    if (!$isValid && $dbHash === $password) {
        $isValid = true;
        // Re-hashear automáticamente para seguridad futura
        $newHash = password_hash($password, PASSWORD_BCRYPT);
        $updateStmt = $pdo->prepare('UPDATE dbo.Usuario SET Password_Usuario = ? WHERE Id_Usuario = ?');
        $updateStmt->execute([$newHash, $user['Id_Usuario']]);
    }

    if (!$isValid) {
        jsonResponse(false, null, $authFailedMsg, 401);
    }

    // Prevenir Session Fixation
    session_regenerate_id(true);

    // Obtener módulos asignados si existen en el sistema
    $modulos = [];
    try {
        $stmtMod = $pdo->prepare('EXEC dbo.sp_ObtenerModulosUsuario @Id_Usuario = ?');
        $stmtMod->execute([$user['Id_Usuario']]);
        $modulos = $stmtMod->fetchAll(PDO::FETCH_COLUMN) ?: [];
    } catch (\Throwable $e) {
        // En caso de que el procedimiento o la tabla no estén inicializados aún
    }

    $userData = [
        'id'       => (int) $user['Id_Usuario'],
        'username' => $user['Nombre_Usuario'],
        'nombre'   => $user['Nombre_Com_Usuario'],
        'modulos'  => $modulos,
        'login_at' => date('c'),
    ];

    $_SESSION['refa_user'] = $userData;

    jsonResponse(true, $userData, 'Inicio de sesión exitoso');

} catch (PDOException $e) {
    handleDbException($e, 'Error al autenticar usuario');
}
