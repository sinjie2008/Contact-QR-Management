<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Csrf;
use App\Core\Request;
use App\Core\Response;
use App\Core\ValidationException;
use App\Core\View;
use App\Repositories\ContactRepository;
use App\Services\ContactService;
use App\Services\ImageStorage;
use App\Services\VCardService;

final class ProfileController
{
    public function live(Request $request): void
    {
        $id = (string) ($request->query['id'] ?? '');
        if (!ContactService::validId($id)) Response::json(['error' => 'Invalid profile ID.'], 400);
        $row = (new ContactRepository())->find($id);
        if (!$row) Response::json(['error' => 'Profile not found.'], 404);
        Response::json(['profile' => ContactService::present($row), 'updatedAt' => $row['updated_at']]);
    }

    public function saveLive(Request $request): void
    {
        Auth::requireUser(true);
        Csrf::guard($request);
        $id = (string) ($request->query['id'] ?? '');
        if (!ContactService::validId($id)) Response::json(['error' => 'Invalid profile ID.'], 400);
        $input = $request->json();
        $profile = $input['profile'] ?? null;
        if (!is_array($profile) || array_is_list($profile)) {
            throw new ValidationException(['profile' => 'Profile data is required.']);
        }
        $repository = new ContactRepository();
        $previous = $repository->find($id);
        $profile['id'] = $id;
        $images = [];
        foreach (['profile' => 'profileImage', 'background' => 'profileBackground'] as $kind => $field) {
            $source = $input[$field] ?? $profile[$field] ?? '';
            if (is_string($source) && str_starts_with($source, 'data:image/')) {
                $images[$kind] = $source;
                unset($profile[$field]);
            } elseif (isset($profile[$field]) && is_string($profile[$field]) &&
                str_contains($profile[$field], '/api/profile-image?')) {
                unset($profile[$field]);
            }
        }
        $row = ContactService::normalize($profile, $previous);
        $repository->upsert($row);
        $storage = new ImageStorage();
        foreach ($images as $kind => $data) {
            $path = $storage->saveDataUri($data, $id, $kind);
            try {
                $repository->updateImage($id, $kind, $path);
            } catch (\Throwable $e) {
                $storage->remove($path);
                throw $e;
            }
            if ($previous) $storage->remove($previous[$kind === 'profile' ? 'profile_image_path' : 'profile_background_path']);
        }
        Response::json(['ok' => true, 'id' => $id, 'updatedAt' => $repository->find($id)['updated_at']]);
    }

    public function image(Request $request): void
    {
        $id = (string) ($request->query['id'] ?? '');
        $kind = (string) ($request->query['kind'] ?? '');
        if (!ContactService::validId($id) || !in_array($kind, ['profile', 'background'], true)) {
            Response::json(['error' => 'Invalid image request.'], 400);
        }
        $row = (new ContactRepository())->find($id);
        if (!$row) Response::text('Image not found.', 404);
        $prefix = $kind === 'profile' ? 'profile_image' : 'profile_background';
        if ($row[$prefix . '_path']) (new ImageStorage())->serve($row[$prefix . '_path']);
        if ($row[$prefix . '_url']) {
            header('Cache-Control: no-store');
            Response::redirect($row[$prefix . '_url'], 302);
        }
        Response::text('Image not found.', 404);
    }

    public function page(Request $request, string $id): void
    {
        $row = (new ContactRepository())->find($id);
        if (!$row) Response::text('Profile not found.', 404);
        View::render('profile', ['title' => $row['first_name'] . ' ' . $row['last_name'], 'profile' => ContactService::present($row)]);
    }

    public function vcf(Request $request, string $id): void
    {
        $row = (new ContactRepository())->find($id);
        if (!$row) Response::text('Profile not found.', 404);
        $profile = ContactService::present($row);
        $name = preg_replace('/[^A-Za-z0-9_-]+/', '-', $profile['name']) ?: 'contact';
        header('Content-Type: text/vcard; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $name . '.vcf"');
        header('Cache-Control: no-store');
        echo (new VCardService())->build($profile);
        exit;
    }
}
