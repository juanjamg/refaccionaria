<?php
// ==========================================
// Helpers compartidos de la API (JSON, input)
// ==========================================

function jsonResponse(bool $success, $data = null, string $message = '', int $code = 200, ?int $total = null): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');

    $response = ['success' => $success, 'data' => $data, 'message' => $message];
    if ($total !== null) {
        $response['total'] = $total;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput(): array
{
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);

    if (!is_array($input)) {
        jsonResponse(false, null, 'Cuerpo de la petición inválido (se esperaba JSON)', 400);
    }

    return $input;
}

function requireFields(array $input, array $fields): void
{
    foreach ($fields as $field) {
        if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
            jsonResponse(false, null, "El campo '$field' es obligatorio", 400);
        }
    }
}

function getIdParam(): int
{
    $val = $_GET['id'] ?? null;
    $id = filter_var($val, FILTER_VALIDATE_INT);
    if ($id === false || $id === null || $id <= 0) {
        jsonResponse(false, null, 'Falta el parámetro id (o es inválido)', 400);
    }
    return (int) $id;
}
