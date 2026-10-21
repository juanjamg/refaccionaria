<?php
// ==========================================
// API: PROVEEDORES
// GET    /api/proveedores/          → listar
// GET    /api/proveedores/?id=5     → uno
// POST   /api/proveedores/          → crear
// PUT    /api/proveedores/?id=5     → editar
// DELETE /api/proveedores/?id=5     → eliminar
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// El frontend usa "creditoDias", la BD usa "dias_credito"
const CAMPOS = 'id, empresa, contacto, rfc, telefono, email, categoria,
                dias_credito AS creditoDias, estado, created_at';

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $id = getIdParam();
                $stmt = $pdo->prepare('SELECT ' . CAMPOS . ' FROM proveedores WHERE id = ?');
                $stmt->execute([$id]);
                $proveedor = $stmt->fetch();
                if (!$proveedor) {
                    jsonResponse(false, null, 'Proveedor no encontrado', 404);
                }
                jsonResponse(true, $proveedor, 'Proveedor obtenido correctamente');
            }

            $stmt = $pdo->query('SELECT ' . CAMPOS . ' FROM proveedores ORDER BY empresa');
            $proveedores = $stmt->fetchAll();
            jsonResponse(true, $proveedores, 'Proveedores obtenidos correctamente', 200, count($proveedores));
            break;

        case 'POST':
            $input = getJsonInput();
            requireFields($input, ['empresa', 'telefono']);

            $stmt = $pdo->prepare(
                'INSERT INTO proveedores (empresa, contacto, rfc, telefono, email, categoria, dias_credito, estado)
                 OUTPUT INSERTED.id
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $input['empresa'],
                $input['contacto'] ?? null,
                $input['rfc'] ?? null,
                $input['telefono'],
                $input['email'] ?? null,
                $input['categoria'] ?? null,
                (int) ($input['creditoDias'] ?? 0),
                $input['estado'] ?? 'Activo',
            ]);
            $newId = (int) $stmt->fetchColumn();

            jsonResponse(true, ['id' => $newId], 'Proveedor registrado correctamente', 201);
            break;

        case 'PUT':
            $id = getIdParam();
            $input = getJsonInput();
            requireFields($input, ['empresa', 'telefono']);

            $stmt = $pdo->prepare(
                'UPDATE proveedores
                 SET empresa = ?, contacto = ?, rfc = ?, telefono = ?, email = ?,
                     categoria = ?, dias_credito = ?, estado = ?
                 WHERE id = ?'
            );
            $stmt->execute([
                $input['empresa'],
                $input['contacto'] ?? null,
                $input['rfc'] ?? null,
                $input['telefono'],
                $input['email'] ?? null,
                $input['categoria'] ?? null,
                (int) ($input['creditoDias'] ?? 0),
                $input['estado'] ?? 'Activo',
                $id,
            ]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(false, null, 'Proveedor no encontrado', 404);
            }
            jsonResponse(true, null, 'Proveedor actualizado correctamente');
            break;

        case 'DELETE':
            $id = getIdParam();

            $stmt = $pdo->prepare('DELETE FROM proveedores WHERE id = ?');
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(false, null, 'Proveedor no encontrado', 404);
            }
            jsonResponse(true, null, 'Proveedor eliminado correctamente');
            break;

        default:
            jsonResponse(false, null, 'Método no permitido', 405);
    }
} catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'REFERENCE constraint')) {
        jsonResponse(false, null, 'No se puede eliminar: el proveedor tiene productos asociados', 409);
    }
    jsonResponse(false, null, 'Error en la base de datos', 500);
}
