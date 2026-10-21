<?php
// ==========================================
// API: CLIENTES
// GET    /api/clientes/          → listar
// GET    /api/clientes/?id=5     → uno
// POST   /api/clientes/          → crear
// PUT    /api/clientes/?id=5     → editar
// DELETE /api/clientes/?id=5     → eliminar
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $id = getIdParam();
                $stmt = $pdo->prepare('SELECT * FROM clientes WHERE id = ?');
                $stmt->execute([$id]);
                $cliente = $stmt->fetch();
                if (!$cliente) {
                    jsonResponse(false, null, 'Cliente no encontrado', 404);
                }
                jsonResponse(true, $cliente, 'Cliente obtenido correctamente');
            }

            $stmt = $pdo->query('SELECT * FROM clientes ORDER BY nombre');
            $clientes = $stmt->fetchAll();
            jsonResponse(true, $clientes, 'Clientes obtenidos correctamente', 200, count($clientes));
            break;

        case 'POST':
            $input = getJsonInput();
            requireFields($input, ['nombre', 'telefono']);

            $stmt = $pdo->prepare(
                'INSERT INTO clientes (nombre, tipo, rfc, telefono, email, estado)
                 OUTPUT INSERTED.id
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $input['nombre'],
                $input['tipo'] ?? 'Particular',
                $input['rfc'] ?? null,
                $input['telefono'],
                $input['email'] ?? null,
                $input['estado'] ?? 'Activo',
            ]);
            $newId = (int) $stmt->fetchColumn();

            jsonResponse(true, ['id' => $newId], 'Cliente registrado correctamente', 201);
            break;

        case 'PUT':
            $id = getIdParam();
            $input = getJsonInput();
            requireFields($input, ['nombre', 'telefono']);

            $stmt = $pdo->prepare(
                'UPDATE clientes
                 SET nombre = ?, tipo = ?, rfc = ?, telefono = ?, email = ?, estado = ?
                 WHERE id = ?'
            );
            $stmt->execute([
                $input['nombre'],
                $input['tipo'] ?? 'Particular',
                $input['rfc'] ?? null,
                $input['telefono'],
                $input['email'] ?? null,
                $input['estado'] ?? 'Activo',
                $id,
            ]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(false, null, 'Cliente no encontrado', 404);
            }
            jsonResponse(true, null, 'Cliente actualizado correctamente');
            break;

        case 'DELETE':
            $id = getIdParam();

            $stmt = $pdo->prepare('DELETE FROM clientes WHERE id = ?');
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(false, null, 'Cliente no encontrado', 404);
            }
            jsonResponse(true, null, 'Cliente eliminado correctamente');
            break;

        default:
            jsonResponse(false, null, 'Método no permitido', 405);
    }
} catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'REFERENCE constraint')) {
        jsonResponse(false, null, 'No se puede eliminar: el cliente tiene ventas registradas', 409);
    }
    jsonResponse(false, null, 'Error en la base de datos', 500);
}
