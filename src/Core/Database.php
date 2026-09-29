<?php
declare(strict_types=1);

namespace App\Core;

use App\Config\Env;
use PDO;

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection === null) {
            $host = Env::get('DB_HOST', '127.0.0.1');
            $port = (int) Env::get('DB_PORT', '3306');
            $name = Env::get('DB_NAME', 'contact_qr_management');
            foreach ([$host, $name] as $part) {
                if (!preg_match('/^[A-Za-z0-9_.-]+$/', $part)) {
                    throw new \RuntimeException('Invalid database configuration.');
                }
            }
            self::$connection = new PDO(
                "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
                Env::get('DB_USERNAME'),
                Env::get('DB_PASSWORD'),
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
            self::$connection->exec("SET time_zone = '+00:00'");
        }
        return self::$connection;
    }
}
