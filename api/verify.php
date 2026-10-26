<?php
/**
 * FAKE verification endpoint.
 *
 * This is NOT real security. The answers are hard-coded on purpose,
 * and nothing is stored on the server. It only exists so the frontend
 * has a PHP backend to talk to.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Use POST']);
    exit;
}

// Hard-coded correct option index for each round (0 = first option).
$ANSWERS = [3, 0, 2];

$input  = json_decode(file_get_contents('php://input'), true);
$input  = is_array($input) ? $input : [];
$action = $input['action'] ?? '';

if ($action === 'check') {
    $round  = isset($input['round'])  ? (int) $input['round']  : -1;
    $choice = isset($input['choice']) ? (int) $input['choice'] : -1;

    if (!isset($ANSWERS[$round])) {
        http_response_code(400);
        echo json_encode(['error' => 'Unknown round']);
        exit;
    }

    echo json_encode(['correct' => $ANSWERS[$round] === $choice]);
    exit;
}

if ($action === 'pass') {
    // Keep letters, numbers, spaces, "_" and "-" only; max 16 characters.
    $nick = preg_replace('/[^\p{L}\p{N} _-]/u', '', (string) ($input['nick'] ?? 'Player'));
    $nick = mb_substr(trim($nick), 0, 16);
    if ($nick === '') {
        $nick = 'Player';
    }

    echo json_encode([
        'verified' => true,
        'nick'     => $nick,
        'token'    => 'fake-' . bin2hex(random_bytes(6)),
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Unknown action']);
