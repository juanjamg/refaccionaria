<?php
// ==========================================
// API: INVENTARIOS Y MOVIMIENTOS DE STOCK
// GET  /api/inventario/          → lista completa de almacén, valorización y métricas
// POST /api/inventario/          → ajuste / entrada / salida de stock
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

// Todas las operaciones requieren autenticación
requireAuth();

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Sincronizar previamente cualquier producto que no tenga fila en Inventario
            $pdo->exec('
                INSERT INTO dbo.Inventario (Id_Producto, Precio_Com_Prom, Precio_Ven_Prom, Existencia)
                SELECT p.Id_Producto, 0, p.Precio_Venta, p.Stock
                FROM dbo.Productos p
                WHERE NOT EXISTS (SELECT 1 FROM dbo.Inventario i WHERE i.Id_Producto = p.Id_Producto)
            ');

            $sql = '
                SELECT 
                    p.Id_Producto AS id_producto,
                    p.Codigo_SKU AS sku,
                    p.Nombre_Producto AS nombre,
                    p.Marca AS marca,
                    p.Status AS status,
                    l.Nombre_Linea AS linea,
                    c.Nombre_Categoria AS categoria,
                    ISNULL(i.Existencia, p.Stock) AS existencia,
                    ISNULL(i.Precio_Com_Prom, 0) AS precio_compra_prom,
                    ISNULL(i.Precio_Ven_Prom, p.Precio_Venta) AS precio_venta_prom,
                    p.Precio_Venta AS precio_venta_catalogo
                FROM dbo.Productos p
                LEFT JOIN dbo.Inventario i ON p.Id_Producto = i.Id_Producto
                LEFT JOIN dbo.Lineas l ON p.Id_Linea = l.Id_Linea
                LEFT JOIN dbo.Categoria c ON l.Id_Categoria = c.Id_Categoria
                ORDER BY p.Nombre_Producto
            ';

            $stmt = $pdo->query($sql);
            $rows = $stmt->fetchAll();

            $items = [];
            $unidadesTotales = 0;
            $valorTotalCosto = 0;
            $valorTotalVenta = 0;
            $agotadosCount = 0;
            $bajosCount = 0;
            $optimosCount = 0;

            foreach ($rows as $r) {
                $existencia = (int) $r['existencia'];
                $costo = (float) $r['precio_compra_prom'];
                $venta = (float) $r['precio_venta_prom'];
                $valorCosto = $existencia * $costo;
                $valorVenta = $existencia * $venta;

                $nivel = 'Normal';
                if ($existencia <= 0) {
                    $nivel = 'Agotado';
                    $agotadosCount++;
                } elseif ($existencia <= 5) {
                    $nivel = 'Bajo';
                    $bajosCount++;
                } else {
                    $optimosCount++;
                }

                $unidadesTotales += max(0, $existencia);
                $valorTotalCosto += max(0, $valorCosto);
                $valorTotalVenta += max(0, $valorVenta);

                $status = (string) ($r['status'] ?? '1');
                $items[] = [
                    'id_producto' => (int) $r['id_producto'],
                    'sku' => $r['sku'],
                    'nombre' => $r['nombre'],
                    'marca' => $r['marca'] ?? 'Genérico',
                    'linea' => $r['linea'] ?? 'General',
                    'categoria' => $r['categoria'] ?? 'Sin Categoría',
                    'existencia' => $existencia,
                    'precio_compra_prom' => round($costo, 2),
                    'precio_venta_prom' => round($venta, 2),
                    'valor_total_costo' => round($valorCosto, 2),
                    'valor_total_venta' => round($valorVenta, 2),
                    'nivel_stock' => $nivel,
                    'estado' => ($status === '1' || $status === 'A' || $status === 'Activo') ? 'Activo' : 'Inactivo',
                ];
            }

            $stats = [
                'total_articulos' => count($items),
                'unidades_totales' => $unidadesTotales,
                'valor_inventario_costo' => round($valorTotalCosto, 2),
                'valor_inventario_venta' => round($valorTotalVenta, 2),
                'articulos_agotados' => $agotadosCount,
                'articulos_stock_bajo' => $bajosCount,
                'articulos_stock_optimo' => $optimosCount,
            ];

            jsonResponse(true, [
                'items' => $items,
                'stats' => $stats
            ], 'Inventario obtenido correctamente', 200, count($items));
            break;

        case 'POST':
            $input = getJsonInput();
            requireFields($input, ['id_producto', 'tipo_movimiento', 'cantidad']);

            $idProducto = (int) $input['id_producto'];
            $tipo = strtolower(sanitizeString($input['tipo_movimiento']));
            $cantidad = (int) $input['cantidad'];
            $costoUnitario = isset($input['costo_unitario']) ? (float) $input['costo_unitario'] : 0.0;
            $motivo = sanitizeString((string) ($input['motivo'] ?? ''));

            if (!in_array($tipo, ['entrada', 'salida', 'ajuste'], true)) {
                jsonResponse(false, null, 'Tipo de movimiento inválido. Debe ser: entrada, salida o ajuste.', 400);
            }

            if ($cantidad < 0 || ($cantidad === 0 && $tipo !== 'ajuste')) {
                jsonResponse(false, null, 'La cantidad debe ser mayor a cero.', 400);
            }

            // Verificar existencia actual
            $stmtProd = $pdo->prepare('
                SELECT p.Id_Producto, p.Nombre_Producto, p.Stock, ISNULL(i.Existencia, p.Stock) AS existencia, ISNULL(i.Precio_Com_Prom, 0) AS costo
                FROM dbo.Productos p
                LEFT JOIN dbo.Inventario i ON p.Id_Producto = i.Id_Producto
                WHERE p.Id_Producto = ?
            ');
            $stmtProd->execute([$idProducto]);
            $producto = $stmtProd->fetch();

            if (!$producto) {
                jsonResponse(false, null, 'Producto no encontrado en inventario.', 404);
            }

            $existenciaActual = (int) $producto['existencia'];
            $pdo->beginTransaction();

            if ($tipo === 'entrada') {
                if ($costoUnitario > 0) {
                    // Usar procedimiento almacenado si existe para recalcular costo ponderado y precio venta
                    try {
                        $spStmt = $pdo->prepare('EXEC dbo.sp_ActualizarCostoEInventario @Id_Producto = ?, @Cantidad_Comprada = ?, @Precio_Compra = ?');
                        $spStmt->execute([$idProducto, $cantidad, $costoUnitario]);
                    } catch (\Throwable $e) {
                        // Fallback cálculo directo si no tuviera categoría
                        $nuevaExistencia = $existenciaActual + $cantidad;
                        $nuevoCosto = ($nuevaExistencia > 0)
                            ? (($existenciaActual * (float)$producto['costo']) + ($cantidad * $costoUnitario)) / $nuevaExistencia
                            : $costoUnitario;
                        $updInv = $pdo->prepare('
                            UPDATE dbo.Inventario 
                            SET Existencia = ?, Precio_Com_Prom = ?
                            WHERE Id_Producto = ?
                        ');
                        $updInv->execute([$nuevaExistencia, $nuevoCosto, $idProducto]);
                    }
                } else {
                    $nuevaExistencia = $existenciaActual + $cantidad;
                    $updInv = $pdo->prepare('UPDATE dbo.Inventario SET Existencia = ? WHERE Id_Producto = ?');
                    $updInv->execute([$nuevaExistencia, $idProducto]);
                }

                // Sincronizar campo Stock en dbo.Productos
                $updProd = $pdo->prepare('UPDATE dbo.Productos SET Stock = Stock + ? WHERE Id_Producto = ?');
                $updProd->execute([$cantidad, $idProducto]);

                $nuevaExistenciaFinal = $existenciaActual + $cantidad;
                $msg = "Entrada de {$cantidad} unidades registrada con éxito. Existencia resultante: {$nuevaExistenciaFinal}";

            } elseif ($tipo === 'salida') {
                if ($existenciaActual < $cantidad) {
                    $pdo->rollBack();
                    jsonResponse(false, null, "Stock insuficiente. Existencia actual: {$existenciaActual}, se intentó retirar: {$cantidad}.", 400);
                }

                $nuevaExistenciaFinal = $existenciaActual - $cantidad;

                $updInv = $pdo->prepare('UPDATE dbo.Inventario SET Existencia = ? WHERE Id_Producto = ?');
                $updInv->execute([$nuevaExistenciaFinal, $idProducto]);

                $updProd = $pdo->prepare('UPDATE dbo.Productos SET Stock = ? WHERE Id_Producto = ?');
                $updProd->execute([$nuevaExistenciaFinal, $idProducto]);

                $msg = "Salida de {$cantidad} unidades procesada con éxito. Existencia resultante: {$nuevaExistenciaFinal}";

            } else { // 'ajuste'
                $nuevaExistenciaFinal = $cantidad;

                $sqlAjuste = 'UPDATE dbo.Inventario SET Existencia = ?';
                $params = [$nuevaExistenciaFinal];
                if ($costoUnitario > 0) {
                    $sqlAjuste .= ', Precio_Com_Prom = ?';
                    $params[] = $costoUnitario;
                }
                $sqlAjuste .= ' WHERE Id_Producto = ?';
                $params[] = $idProducto;

                $updInv = $pdo->prepare($sqlAjuste);
                $updInv->execute($params);

                $updProd = $pdo->prepare('UPDATE dbo.Productos SET Stock = ? WHERE Id_Producto = ?');
                $updProd->execute([$nuevaExistenciaFinal, $idProducto]);

                $msg = "Ajuste físico de inventario establecido en {$nuevaExistenciaFinal} unidades correctamente.";
            }

            $pdo->commit();

            jsonResponse(true, [
                'id_producto' => $idProducto,
                'nueva_existencia' => $nuevaExistenciaFinal,
                'tipo' => $tipo,
                'motivo' => $motivo
            ], $msg);
            break;

        default:
            jsonResponse(false, null, 'Método HTTP no permitido', 405);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    handleDbException($e, 'Error en el módulo de inventarios');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, null, $e->getMessage(), 500);
}
