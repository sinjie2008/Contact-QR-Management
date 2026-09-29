<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit(1);
}

require dirname(__DIR__) . '/src/bootstrap.php';

use App\Config\Env;
use App\Repositories\ContactRepository;
use App\Repositories\UserRepository;
use App\Services\ContactService;

$username = Env::get('ADMIN_USERNAME');
$password = Env::get('ADMIN_PASSWORD');
if (!preg_match('/^[A-Za-z0-9_.-]{3,64}$/', $username) || strlen($password) < 12) {
    fwrite(STDERR, "Set ADMIN_USERNAME and a unique ADMIN_PASSWORD of at least 12 characters in .env first.\n");
    exit(1);
}
$users = new UserRepository();
$existing = $users->byUsername($username);
if (!$existing) {
    $users->create($username, $password, 'admin');
    echo "Created administrator {$username}.\n";
} elseif ($existing['role'] !== 'admin') {
    fwrite(STDERR, "The configured username belongs to a non-admin account.\n");
    exit(1);
} else {
    echo "Administrator {$username} already exists; password was not changed.\n";
}

if (in_array('--demo', $argv, true)) {
    $data = json_decode(file_get_contents(dirname(__DIR__) . '/database/seeders/demo_profiles.json'), true, 512, JSON_THROW_ON_ERROR);
    $contacts = new ContactRepository();
    $created = 0;
    foreach ($data as $id => $profile) {
        if ($contacts->find((string) $id)) continue;
        $profile['id'] = (string) $id;
        $profile['phoneNumber'] = $profile['phoneNumber'] ?? $profile['phone'] ?? '';
        $contacts->create(ContactService::normalize($profile));
        $created++;
    }
    echo "Created {$created} demo contacts.\n";
}
