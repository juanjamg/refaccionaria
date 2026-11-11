<?php
// ==========================================
// API: PRODUCTOS (Compatible con script.sql - Stored Procedures)
// GET    /api/productos/          → listar productos con stock e inventario
// GET    /api/productos/?id=5     → detalle de un producto
// POST   /api/productos/          → crear producto y sincronizar inventario
// PUT    /api/productos/?id=5     → editar producto y sincronizar inventario
// DELETE /api/productos/?id=5     → eliminar producto
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

// Todas las operaciones requieren autenticación
requireAuth();

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

function formatProducto(array $row): array
{
    $status = (string) ($row['status'] ?? '1');
    $row['id'] = (int) $row['id'];
    $row['id_linea'] = !empty($row['id_linea']) ? (int) $row['id_linea'] : null;
    $row['id_categoria'] = !empty($row['id_categoria']) ? (int) $row['id_categoria'] : null;
    $row['precio_venta'] = (float) ($row['precio_venta'] ?? 0);
    $row['precio_compra'] = (float) ($row['precio_compra'] ?? 0);
    $row['stock'] = (int) ($row['stock'] ?? 0);
    $row['existencia'] = (int) ($row['existencia'] ?? $row['stock']);
    $row['estado'] = ($status === '1' || $status === 'A' || $status === 'Activo') ? 'Activo' : 'Inactivo';
    $row['linea'] = $row['linea'] ?? 'General';
    $row['categoria'] = $row['categoria'] ?? 'Sin Categoría';
    return $row;
}

const SELECT_PRODUCTOS_SQL = '
    SELECT 
        p.Id_Producto AS id,
        p.Codigo_SKU AS sku,
        p.Nombre_Producto AS nombre,
        p.Marca AS marca,
        p.Id_Linea AS id_linea,
        l.Nombre_Linea AS linea,
        c.Id_Categoria AS id_categoria,
        c.Nombre_Categoria AS categoria,
        p.Precio_Venta AS precio_venta,
        p.Stock AS stock,
        p.Status AS status,
        ISNULL(i.Precio_Com_Prom, 0) AS precio_compra,
        ISNULL(i.Existencia, p.Stock) AS existencia
    FROM dbo.Productos p
    LEFT JOIN dbo.Lineas l ON p.Id_Linea = l.Id_Linea
    LEFT JOIN dbo.Categoria c ON l.Id_Categoria = c.Id_Categoria
    LEFT JOIN dbo.Inventario i ON p.Id_Producto = i.Id_Producto
