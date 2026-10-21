<?php
// ==========================================
// Conexión PDO a SQL Server — Refaccionaria Central
// La BD vive en una máquina virtual: apuntar DB_HOST a su IP
// ==========================================

define('DB_HOST', ''); // IP de la VM, ej. 192.168.1.50
define('DB_PORT', '1433');
define('DB_NAME', ''); // Nombre BD
define('DB_USER', 'sa');          // o un login SQL dedicado
define('DB_PASS', '');            // contraseña del login SQL

function getDbConnection(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'sqlsrv:Server=' . DB_HOST . ',' . DB_PORT
             . ';Database=' . DB_NAME
             . ';Encrypt=no'
             . ';TrustServerCertificate=yes';

        $options = [
            PDO::ATTR_ERRMODE             => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,
            PDO::SQLSRV_ATTR_ENCODING     => PDO::SQLSRV_ENCODING_UTF8,
            PDO::SQLSRV_ATTR_FETCHES_NUMERIC_TYPE => true,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'message' => 'Error de conexión a la base de datos',
            ]);
            exit;
        }
    }

    return $pdo;
}
