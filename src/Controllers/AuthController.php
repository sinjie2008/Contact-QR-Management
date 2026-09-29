<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Csrf;
use App\Core\Request;
use App\Core\Response;
use App\Core\View;
use App\Repositories\UserRepository;

final class AuthController
{
    public function form(): void
    {
        if (Auth::user()) {
            Response::redirect('/');
        }
        View::render('login', ['title' => 'Sign in', 'csrfToken' => Csrf::token()]);
    }

    public function login(Request $request): void
    {
        Csrf::guard($request, false);
        $attempts = (int) ($_SESSION['login_attempts'] ?? 0);
        $until = (int) ($_SESSION['login_until'] ?? 0);
        if ($attempts >= 5 && time() < $until) {
            $this->failed('Too many attempts. Try again shortly.', 429);
        }
        $username = trim((string) ($request->form['username'] ?? ''));
        $password = (string) ($request->form['password'] ?? '');
        $user = (new UserRepository())->byUsername($username);
        if (!$user || (int) $user['is_active'] !== 1 || !password_verify($password, $user['password_hash'])) {
            $_SESSION['login_attempts'] = $attempts + 1;
            $_SESSION['login_until'] = time() + 60;
            $this->failed('Invalid username or password.', 401);
        }
        unset($_SESSION['login_attempts'], $_SESSION['login_until']);
        Auth::login($user);
        Response::redirect('/');
    }

    public function logout(Request $request): void
    {
        Csrf::guard($request, false);
        Auth::logout();
        Response::redirect('/login');
    }

    private function failed(string $message, int $status): void
    {
        View::render('login', ['title' => 'Sign in', 'csrfToken' => Csrf::token(), 'error' => $message], $status);
    }
}
