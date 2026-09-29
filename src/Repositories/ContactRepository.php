<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class ContactRepository
{
    private const COLUMNS = [
        'id', 'first_name', 'last_name', 'phone_number', 'mobile', 'email', 'website',
        'company', 'job_title', 'fax', 'address', 'city', 'post_code', 'country',
        'wechat_id', 'whatsapp_message', 'extra_phones', 'extra_emails',
        'extra_websites', 'extra_addresses', 'profile_image_path',
        'profile_background_path', 'profile_image_url', 'profile_background_url', 'is_active',
    ];

    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connection();
    }

    public function find(string $id): ?array
    {
        $query = $this->db->prepare('SELECT * FROM contacts WHERE id = ?');
        $query->execute([$id]);
        return $query->fetch() ?: null;
    }

    public function page(string $search, string $status, int $page, int $perPage = 20): array
    {
        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = '(first_name LIKE ? OR last_name LIKE ? OR mobile LIKE ? OR email LIKE ? OR company LIKE ? OR country LIKE ?)';
            $term = '%' . $search . '%';
            $params = array_fill(0, 6, $term);
        }
        if (in_array($status, ['active', 'inactive'], true)) {
            $where[] = 'is_active = ?';
            $params[] = $status === 'active' ? 1 : 0;
        }
        $filter = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $count = $this->db->prepare('SELECT COUNT(*) FROM contacts' . $filter);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $query = $this->db->prepare('SELECT * FROM contacts' . $filter . ' ORDER BY last_name, first_name, id LIMIT ? OFFSET ?');
        foreach ($params as $i => $value) {
            $query->bindValue($i + 1, $value);
        }
        $query->bindValue(count($params) + 1, $perPage, PDO::PARAM_INT);
        $query->bindValue(count($params) + 2, ($page - 1) * $perPage, PDO::PARAM_INT);
        $query->execute();
        return ['rows' => $query->fetchAll(), 'total' => $total];
    }

    public function all(): array
    {
        return $this->db->query('SELECT * FROM contacts ORDER BY last_name, first_name, id')->fetchAll();
    }

    public function match(string $email, string $mobile): ?array
    {
        foreach (['email' => $email, 'mobile' => $mobile] as $column => $value) {
            if ($value === '') continue;
            $query = $this->db->prepare("SELECT * FROM contacts WHERE {$column} = ? LIMIT 1");
            $query->execute([$value]);
            if ($row = $query->fetch()) return $row;
        }
        return null;
    }

    public function create(array $row): void
    {
        $columns = implode(', ', self::COLUMNS);
        $markers = implode(', ', array_fill(0, count(self::COLUMNS), '?'));
        $query = $this->db->prepare("INSERT INTO contacts ({$columns}) VALUES ({$markers})");
        $query->execute(array_map(static fn(string $key): mixed => $row[$key], self::COLUMNS));
    }

    public function update(array $row): void
    {
        $columns = array_values(array_filter(self::COLUMNS, static fn(string $key): bool => $key !== 'id'));
        $assignments = implode(', ', array_map(static fn(string $key): string => "{$key} = ?", $columns));
        $query = $this->db->prepare("UPDATE contacts SET {$assignments}, updated_at = UTC_TIMESTAMP(6) WHERE id = ?");
        $query->execute([...array_map(static fn(string $key): mixed => $row[$key], $columns), $row['id']]);
    }

    public function upsert(array $row): void
    {
        if ($this->find($row['id'])) $this->update($row);
        else $this->create($row);
    }

    public function updateImage(string $id, string $kind, string $path): void
    {
        $column = $kind === 'profile' ? 'profile_image_path' : 'profile_background_path';
        $url = $kind === 'profile' ? 'profile_image_url' : 'profile_background_url';
        $query = $this->db->prepare("UPDATE contacts SET {$column} = ?, {$url} = '', updated_at = UTC_TIMESTAMP(6) WHERE id = ?");
        $query->execute([$path, $id]);
    }

    public function delete(string $id): void
    {
        $query = $this->db->prepare('DELETE FROM contacts WHERE id = ?');
        $query->execute([$id]);
    }
}
