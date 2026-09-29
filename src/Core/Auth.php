<?php
declare(strict_types=1);

namespace App\Core;

use App\Repositories\UserRepository;

final class Auth
{
    private static ?array $cachedUser = null;
    private static bool $loaded = false;

    public static function user(): ?array
    {
        if (!self::$loaded) {
            self::$loaded = true;
            $id = (int) ($_SESSION['user_id'] ?? 0);
            $user = $id ? (new UserRepository())->find($id) : null;
            self::$cachedUser = $user && (int) $user['is_active'] === 1 ? $user : null;
        }
        return self::$cachedUser;
    }

    public static function login(array $user): void
    {
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        unset($_SESSION['csrf_token']);
        self::$cachedUser = $user;
        self::$loaded = true;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        session_regenerate_id(true);
        self::$cachedUser = null;
        self::$loaded = true;
    }

    public static function requireUser(bool $api = false): array
    {
        $user = self::user();
        if ($user) {
            return $user;
        }
        if ($api) {
            Response::json(['error' => 'Sign in to continue.'], 401);
        }
        Response::redirect('/login');
    }

    public static function requireAdmin(bool $api = false): array
    {
        $user = self::requireUser($api);
        if ($user['role'] === 'admin') {
            return $user;
        }
        if ($api) {
            Response::json(['error' => 'Administrator access required.'], 403);
        }
        Response::text('Administrator access required.', 403);
    }

    public static function safeUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'isActive' => (bool) $user['is_active'],
        ];
    }
}