';

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $id = getIdParam();
                $stmt = $pdo->prepare(SELECT_PRODUCTOS_SQL . ' WHERE p.Id_Producto = ?');
                $stmt->execute([$id]);
                $producto = $stmt->fetch();
                if (!$producto) {
                    jsonResponse(false, null, 'Producto no encontrado', 404);
                }
                jsonResponse(true, formatProducto($producto), 'Producto obtenido correctamente');
            }

            $stmt = $pdo->query(SELECT_PRODUCTOS_SQL . ' ORDER BY p.Nombre_Producto');
            $rows = $stmt->fetchAll();
            $productos = array_map('formatProducto', $rows);
            jsonResponse(true, $productos, 'Productos obtenidos correctamente', 200, count($productos));
            break;

        case 'POST':
            $input = getJsonInput();
            requireFields($input, ['sku', 'nombre', 'precio_venta']);

            $sku = strtoupper(sanitizeString((string) $input['sku']));
            $nombre = sanitizeString((string) $input['nombre']);
            $marca = sanitizeString((string) ($input['marca'] ?? ''));
            $idLinea = !empty($input['id_linea']) ? (int) $input['id_linea'] : null;
            $precioVenta = (float) $input['precio_venta'];
            $stock = isset($input['stock']) ? max(0, (int) $input['stock']) : 0;
            $precioCompra = isset($input['precio_compra']) ? max(0, (float) $input['precio_compra']) : 0;
            $statusInput = (string) ($input['status'] ?? '1');
            $status = ($statusInput === '0' || $statusInput === 'Inactivo') ? '0' : '1';

            validateLength($sku, 'sku', 50, 2);
            validateLength($nombre, 'nombre', 200, 2);
            if ($marca !== '') {
                validateLength($marca, 'marca', 100, 1);
            }

            if ($precioVenta < 0) {
                jsonResponse(false, null, 'El precio de venta no puede ser negativo', 400);
            }

            // Validar SKU único
            $checkStmt = $pdo->prepare('SELECT COUNT(*) FROM dbo.Productos WHERE Codigo_SKU = ?');
            $checkStmt->execute([$sku]);
            if ($checkStmt->fetchColumn() > 0) {
                jsonResponse(false, null, "Ya existe un producto con el código SKU '$sku'", 409);
            }

            $pdo->beginTransaction();

            // Insertar producto
            $spSql = 'DECLARE @newId INT;
                      EXEC dbo.sp_InsertarProducto
                          @Codigo_SKU = ?,
                          @Nombre_Producto = ?,
                          @Marca = ?,
                          @Id_Linea = ?,
                          @Precio_Venta = ?,
                          @Stock = ?,
                          @Status = ?,
                          @Id_ProductoInsertado = @newId OUTPUT;
                      SELECT @newId AS id;';

            $stmt = $pdo->prepare($spSql);
            $stmt->execute([
                $sku,
                $nombre,
                $marca ?: null,
                $idLinea,
                $precioVenta,
                $stock,
                $status
            ]);
            $res = $stmt->fetch();
            $newId = (int) ($res['id'] ?? 0);

            if ($newId <= 0) {
                $pdo->rollBack();
                jsonResponse(false, null, 'No se pudo generar el registro del producto', 500);
            }

            // Sincronizar en dbo.Inventario
            $stmtInv = $pdo->prepare('
                IF EXISTS (SELECT 1 FROM dbo.Inventario WHERE Id_Producto = ?)
                    UPDATE dbo.Inventario 
                    SET Existencia = ?, Precio_Com_Prom = ?, Precio_Ven_Prom = ?
                    WHERE Id_Producto = ?
                ELSE
                    INSERT INTO dbo.Inventario (Id_Producto, Precio_Com_Prom, Precio_Ven_Prom, Existencia)
                    VALUES (?, ?, ?, ?)
            ');
            $stmtInv->execute([
                $newId,
                $stock, $precioCompra, $precioVenta,
                $newId,
                $newId, $precioCompra, $precioVenta, $stock
            ]);

            $pdo->commit();
            jsonResponse(true, ['id' => $newId], 'Producto registrado e inventario inicializado correctamente', 201);
            break;

        case 'PUT':
            $id = getIdParam();
            $input = getJsonInput();
            requireFields($input, ['sku', 'nombre', 'precio_venta']);

            $sku = strtoupper(sanitizeString((string) $input['sku']));
            $nombre = sanitizeString((string) $input['nombre']);
            $marca = sanitizeString((string) ($input['marca'] ?? ''));
            $idLinea = !empty($input['id_linea']) ? (int) $input['id_linea'] : null;
            $precioVenta = (float) $input['precio_venta'];
            $stock = isset($input['stock']) ? max(0, (int) $input['stock']) : 0;
            $precioCompra = isset($input['precio_compra']) ? max(0, (float) $input['precio_compra']) : null;
            $statusInput = (string) ($input['status'] ?? '1');
            $status = ($statusInput === '0' || $statusInput === 'Inactivo') ? '0' : '1';

            validateLength($sku, 'sku', 50, 2);
            validateLength($nombre, 'nombre', 200, 2);
            if ($marca !== '') {
                validateLength($marca, 'marca', 100, 1);
            }

            if ($precioVenta < 0) {
                jsonResponse(false, null, 'El precio de venta no puede ser negativo', 400);
            }

            // Validar SKU único en otros productos
            $checkStmt = $pdo->prepare('SELECT COUNT(*) FROM dbo.Productos WHERE Codigo_SKU = ? AND Id_Producto != ?');
            $checkStmt->execute([$sku, $id]);
            if ($checkStmt->fetchColumn() > 0) {
                jsonResponse(false, null, "El código SKU '$sku' ya está asignado a otro producto", 409);
            }

            $pdo->beginTransaction();

            $spSql = 'DECLARE @msg VARCHAR(200);
                      EXEC dbo.sp_ModificarProducto
                          @Id_Producto = ?,
                          @Codigo_SKU = ?,
                          @Nombre_Producto = ?,
                          @Marca = ?,
                          @Id_Linea = ?,
                          @Precio_Venta = ?,
                          @Stock = ?,
                          @Status = ?,
                          @Mensaje = @msg OUTPUT;
                      SELECT @msg AS mensaje;';

            $stmt = $pdo->prepare($spSql);
            $stmt->execute([
                $id,
                $sku,
                $nombre,
                $marca ?: null,
                $idLinea,
                $precioVenta,
                $stock,
                $status
            ]);
            $res = $stmt->fetch();

            // Sincronizar existencia y precios en Inventario
            $sqlInv = '
                IF EXISTS (SELECT 1 FROM dbo.Inventario WHERE Id_Producto = ?)
                    UPDATE dbo.Inventario 
                    SET Existencia = ?, 
                        Precio_Ven_Prom = ?,
                        Precio_Com_Prom = CASE WHEN ? > 0 THEN ? ELSE Precio_Com_Prom END
                    WHERE Id_Producto = ?
                ELSE
                    INSERT INTO dbo.Inventario (Id_Producto, Precio_Com_Prom, Precio_Ven_Prom, Existencia)
                    VALUES (?, ?, ?, ?)
            ';
            $stmtInv = $pdo->prepare($sqlInv);
            $costoParam = ($precioCompra !== null) ? $precioCompra : 0;
            $stmtInv->execute([
                $id,
                $stock, $precioVenta, $costoParam, $costoParam, $id,
                $id, $costoParam, $precioVenta, $stock
            ]);

            $pdo->commit();
            jsonResponse(true, ['id' => $id], $res['mensaje'] ?? 'Producto actualizado correctamente');
            break;

        case 'DELETE':
            $id = getIdParam();

            // Verificar si tiene historial en ventas
            $checkVentas = $pdo->prepare('SELECT COUNT(*) FROM dbo.Ventas_Detalle WHERE Id_Producto = ?');
            $checkVentas->execute([$id]);
            if ($checkVentas->fetchColumn() > 0) {
                jsonResponse(false, null, 'No se puede eliminar el producto porque tiene ventas registradas. Puede cambiar su estado a "Inactivo" para que no aparezca en ventas.', 409);
            }

            // Verificar si tiene compras
            $checkCompras = $pdo->prepare('SELECT COUNT(*) FROM dbo.Compra_Detalle WHERE Id_Producto = ?');
            $checkCompras->execute([$id]);
            if ($checkCompras->fetchColumn() > 0) {
                jsonResponse(false, null, 'No se puede eliminar el producto porque tiene órdenes de compra asociadas. Puede desactivarlo.', 409);
            }

            $pdo->beginTransaction();

            // Eliminar registro de Inventario asociado
            $delInv = $pdo->prepare('DELETE FROM dbo.Inventario WHERE Id_Producto = ?');
            $delInv->execute([$id]);

            // Eliminar Producto mediante procedimiento almacenado
            $spSql = 'DECLARE @msg VARCHAR(200);
                      EXEC dbo.sp_EliminarProducto
                          @Id_Producto = ?,
                          @Mensaje = @msg OUTPUT;
                      SELECT @msg AS mensaje;';

            $stmt = $pdo->prepare($spSql);
            $stmt->execute([$id]);
            $res = $stmt->fetch();

            $pdo->commit();
            jsonResponse(true, null, $res['mensaje'] ?? 'Producto eliminado correctamente');
            break;

        default:
            jsonResponse(false, null, 'Método HTTP no permitido', 405);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    handleDbException($e, 'Error en el módulo de productos');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, null, $e->getMessage(), 500);
}
