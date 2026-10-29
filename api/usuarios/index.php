<?php
// ==========================================
// API: USUARIOS (Compatible con script.sql - Stored Procedures)
// GET    /api/usuarios/          → listar
// GET    /api/usuarios/?id=5     → uno
// POST   /api/usuarios/          → crear (sp_InsertarUsuario)
// PUT    /api/usuarios/?id=5     → editar (sp_ModificarUsuario)
// DELETE /api/usuarios/?id=5     → eliminar (sp_EliminarUsuario)
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

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
            $input = getJsonInput();
            requireFields($input, ['nombre', 'username', 'password']);

            $statusVal = (isset($input['status']) && ($input['status'] === '0' || $input['status'] === 'Inactivo')) ? '0' : '1';
            $passwordHash = password_hash($input['password'], PASSWORD_BCRYPT);

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
                $input['username'],
                $input['nombre'],
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
            $id = getIdParam();
            $input = getJsonInput();
            requireFields($input, ['nombre', 'username']);

            $statusVal = (isset($input['status']) && ($input['status'] === '0' || $input['status'] === 'Inactivo')) ? '0' : '1';

            // Si no se proporcionó contraseña, conservar la que ya está almacenada
            if (!empty($input['password'])) {
                $passwordHash = password_hash($input['password'], PASSWORD_BCRYPT);
            } else {
                $stmtCurrent = $pdo->prepare('SELECT Password_Usuario FROM dbo.Usuario WHERE Id_Usuario = ?');
                $stmtCurrent->execute([$id]);
                $currentPass = $stmtCurrent->fetchColumn();
                $passwordHash = $currentPass ?: password_hash('default123', PASSWORD_BCRYPT);
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
                $input['username'],
                $input['nombre'],
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
            $id = getIdParam();

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
    if (str_contains($e->getMessage(), 'REFERENCE constraint') || str_contains($e->getMessage(), 'FK_')) {
        jsonResponse(false, null, 'No se puede eliminar: el usuario tiene registros en bitácora o módulos', 409);
    }
    jsonResponse(false, null, 'Error en la base de datos: ' . $e->getMessage(), 500);
}
