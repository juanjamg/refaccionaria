<?php
// ==========================================
// API: CLIENTES (Compatible con script.sql - Stored Procedures)
// GET    /api/clientes/          → listar
// GET    /api/clientes/?id=5     → uno
// POST   /api/clientes/          → crear (sp_AgregarCliente)
// PUT    /api/clientes/?id=5     → editar (sp_EditarCliente)
// DELETE /api/clientes/?id=5     → eliminar (sp_EliminarCliente)
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

const CAMPOS_SELECT = 'Id_Clientes AS id,
                       Nombre_Clientes AS nombre,
                       Direccion_Calle AS direccion_calle,
                       Direccion_Numero AS direccion_numero,
                       Direccion_Cp AS direccion_cp,
                       Direccion_Cd AS direccion_cd,
                       Rfc AS rfc';

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $id = getIdParam();
                $stmt = $pdo->prepare('SELECT ' . CAMPOS_SELECT . ' FROM dbo.Clientes WHERE Id_Clientes = ?');
                $stmt->execute([$id]);
                $cliente = $stmt->fetch();
                if (!$cliente) {
                    jsonResponse(false, null, 'Cliente no encontrado', 404);
                }
                jsonResponse(true, $cliente, 'Cliente obtenido correctamente');
            }

            $stmt = $pdo->query('SELECT ' . CAMPOS_SELECT . ' FROM dbo.Clientes ORDER BY Nombre_Clientes');
            $clientes = $stmt->fetchAll();
            jsonResponse(true, $clientes, 'Clientes obtenidos correctamente', 200, count($clientes));
            break;

        case 'POST':
            $input = getJsonInput();
            requireFields($input, ['nombre', 'direccion_calle', 'direccion_numero', 'direccion_cp', 'direccion_cd']);

            $sql = 'DECLARE @msg VARCHAR(100), @ok BIT;
                    EXEC dbo.sp_AgregarCliente
                        @Nombre_Clientes = ?,
                        @Direccion_Calle = ?,
                        @Direccion_Numero = ?,
                        @Direccion_Cp = ?,
                        @Direccion_Cd = ?,
                        @Rfc = ?,
                        @MensajeResultado = @msg OUTPUT,
                        @Exitoso = @ok OUTPUT;
                    SELECT @msg AS mensaje, @ok AS exitoso, SCOPE_IDENTITY() AS id;';

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $input['nombre'],
                $input['direccion_calle'],
                $input['direccion_numero'],
                $input['direccion_cp'],
                $input['direccion_cd'],
                $input['rfc'] ?? null,
            ]);
            $res = $stmt->fetch();

            if (!$res || empty($res['exitoso'])) {
                jsonResponse(false, null, $res['mensaje'] ?? 'Error al agregar cliente', 400);
            }

            jsonResponse(true, ['id' => (int) ($res['id'] ?? 0)], $res['mensaje'] ?? 'Cliente registrado correctamente', 201);
            break;

        case 'PUT':
            $id = getIdParam();
            $input = getJsonInput();
            requireFields($input, ['nombre', 'direccion_calle', 'direccion_numero', 'direccion_cp', 'direccion_cd']);

            $sql = 'DECLARE @msg VARCHAR(100), @ok BIT;
                    EXEC dbo.sp_EditarCliente
                        @Id_Clientes = ?,
                        @Nombre_Clientes = ?,
                        @Direccion_Calle = ?,
                        @Direccion_Numero = ?,
                        @Direccion_Cp = ?,
                        @Direccion_Cd = ?,
                        @Rfc = ?,
                        @MensajeResultado = @msg OUTPUT,
                        @Exitoso = @ok OUTPUT;
                    SELECT @msg AS mensaje, @ok AS exitoso;';

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id,
                $input['nombre'],
                $input['direccion_calle'],
                $input['direccion_numero'],
                $input['direccion_cp'],
                $input['direccion_cd'],
                $input['rfc'] ?? null,
            ]);
            $res = $stmt->fetch();

            if (!$res || empty($res['exitoso'])) {
                jsonResponse(false, null, $res['mensaje'] ?? 'Error al actualizar cliente', 400);
            }

            jsonResponse(true, null, $res['mensaje'] ?? 'Cliente actualizado correctamente');
            break;

        case 'DELETE':
            $id = getIdParam();

            $sql = 'DECLARE @msg VARCHAR(100), @ok BIT;
                    EXEC dbo.sp_EliminarCliente
                        @Id_Clientes = ?,
                        @MensajeResultado = @msg OUTPUT,
                        @Exitoso = @ok OUTPUT;
                    SELECT @msg AS mensaje, @ok AS exitoso;';

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            $res = $stmt->fetch();

            if (!$res || empty($res['exitoso'])) {
                jsonResponse(false, null, $res['mensaje'] ?? 'No se pudo eliminar el cliente', 400);
            }

            jsonResponse(true, null, $res['mensaje'] ?? 'Cliente eliminado correctamente');
            break;

        default:
            jsonResponse(false, null, 'Método no permitido', 405);
    }
} catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'REFERENCE constraint') || str_contains($e->getMessage(), 'FK_')) {
        jsonResponse(false, null, 'No se puede eliminar: el cliente tiene registros asociados (ventas)', 409);
    }
    jsonResponse(false, null, 'Error en la base de datos: ' . $e->getMessage(), 500);
}
