<?php
// ==========================================
// API: USUARIOS (Compatible con script.sql - Stored Procedures)
// GET    /api/usuarios/          → listar (requiere auth)
// GET    /api/usuarios/?id=5     → uno (requiere auth)
// POST   /api/usuarios/          → crear (requiere admin)
// PUT    /api/usuarios/?id=5     → editar (requiere admin)
// DELETE /api/usuarios/?id=5     → eliminar (requiere admin)
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

// Todos los accesos requieren usuario autenticado
$currentUser = requireAuth();

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

function formatUsuario(array $row): array
{
    $row['estado'] = ($row['status'] === '1' || $row['status'] === 1) ? 'Activo' : 'Inactivo';
    unset($row['Password_Usuario']); // Seguridad: nunca exponer el hash
    return $row;
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $id = getIdParam();
                $stmt = $pdo->prepare('SELECT Id_Usuario AS id, Nombre_Usuario AS username, Nombre_Com_Usuario AS nombre, Status AS status FROM dbo.Usuario WHERE Id_Usuario = ?');
                $stmt->execute([$id]);
                $usuario = $stmt->fetch();
                if (!$usuario) {
                    jsonResponse(false, null, 'Usuario no encontrado', 404);
                }
                jsonResponse(true, formatUsuario($usuario), 'Usuario obtenido correctamente');
            }

            $stmt = $pdo->query('SELECT Id_Usuario AS id, Nombre_Usuario AS username, Nombre_Com_Usuario AS nombre, Status AS status FROM dbo.Usuario ORDER BY Nombre_Com_Usuario');
            $usuarios = array_map('formatUsuario', $stmt->fetchAll());
            jsonResponse(true, $usuarios, 'Usuarios obtenidos correctamente', 200, count($usuarios));
            break;

        case 'POST':
            requireAdmin(); // Solo administradores pueden dar de alta usuarios
            $input = getJsonInput();
            requireFields($input, ['nombre', 'username', 'password']);

            $username = sanitizeString((string) $input['username']);
            $nombre = sanitizeString((string) $input['nombre']);
            $password = (string) $input['password'];

            validateLength($username, 'username', 50, 3);
            validateLength($nombre, 'nombre', 100, 3);
            validateLength($password, 'password', 128, 6);

            $statusVal = (isset($input['status']) && ($input['status'] === '0' || $input['status'] === 'Inactivo')) ? '0' : '1';
            $passwordHash = password_hash($password, PASSWORD_BCRYPT);

            $sql = 'DECLARE @msg VARCHAR(200), @newId INT;
                    EXEC dbo.sp_InsertarUsuario
                        @Nombre_Usuario = ?,
                        @Nombre_Com_Usuario = ?,
                        @Password_Usuario = ?,
                        @Status = ?,
                        @Mensaje = @msg OUTPUT,
                        @Id_UsuarioInsertado = @newId OUTPUT;
                    SELECT @msg AS mensaje, @newId AS id;';

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $username,
                $nombre,
                $passwordHash,
                $statusVal,
            ]);
            $res = $stmt->fetch();

            if (!$res || empty($res['id'])) {
                jsonResponse(false, null, $res['mensaje'] ?? 'Error al registrar el usuario', 400);
            }

            jsonResponse(true, ['id' => (int) $res['id']], $res['mensaje'] ?? 'Usuario creado correctamente', 201);
            break;

        case 'PUT':
            requireAdmin(); // Solo administradores pueden modificar usuarios
            $id = getIdParam();
            $input = getJsonInput();
            requireFields($input, ['nombre', 'username']);

            $username = sanitizeString((string) $input['username']);
            $nombre = sanitizeString((string) $input['nombre']);

            validateLength($username, 'username', 50, 3);
            validateLength($nombre, 'nombre', 100, 3);

            $statusVal = (isset($input['status']) && ($input['status'] === '0' || $input['status'] === 'Inactivo')) ? '0' : '1';

            // Si se proporcionó una nueva contraseña, validarla y hashearla
            if (!empty($input['password'])) {
                $password = (string) $input['password'];
                validateLength($password, 'password', 128, 6);
                $passwordHash = password_hash($password, PASSWORD_BCRYPT);
            } else {
                $stmtCurrent = $pdo->prepare('SELECT Password_Usuario FROM dbo.Usuario WHERE Id_Usuario = ?');
                $stmtCurrent->execute([$id]);
                $currentPass = $stmtCurrent->fetchColumn();
                if (!$currentPass) {
                    jsonResponse(false, null, 'Usuario no encontrado', 404);
                }
                $passwordHash = $currentPass;
            }

            $sql = 'DECLARE @msg VARCHAR(200);
                    EXEC dbo.sp_ModificarUsuario
                        @Id_Usuario = ?,
                        @Nombre_Usuario = ?,
                        @Nombre_Com_Usuario = ?,
                        @Password_Usuario = ?,
                        @Status = ?,
                        @Mensaje = @msg OUTPUT;
                    SELECT @msg AS mensaje;';

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id,
                $username,
                $nombre,
                $passwordHash,
                $statusVal,
            ]);
            $res = $stmt->fetch();

            if ($res && str_starts_with($res['mensaje'] ?? '', 'Error')) {
                jsonResponse(false, null, $res['mensaje'], 400);
            }

            jsonResponse(true, null, $res['mensaje'] ?? 'Usuario actualizado correctamente');
            break;

        case 'DELETE':
            requireAdmin(); // Solo administradores pueden eliminar usuarios
            $id = getIdParam();

            // Evitar que el usuario se elimine a sí mismo
            if ($id === (int) ($currentUser['id'] ?? 0)) {
                jsonResponse(false, null, 'No puede eliminar su propio usuario activo.', 400);
            }

            $sql = 'DECLARE @msg VARCHAR(200);
                    EXEC dbo.sp_EliminarUsuario
                        @Id_Usuario = ?,
                        @Mensaje = @msg OUTPUT;
                    SELECT @msg AS mensaje;';

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            $res = $stmt->fetch();

            if ($res && str_starts_with($res['mensaje'] ?? '', 'Error')) {
                jsonResponse(false, null, $res['mensaje'], 400);
            }

            jsonResponse(true, null, $res['mensaje'] ?? 'Usuario eliminado correctamente');
            break;

        default:
            jsonResponse(false, null, 'Método no permitido', 405);
    }
} catch (PDOException $e) {
    handleDbException($e, 'Error en el módulo de usuarios');
}
