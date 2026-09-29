<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class UserRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connection();
    }

    public function find(int $id): ?array
    {
        $query = $this->db->prepare('SELECT * FROM users WHERE id = ?');
        $query->execute([$id]);
        return $query->fetch() ?: null;
    }

    public function byUsername(string $username): ?array
    {
        $query = $this->db->prepare('SELECT * FROM users WHERE username = ?');
        $query->execute([$username]);
        return $query->fetch() ?: null;
    }

    public function all(): array
    {
        return $this->db->query('SELECT id, username, role, is_active, created_at FROM users ORDER BY id ASC')->fetchAll();
    }

    public function create(string $username, string $password, string $role = 'user'): int
    {
        $query = $this->db->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
        $query->execute([$username, password_hash($password, PASSWORD_DEFAULT), $role]);
        return (int) $this->db->lastInsertId();
    }

    public function changePassword(int $id, string $password): void
    {
        $query = $this->db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $query->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
    }

    public function setActive(int $id, bool $active): void
    {
        $query = $this->db->prepare('UPDATE users SET is_active = ? WHERE id = ?');
        $query->execute([(int) $active, $id]);
    }
}
