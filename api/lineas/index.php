<?php
// ==========================================
// API: LINEAS Y CATEGORIAS DE PRODUCTOS
// GET /api/lineas/ → listar líneas activas con su categoría
// ==========================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/http.php';

// Requiere autenticación
requireAuth();

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $pdo->query('
            SELECT 
                l.Id_Linea AS id,
                l.Nombre_Linea AS nombre,
                l.Id_Categoria AS id_categoria,
                c.Nombre_Categoria AS categoria,
                c.Porcentaje_Ganancia AS ganancia
            FROM dbo.Lineas l
            INNER JOIN dbo.Categoria c ON l.Id_Categoria = c.Id_Categoria
            ORDER BY c.Nombre_Categoria, l.Nombre_Linea
        ');
        $lineas = $stmt->fetchAll();
        jsonResponse(true, $lineas, 'Líneas obtenidas correctamente', 200, count($lineas));
    } else {
        jsonResponse(false, null, 'Método HTTP no permitido', 405);
    }
} catch (PDOException $e) {
    handleDbException($e, 'Error al consultar catálogo de líneas');
} catch (Throwable $e) {
    jsonResponse(false, null, $e->getMessage(), 500);
}
