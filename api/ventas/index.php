<?php
// ==========================================
// API: VENTAS Y PUNTO DE VENTA (POS)
// GET  /api/ventas/          → Listar ventas recientes con totales
// GET  /api/ventas/?id=X     → Detalle completo de una venta y sus partidas
// POST /api/ventas/          → Registrar nueva venta, descontar inventario y generar folio
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

// Todas las transacciones requieren autenticación activa
requireAuth();

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];
$currentUser = getCurrentUser();

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $idVenta = (int) $_GET['id'];
                
                // Cabecera de la venta
                $stmt = $pdo->prepare('
                    SELECT 
                        v.Id_Venta AS id,
                        v.Fecha_Venta AS fecha,
                        v.Id_Cliente AS id_cliente,
                        ISNULL(c.Nombre_Clientes, \'Público General\') AS cliente,
                        ISNULL(c.Rfc, \'XAXX010101000\') AS cliente_rfc,
                        v.Id_Metodo_Pago AS id_metodo_pago,
                        ISNULL(mp.Descripcion_Metodo, \'Efectivo\') AS metodo_pago
                    FROM dbo.Ventas v
                    LEFT JOIN dbo.Clientes c ON v.Id_Cliente = c.Id_Clientes
                    LEFT JOIN dbo.Metodo_Pago mp ON v.Id_Metodo_Pago = mp.Id_Metodo_Pago
                    WHERE v.Id_Venta = ?
                ');
                $stmt->execute([$idVenta]);
                $venta = $stmt->fetch();

                if (!$venta) {
                    jsonResponse(false, null, 'Venta no encontrada', 404);
                }

                // Partidas / detalle de la venta
                $stmtDet = $pdo->prepare('
                    SELECT 
                        vd.Id_Producto AS id_producto,
                        p.Codigo_SKU AS sku,
                        p.Nombre_Producto AS nombre,
                        p.Marca AS marca,
                        vd.Precio_Venta AS precio_unitario,
                        vd.Cantidad_Producto AS cantidad,
                        ISNULL(vd.Descuento_Venta, 0) AS descuento,
                        ((vd.Precio_Venta * vd.Cantidad_Producto) - ISNULL(vd.Descuento_Venta, 0)) AS subtotal
                    FROM dbo.Ventas_Detalle vd
                    LEFT JOIN dbo.Productos p ON vd.Id_Producto = p.Id_Producto
                    WHERE vd.Id_Venta = ?
                ');
                $stmtDet->execute([$idVenta]);
                $partidas = $stmtDet->fetchAll();

                $subtotal = 0;
                $descuentoTotal = 0;
                foreach ($partidas as $item) {
                    $subtotal += (float) ($item['precio_unitario'] * $item['cantidad']);
                    $descuentoTotal += (float) $item['descuento'];
                }

                $venta['folio'] = 'V-' . str_pad((string)$idVenta, 6, '0', STR_PAD_LEFT);
                $venta['subtotal'] = round($subtotal, 2);
                $venta['descuento'] = round($descuentoTotal, 2);
                $venta['total'] = round(max(0, $subtotal - $descuentoTotal), 2);
                $venta['items'] = $partidas;

                jsonResponse(true, $venta);
            }

            // Listar historial de ventas
            $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 50;
            $stmt = $pdo->prepare("
                SELECT TOP ($limit)
                    v.Id_Venta AS id,
                    v.Fecha_Venta AS fecha,
                    v.Id_Cliente AS id_cliente,
                    ISNULL(c.Nombre_Clientes, 'Público General') AS cliente,
                    v.Id_Metodo_Pago AS id_metodo_pago,
                    ISNULL(mp.Descripcion_Metodo, 'Efectivo') AS metodo_pago,
                    COUNT(vd.Id_Producto) AS articulos_distintos,
                    SUM(vd.Cantidad_Producto) AS total_unidades,
                    SUM(vd.Precio_Venta * vd.Cantidad_Producto) AS subtotal,
                    SUM(ISNULL(vd.Descuento_Venta, 0)) AS total_descuento,
                    SUM((vd.Precio_Venta * vd.Cantidad_Producto) - ISNULL(vd.Descuento_Venta, 0)) AS total
                FROM dbo.Ventas v
                LEFT JOIN dbo.Clientes c ON v.Id_Cliente = c.Id_Clientes
                LEFT JOIN dbo.Metodo_Pago mp ON v.Id_Metodo_Pago = mp.Id_Metodo_Pago
                LEFT JOIN dbo.Ventas_Detalle vd ON v.Id_Venta = vd.Id_Venta
                GROUP BY v.Id_Venta, v.Fecha_Venta, v.Id_Cliente, c.Nombre_Clientes, v.Id_Metodo_Pago, mp.Descripcion_Metodo
                ORDER BY v.Id_Venta DESC
            ");
            $stmt->execute();
            $ventas = $stmt->fetchAll();

            $formatted = array_map(function($v) {
                $sub = (float) ($v['subtotal'] ?? 0);
                $desc = (float) ($v['total_descuento'] ?? 0);
                return [
                    'id' => (int) $v['id'],
                    'folio' => 'V-' . str_pad((string)$v['id'], 6, '0', STR_PAD_LEFT),
                    'fecha' => $v['fecha'],
                    'cliente' => $v['cliente'],
                    'metodo_pago' => $v['metodo_pago'],
                    'articulos' => (int) ($v['articulos_distintos'] ?? 0),
                    'unidades' => (float) ($v['total_unidades'] ?? 0),
                    'subtotal' => round($sub, 2),
                    'descuento' => round($desc, 2),
                    'total' => round(max(0, $sub - $desc), 2)
                ];
            }, $ventas);

            jsonResponse(true, $formatted);
            break;

        case 'POST':
            $input = getJsonInput();

            if (empty($input['items']) || !is_array($input['items'])) {
                jsonResponse(false, null, 'El carrito está vacío. Agregue al menos un producto para cobrar.', 400);
            }

            $items = $input['items'];
            $idCliente = !empty($input['id_cliente']) ? (int) $input['id_cliente'] : 1;
            $idMetodoPago = !empty($input['id_metodo_pago']) ? (int) $input['id_metodo_pago'] : 1;
            $descuentoGeneral = max(0, (float) ($input['descuento'] ?? 0));
            $pagaCon = (float) ($input['paga_con'] ?? 0);
            $tipoPagoTxt = trim((string) ($input['tipo_pago'] ?? 'efectivo'));
            $comprobanteTxt = trim((string) ($input['comprobante'] ?? 'Ticket'));

            // Validar que el cliente exista en la base de datos
            $stmtCli = $pdo->prepare('SELECT Id_Clientes, Nombre_Clientes, Rfc FROM dbo.Clientes WHERE Id_Clientes = ?');
            $stmtCli->execute([$idCliente]);
            $clienteRow = $stmtCli->fetch();
            if (!$clienteRow) {
                // Si el ID 1 no existe, tomar el primer cliente activo
                $stmtFirstCli = $pdo->query('SELECT TOP 1 Id_Clientes, Nombre_Clientes, Rfc FROM dbo.Clientes ORDER BY Id_Clientes ASC');
                $clienteRow = $stmtFirstCli->fetch();
                if ($clienteRow) {
                    $idCliente = (int) $clienteRow['Id_Clientes'];
                } else {
                    jsonResponse(false, null, 'No hay clientes registrados en el catálogo.', 400);
                }
            }

            // Validar existencia de cada producto en la lista y calcular total acumulado
            $validatedItems = [];
            $subtotalVenta = 0;

            foreach ($items as $idx => $it) {
                $idProd = (int) ($it['id_producto'] ?? 0);
                $cant = (float) ($it['cantidad'] ?? 0);
                $precio = (float) ($it['precio'] ?? 0);
                $descItem = max(0, (float) ($it['descuento'] ?? 0));

                if ($idProd <= 0 || $cant <= 0) {
                    jsonResponse(false, null, "La partida #" . ($idx + 1) . " contiene datos de producto o cantidad inválidos.", 400);
                }

                // Consultar producto y existencia actual
                $stmtP = $pdo->prepare('
                    SELECT 
                        p.Id_Producto, 
                        p.Codigo_SKU, 
                        p.Nombre_Producto, 
                        p.Precio_Venta, 
                        p.Stock,
                        ISNULL(i.Existencia, p.Stock) AS existencia
                    FROM dbo.Productos p
                    LEFT JOIN dbo.Inventario i ON p.Id_Producto = i.Id_Producto
                    WHERE p.Id_Producto = ?
                ');
                $stmtP->execute([$idProd]);
                $prod = $stmtP->fetch();

                if (!$prod) {
                    jsonResponse(false, null, "El producto con ID {$idProd} no existe en el catálogo.", 404);
                }

                $existencia = (int) $prod['existencia'];
                if ($existencia < $cant) {
                    jsonResponse(false, null, "Stock insuficiente para \"{$prod['Nombre_Producto']}\". Existencia disponible: {$existencia}, solicitada: {$cant}.", 400);
                }

                // Usar precio enviado o precio de catálogo si no se definió
                $precioFinal = ($precio > 0) ? $precio : (float) $prod['Precio_Venta'];
                $itemSubtotal = ($precioFinal * $cant) - $descItem;
                $subtotalVenta += $itemSubtotal;

                $validatedItems[] = [
                    'id_producto' => $idProd,
                    'sku' => $prod['Codigo_SKU'],
                    'nombre' => $prod['Nombre_Producto'],
                    'precio' => $precioFinal,
                    'cantidad' => $cant,
                    'descuento' => $descItem,
                    'subtotal' => $itemSubtotal
                ];
            }

            $totalVenta = max(0, $subtotalVenta - $descuentoGeneral);

            // Validar importe recibido en efectivo
            $cambio = 0;
            if ($pagaCon > 0 && $pagaCon >= $totalVenta) {
                $cambio = round($pagaCon - $totalVenta, 2);
            } elseif ($pagaCon > 0 && $pagaCon < $totalVenta && $idMetodoPago === 1) {
                jsonResponse(false, null, "El importe con el que paga ($" . number_format($pagaCon, 2) . ") es menor al total de la venta ($" . number_format($totalVenta, 2) . ").", 400);
            }

            // Iniciar transacción atómica en SQL Server
            $pdo->beginTransaction();

            try {
                // 1. Insertar Venta cabecera
                $insVenta = $pdo->prepare('
                    INSERT INTO dbo.Ventas (Id_Cliente, Fecha_Venta, Id_Metodo_Pago)
                    VALUES (?, GETDATE(), ?)
                ');
                $insVenta->execute([$idCliente, $idMetodoPago]);
                $idVenta = (int) $pdo->lastInsertId();

                // 2. Insertar Detalle de Venta y Descontar Inventario
                $insDetalle = $pdo->prepare('
                    INSERT INTO dbo.Ventas_Detalle (Id_Venta, Id_Producto, Precio_Venta, Descuento_Venta, Cantidad_Producto)
                    VALUES (?, ?, ?, ?, ?)
                ');

                $updInv = $pdo->prepare('
                    UPDATE dbo.Inventario 
                    SET Existencia = Existencia - ? 
                    WHERE Id_Producto = ?
                ');

                $updProd = $pdo->prepare('
                    UPDATE dbo.Productos 
                    SET Stock = Stock - ? 
                    WHERE Id_Producto = ?
                ');

                foreach ($validatedItems as $item) {
                    $insDetalle->execute([
                        $idVenta,
                        $item['id_producto'],
                        $item['precio'],
                        $item['descuento'],
                        $item['cantidad']
                    ]);

                    // Descontar existencias en ambas tablas de control
                    $updInv->execute([(int)$item['cantidad'], $item['id_producto']]);
                    $updProd->execute([(int)$item['cantidad'], $item['id_producto']]);
                }

                // 3. Registrar en Bitácora si existe usuario logueado
                if (!empty($currentUser['id'])) {
                    try {
                        $insBit = $pdo->prepare('
                            INSERT INTO dbo.Bitacora (Id_Usuario, Accion, Fecha)
                            VALUES (?, ?, GETDATE())
                        ');
                        $accion = "Venta cobrada Folio #V-" . str_pad((string)$idVenta, 6, '0', STR_PAD_LEFT) . " por $" . number_format($totalVenta, 2);
                        $insBit->execute([$currentUser['id'], $accion]);
                    } catch (\Throwable $e) {
                        // Ignorar si la tabla Bitácora tiene alguna restricción
                    }
                }

                $pdo->commit();

                // Obtener nombre del método de pago
                $stmtMp = $pdo->prepare('SELECT Descripcion_Metodo FROM dbo.Metodo_Pago WHERE Id_Metodo_Pago = ?');
                $stmtMp->execute([$idMetodoPago]);
                $mpName = $stmtMp->fetchColumn() ?: 'Efectivo';

                $folio = 'V-' . str_pad((string)$idVenta, 6, '0', STR_PAD_LEFT);

                $recibo = [
                    'id_venta' => $idVenta,
                    'folio' => $folio,
                    'fecha' => date('d/m/Y H:i:s'),
                    'cajero' => $currentUser['nombre'] ?? ($currentUser['username'] ?? 'Caja Central'),
                    'cliente' => $clienteRow['Nombre_Clientes'],
                    'cliente_rfc' => $clienteRow['Rfc'] ?: 'XAXX010101000',
                    'id_metodo_pago' => $idMetodoPago,
                    'metodo_pago' => $mpName,
                    'tipo_pago' => $tipoPagoTxt,
                    'comprobante' => $comprobanteTxt,
                    'items' => $validatedItems,
                    'subtotal' => round($subtotalVenta, 2),
                    'descuento' => round($descuentoGeneral, 2),
                    'total' => round($totalVenta, 2),
                    'paga_con' => round($pagaCon, 2),
                    'cambio' => $cambio
                ];

                jsonResponse(true, $recibo, "¡Venta {$folio} cobrada exitosamente!", 201);

            } catch (\Throwable $trxErr) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $trxErr;
            }
            break;

        default:
            jsonResponse(false, null, 'Método no permitido. Use GET o POST.', 405);
    }
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, null, 'Error en base de datos: ' . $e->getMessage(), 500);
} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, null, 'Error inesperado: ' . $e->getMessage(), 500);
}
