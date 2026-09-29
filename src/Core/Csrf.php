<?php
declare(strict_types=1);

namespace App\Core;

final class Csrf
{
    public static function token(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function guard(Request $request, bool $api = true): void
    {
        if (hash_equals(self::token(), $request->csrfToken())) {
            return;
        }
        if ($api) {
            Response::json(['error' => 'Your session expired. Refresh the page and try again.'], 419);
        }
        Response::text('Your session expired. Refresh the page and try again.', 419);
    }
}
