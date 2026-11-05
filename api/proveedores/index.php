<?php
// ==========================================
// API: PROVEEDORES (Compatible con script.sql - Stored Procedures)
// GET    /api/proveedores/          → listar (requiere auth)
// GET    /api/proveedores/?id=5     → uno (requiere auth)
// POST   /api/proveedores/          → crear (requiere auth)
// PUT    /api/proveedores/?id=5     → editar (requiere auth)
// DELETE /api/proveedores/?id=5     → eliminar (requiere auth)
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

// Todas las operaciones requieren autenticación
requireAuth();

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

            $empresa = sanitizeString($input['empresa']);
            $contacto = sanitizeString($input['contacto']);
            $rfc = strtoupper(sanitizeString($input['rfc']));
            $telefono = sanitizeString($input['telefono']);
            $calle = sanitizeString($input['direccion_calle']);
            $colonia = sanitizeString($input['direccion_colonia']);
            $numero = sanitizeString($input['direccion_no']);
            $cp = sanitizeString($input['direccion_cp']);
            $ciudad = sanitizeString($input['direccion_cd']);
            $estado = sanitizeString($input['direccion_estado']);

            validateLength($empresa, 'empresa', 100, 2);
            validateLength($contacto, 'contacto', 100, 2);
            validateLength($rfc, 'rfc', 15, 10);
            validateLength($telefono, 'telefono', 20, 7);
            validateLength($calle, 'direccion_calle', 100, 2);
            validateLength($colonia, 'direccion_colonia', 100, 2);
            validateLength($numero, 'direccion_no', 20, 1);
            validateLength($cp, 'direccion_cp', 10, 3);
            validateLength($ciudad, 'direccion_cd', 50, 2);
            validateLength($estado, 'direccion_estado', 50, 2);

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
                $empresa,
                $rfc,
                $telefono,
                $calle,
                $colonia,
                $numero,
                $cp,
                $ciudad,
                $estado,
                $contacto,
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

            $empresa = sanitizeString($input['empresa']);
            $contacto = sanitizeString($input['contacto']);
            $rfc = strtoupper(sanitizeString($input['rfc']));
            $telefono = sanitizeString($input['telefono']);
            $calle = sanitizeString($input['direccion_calle']);
            $colonia = sanitizeString($input['direccion_colonia']);
            $numero = sanitizeString($input['direccion_no']);
            $cp = sanitizeString($input['direccion_cp']);
            $ciudad = sanitizeString($input['direccion_cd']);
            $estado = sanitizeString($input['direccion_estado']);

            validateLength($empresa, 'empresa', 100, 2);
            validateLength($contacto, 'contacto', 100, 2);
            validateLength($rfc, 'rfc', 15, 10);
            validateLength($telefono, 'telefono', 20, 7);
            validateLength($calle, 'direccion_calle', 100, 2);
            validateLength($colonia, 'direccion_colonia', 100, 2);
            validateLength($numero, 'direccion_no', 20, 1);
            validateLength($cp, 'direccion_cp', 10, 3);
            validateLength($ciudad, 'direccion_cd', 50, 2);
            validateLength($estado, 'direccion_estado', 50, 2);

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
                $empresa,
                $rfc,
                $telefono,
                $calle,
                $colonia,
                $numero,
                $cp,
                $ciudad,
                $estado,
                $contacto,
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
    handleDbException($e, 'Error en el módulo de proveedores');
}
