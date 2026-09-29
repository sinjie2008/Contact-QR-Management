<?php
declare(strict_types=1);

namespace App\Core;

final class View
{
    public static function render(string $template, array $data = [], int $status = 200): never
    {
        $root = dirname(__DIR__, 2) . '/resources/views';
        $path = $root . '/' . $template . '.php';
        if (!is_file($path)) {
            throw new \RuntimeException('View not found.');
        }
        extract($data, EXTR_SKIP);
        ob_start();
        require $path;
        $content = (string) ob_get_clean();
        http_response_code($status);
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store');
        require $root . '/layout.php';
        exit;
    }
}
