<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Response;
use App\Repositories\ContactRepository;

final class StatsController
{
    public function index(): void
    {
        Auth::requireUser(true);
        $rows = (new ContactRepository())->all();
        $countries = $companies = [];
        $images = ['both' => 0, 'one' => 0, 'neither' => 0];
        $active = 0;
        foreach ($rows as $row) {
            $active += (int) $row['is_active'];
            $country = trim($row['country']) ?: 'Unspecified';
            $company = trim($row['company']) ?: 'Unspecified';
            $countries[$country] = ($countries[$country] ?? 0) + 1;
            $companies[$company] = ($companies[$company] ?? 0) + 1;
            $count = (int) (bool) ($row['profile_image_path'] ?: $row['profile_image_url']) +
                (int) (bool) ($row['profile_background_path'] ?: $row['profile_background_url']);
            $images[$count === 2 ? 'both' : ($count === 1 ? 'one' : 'neither')]++;
        }
        Response::json([
            'total' => count($rows),
            'active' => $active,
            'inactive' => count($rows) - $active,
            'countries' => $this->categories($countries),
            'companies' => $this->categories($companies),
            'images' => $images,
        ]);
    }

    private function categories(array $counts): array
    {
        arsort($counts);
        return array_map(
            static fn(string $label, int $count): array => ['label' => $label, 'count' => $count],
            array_keys($counts),
            array_values($counts)
        );
    }
}
