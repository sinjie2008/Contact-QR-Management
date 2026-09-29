<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Csrf;
use App\Core\Request;
use App\Core\Response;
use App\Core\ValidationException;
use App\Repositories\ContactRepository;
use App\Services\ContactService;
use App\Services\CsvService;
use App\Services\ImageStorage;
use PDOException;

final class ContactController
{
    public function index(Request $request): void
    {
        Auth::requireUser(true);
        $page = max(1, min(100000, (int) ($request->query['page'] ?? 1)));
        $perPage = (int) ($request->query['perPage'] ?? 20);
        if (!in_array($perPage, [10, 20, 25, 50], true)) $perPage = 20;
        $search = substr(trim((string) ($request->query['search'] ?? '')), 0, 100);
        $status = (string) ($request->query['status'] ?? '');
        $result = (new ContactRepository())->page($search, $status, $page, $perPage);
        Response::json([
            'data' => array_map([ContactService::class, 'present'], $result['rows']),
            'total' => $result['total'],
            'page' => $page,
            'perPage' => $perPage,
        ]);
    }

    public function show(Request $request, string $id): void
    {
        Auth::requireUser(true);
        $row = (new ContactRepository())->find($id);
        if (!$row) Response::json(['error' => 'Contact not found.'], 404);
        Response::json(['data' => ContactService::present($row)]);
    }

    public function create(Request $request): void
    {
        Auth::requireUser(true);
        Csrf::guard($request);
        $row = ContactService::normalize($request->json());
        $repository = new ContactRepository();
        try {
            $repository->create($row);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') throw new ValidationException(['id' => 'This contact ID already exists.']);
            throw $e;
        }
        Response::json(['data' => ContactService::present($repository->find($row['id']))], 201);
    }

    public function update(Request $request, string $id): void
    {
        Auth::requireUser(true);
        Csrf::guard($request);
        $repository = new ContactRepository();
        $existing = $repository->find($id);
        if (!$existing) Response::json(['error' => 'Contact not found.'], 404);
        $input = $request->json();
        $input['id'] = $id;
        $repository->update(ContactService::normalize($input, $existing));
        Response::json(['data' => ContactService::present($repository->find($id))]);
    }

    public function delete(Request $request, string $id): void
    {
        Auth::requireUser(true);
        Csrf::guard($request);
        $repository = new ContactRepository();
        $row = $repository->find($id);
        if (!$row) Response::json(['error' => 'Contact not found.'], 404);
        $repository->delete($id);
        $images = new ImageStorage();
        $images->remove($row['profile_image_path']);
        $images->remove($row['profile_background_path']);
        Response::json(['ok' => true]);
    }

    public function upload(Request $request, string $id): void
    {
        Auth::requireUser(true);
        Csrf::guard($request);
        $repository = new ContactRepository();
        $row = $repository->find($id);
        if (!$row) Response::json(['error' => 'Contact not found.'], 404);
        $kind = (string) ($request->form['kind'] ?? '');
        if (!in_array($kind, ['profile', 'background'], true)) {
            throw new ValidationException(['kind' => 'Choose profile or background.']);
        }
        $images = new ImageStorage();
        $path = $images->saveUpload($request->files['image'] ?? [], $id, $kind);
        try {
            $repository->updateImage($id, $kind, $path);
        } catch (\Throwable $e) {
            $images->remove($path);
            throw $e;
        }
        $images->remove($row[$kind === 'profile' ? 'profile_image_path' : 'profile_background_path']);
        Response::json(['data' => ContactService::present($repository->find($id))]);
    }

    public function import(Request $request): void
    {
        Auth::requireUser(true);
        Csrf::guard($request);
        $result = (new CsvService())->import($request->files['file'] ?? []);
        Response::json($result);
    }

    public function export(): void
    {
        Auth::requireUser();
        (new CsvService())->export((new ContactRepository())->all());
    }
}
