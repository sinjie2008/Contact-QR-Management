<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Csrf;
use App\Core\Request;
use App\Core\Response;
use App\Core\ValidationException;
use App\Core\View;
use App\Repositories\UserRepository;
use PDOException;

final class UserController
{
    public function page(): void
    {
        Auth::requireAdmin();
        View::render('users', [
            'title' => 'Users',
            'user' => Auth::user(),
            'users' => (new UserRepository())->all(),
            'csrfToken' => Csrf::token(),
        ]);
    }

    public function index(): void
    {
        Auth::requireAdmin(true);
        Response::json(['data' => array_map(static fn(array $u): array => [
            'id' => (int) $u['id'],
            'username' => $u['username'],
            'role' => $u['role'],
            'isActive' => (bool) $u['is_active'],
        ], (new UserRepository())->all())]);
    }

    public function create(Request $request, bool $api = true): void
    {
        Auth::requireAdmin($api);
        Csrf::guard($request, $api);
        $input = $api ? $request->json() : $request->form;
        $username = trim((string) ($input['username'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        $role = (string) ($input['role'] ?? 'user');
        $errors = [];
        if (!preg_match('/^[A-Za-z0-9_.-]{3,64}$/', $username)) {
            $errors['username'] = 'Use 3–64 letters, numbers, dots, underscores or hyphens.';
        }
        if (strlen($password) < 12) {
            $errors['password'] = 'Use at least 12 characters.';
        }
        if (!in_array($role, ['admin', 'user'], true)) {
            $errors['role'] = 'Choose admin or user.';
        }
        if ($errors) {
            if ($api) throw new ValidationException($errors);
            Response::text(implode(' ', $errors), 422);
        }
        try {
            $id = (new UserRepository())->create($username, $password, $role);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                if ($api) throw new ValidationException(['username' => 'This username already exists.']);
                Response::text('This username already exists.', 422);
            }
            throw $e;
        }
        if (!$api) Response::redirect('/users');
        Response::json(['data' => ['id' => $id, 'username' => $username, 'role' => $role, 'isActive' => true]], 201);
    }

    public function update(Request $request, string $id): void
    {
        $actor = Auth::requireAdmin(true);
        Csrf::guard($request);
        $repository = new UserRepository();
        $user = $repository->find((int) $id);
        if (!$user) Response::json(['error' => 'User not found.'], 404);
        $input = $request->json();
        if (array_key_exists('password', $input)) {
            if (!is_string($input['password']) || strlen($input['password']) < 12) {
                throw new ValidationException(['password' => 'Use at least 12 characters.']);
            }
            $repository->changePassword((int) $id, $input['password']);
        }
        if (array_key_exists('isActive', $input)) {
            if (!is_bool($input['isActive'])) {
                throw new ValidationException(['isActive' => 'Use true or false.']);
            }
            if ((int) $actor['id'] === (int) $id && !$input['isActive']) {
                throw new ValidationException(['isActive' => 'You cannot disable your own account.']);
            }
            $repository->setActive((int) $id, (bool) $input['isActive']);
        }
        Response::json(['data' => Auth::safeUser($repository->find((int) $id))]);
    }
}
