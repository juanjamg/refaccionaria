<?php
// ==========================================
// API: PROVEEDORES (Compatible con script.sql - Stored Procedures)
// GET    /api/proveedores/          → listar
// GET    /api/proveedores/?id=5     → uno
// POST   /api/proveedores/          → crear (sp_CrearProveedor)
// PUT    /api/proveedores/?id=5     → editar (sp_ModificarProveedor)
// DELETE /api/proveedores/?id=5     → eliminar (sp_EliminarProveedor)
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

const CAMPOS_SELECT = 'Id_Proveedor AS id,
                       Nombre_Proveedor AS empresa,
                       Rfc AS rfc,
                       Telefono AS telefono,
                       Direccion_Calle AS direccion_calle,
                       Direccion_Colonia AS direccion_colonia,
                       Direccion_No AS direccion_no,
                       Direccion_Cp AS direccion_cp,
                       Direccion_Cd AS direccion_cd,
                       Direccion_Estado AS direccion_estado,
                       Nombre_Contacto AS contacto';

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $id = getIdParam();
                $stmt = $pdo->prepare('SELECT ' . CAMPOS_SELECT . ' FROM dbo.Proveedor WHERE Id_Proveedor = ?');
                $stmt->execute([$id]);
                $proveedor = $stmt->fetch();
                if (!$proveedor) {
                    jsonResponse(false, null, 'Proveedor no encontrado', 404);
                }
                jsonResponse(true, $proveedor, 'Proveedor obtenido correctamente');
            }

            $stmt = $pdo->query('SELECT ' . CAMPOS_SELECT . ' FROM dbo.Proveedor ORDER BY Nombre_Proveedor');
            $proveedores = $stmt->fetchAll();
            jsonResponse(true, $proveedores, 'Proveedores obtenidos correctamente', 200, count($proveedores));
            break;

        case 'POST':
            $input = getJsonInput();
            requireFields($input, [
                'empresa', 'contacto', 'rfc', 'telefono',
                'direccion_calle', 'direccion_colonia', 'direccion_no',
                'direccion_cp', 'direccion_cd', 'direccion_estado'
            ]);

            $sql = 'EXEC dbo.sp_CrearProveedor
                        @Nombre_Proveedor = ?,
                        @Rfc = ?,
                        @Telefono = ?,
                        @Direccion_Calle = ?,
                        @Direccion_Colonia = ?,
                        @Direccion_No = ?,
                        @Direccion_Cp = ?,
                        @Direccion_Cd = ?,
                        @Direccion_Estado = ?,
                        @Nombre_Contacto = ?;
                    SELECT SCOPE_IDENTITY() AS id;';

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $input['empresa'],
                $input['rfc'],
                $input['telefono'],
                $input['direccion_calle'],
                $input['direccion_colonia'],
                $input['direccion_no'],
                $input['direccion_cp'],
                $input['direccion_cd'],
                $input['direccion_estado'],
                $input['contacto'],
            ]);
            $res = $stmt->fetch();
            $newId = (int) ($res['id'] ?? 0);

            jsonResponse(true, ['id' => $newId], 'Proveedor registrado correctamente', 201);
            break;

        case 'PUT':
            $id = getIdParam();
            $input = getJsonInput();
            requireFields($input, [
                'empresa', 'contacto', 'rfc', 'telefono',
                'direccion_calle', 'direccion_colonia', 'direccion_no',
                'direccion_cp', 'direccion_cd', 'direccion_estado'
            ]);

            $sql = 'EXEC dbo.sp_ModificarProveedor
                        @Id_Proveedor = ?,
                        @Nombre_Proveedor = ?,
                        @Rfc = ?,
                        @Telefono = ?,
                        @Direccion_Calle = ?,
                        @Direccion_Colonia = ?,
                        @Direccion_No = ?,
                        @Direccion_Cp = ?,
                        @Direccion_Cd = ?,
                        @Direccion_Estado = ?,
                        @Nombre_Contacto = ?;';

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id,
                $input['empresa'],
                $input['rfc'],
                $input['telefono'],
                $input['direccion_calle'],
                $input['direccion_colonia'],
                $input['direccion_no'],
                $input['direccion_cp'],
                $input['direccion_cd'],
                $input['direccion_estado'],
                $input['contacto'],
            ]);

            jsonResponse(true, null, 'Proveedor actualizado correctamente');
            break;

        case 'DELETE':
            $id = getIdParam();

            $sql = 'EXEC dbo.sp_EliminarProveedor @Id_Proveedor = ?;';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            jsonResponse(true, null, 'Proveedor eliminado correctamente');
            break;

        default:
            jsonResponse(false, null, 'Método no permitido', 405);
    }
} catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'REFERENCE constraint') || str_contains($e->getMessage(), 'FK_')) {
        jsonResponse(false, null, 'No se puede eliminar: el proveedor tiene compras o productos asociados', 409);
    }
    jsonResponse(false, null, 'Error en la base de datos: ' . $e->getMessage(), 500);
}
