<?php
// ==========================================
// API: USUARIOS
// GET    /api/usuarios/          → listar
// GET    /api/usuarios/?id=5     → uno
// POST   /api/usuarios/          → crear (password obligatorio)
// PUT    /api/usuarios/?id=5     → editar (password opcional)
// DELETE /api/usuarios/?id=5     → eliminar
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Nunca devolver password_hash al frontend
const CAMPOS = 'id, sucursal_id, nombre, username, email, rol, estado,
                ultimo_acceso AS ultimoAcceso, created_at';

function mapUsuario(array $row): array
{
    $acceso = $row['ultimoAcceso'];
    if ($acceso instanceof DateTime) {
        $row['ultimoAcceso'] = $acceso->format('d/m/Y H:i');
    } elseif ($acceso) {
        $row['ultimoAcceso'] = date('d/m/Y H:i', strtotime($acceso));
    } else {
        $row['ultimoAcceso'] = null;
    }
    return $row;
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $id = getIdParam();
                $stmt = $pdo->prepare('SELECT ' . CAMPOS . ' FROM usuarios WHERE id = ?');
                $stmt->execute([$id]);
                $usuario = $stmt->fetch();
                if (!$usuario) {
                    jsonResponse(false, null, 'Usuario no encontrado', 404);
                }
                jsonResponse(true, mapUsuario($usuario), 'Usuario obtenido correctamente');
            }

            $stmt = $pdo->query('SELECT ' . CAMPOS . ' FROM usuarios ORDER BY nombre');
            $usuarios = array_map('mapUsuario', $stmt->fetchAll());
            jsonResponse(true, $usuarios, 'Usuarios obtenidos correctamente', 200, count($usuarios));
            break;

        case 'POST':
            $input = getJsonInput();
            requireFields($input, ['nombre', 'username', 'email', 'password']);

            $stmt = $pdo->prepare(
                'INSERT INTO usuarios (sucursal_id, nombre, username, email, password_hash, rol, estado)
                 OUTPUT INSERTED.id
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                (int) ($input['sucursal_id'] ?? 1),
                $input['nombre'],
                $input['username'],
                $input['email'],
                password_hash($input['password'], PASSWORD_BCRYPT),
                $input['rol'] ?? 'Cajero',
                $input['estado'] ?? 'Activo',
            ]);
            $newId = (int) $stmt->fetchColumn();

            jsonResponse(true, ['id' => $newId], 'Usuario creado correctamente', 201);
            break;

        case 'PUT':
            $id = getIdParam();
            $input = getJsonInput();
            requireFields($input, ['nombre', 'username', 'email']);

            $sql = 'UPDATE usuarios
                    SET nombre = ?, username = ?, email = ?, rol = ?, estado = ?';
            $params = [
                $input['nombre'],
                $input['username'],
                $input['email'],
                $input['rol'] ?? 'Cajero',
                $input['estado'] ?? 'Activo',
            ];

            // Solo actualizar contraseña si se envió una nueva
            if (!empty($input['password'])) {
                $sql .= ', password_hash = ?';
                $params[] = password_hash($input['password'], PASSWORD_BCRYPT);
            }

            $sql .= ' WHERE id = ?';
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            if ($stmt->rowCount() === 0) {
                jsonResponse(false, null, 'Usuario no encontrado', 404);
            }
            jsonResponse(true, null, 'Usuario actualizado correctamente');
            break;

        case 'DELETE':
            $id = getIdParam();

            $stmt = $pdo->prepare('DELETE FROM usuarios WHERE id = ?');
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(false, null, 'Usuario no encontrado', 404);
            }
            jsonResponse(true, null, 'Usuario eliminado correctamente');
            break;

        default:
            jsonResponse(false, null, 'Método no permitido', 405);
    }
} catch (PDOException $e) {
    $msg = $e->getMessage();
    if (str_contains($msg, 'UNIQUE KEY constraint') || str_contains($msg, 'duplicate key')) {
        jsonResponse(false, null, 'El username o email ya está en uso', 409);
    }
    if (str_contains($msg, 'REFERENCE constraint')) {
        jsonResponse(false, null, 'No se puede eliminar: el usuario tiene ventas registradas', 409);
    }
    jsonResponse(false, null, 'Error en la base de datos', 500);
}
