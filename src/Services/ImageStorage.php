<?php
declare(strict_types=1);

namespace App\Services;

use App\Config\Env;
use App\Core\ValidationException;

final class ImageStorage
{
    private const MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public function saveUpload(array $upload, string $id, string $kind): string
    {
        if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($upload['tmp_name'] ?? ''))) {
            throw new ValidationException(['image' => 'Choose an image to upload.']);
        }
        $limit = max(1, (int) Env::get('UPLOAD_MAX_BYTES', '5242880'));
        if (($upload['size'] ?? 0) > $limit || ($upload['size'] ?? 0) < 1) {
            throw new ValidationException(['image' => 'Image must be smaller than ' . round($limit / 1048576, 1) . ' MB.']);
        }
        $path = (string) $upload['tmp_name'];
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: '';
        $size = @getimagesize($path);
        if (!isset(self::MIME[$mime]) || !$size || ($size[0] ?? 0) > 5000 || ($size[1] ?? 0) > 5000) {
            throw new ValidationException(['image' => 'Use a JPG, PNG or WebP image up to 5000 × 5000 pixels.']);
        }
        $directory = $this->root() . '/' . $id;
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new \RuntimeException('Could not create image storage.');
        }
        $name = $kind . '-' . bin2hex(random_bytes(12)) . '.' . self::MIME[$mime];
        if (!move_uploaded_file($path, $directory . '/' . $name)) {
            throw new \RuntimeException('Could not save the uploaded image.');
        }
        return $id . '/' . $name;
    }

    public function saveDataUri(string $value, string $id, string $kind): string
    {
        if (!preg_match('#^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$#', $value, $matches)) {
            throw new ValidationException([$kind . 'Image' => 'Use a JPG, PNG or WebP image.']);
        }
        $bytes = base64_decode($matches[2], true);
        $limit = max(1, (int) Env::get('UPLOAD_MAX_BYTES', '5242880'));
        $size = $bytes === false ? false : @getimagesizefromstring($bytes);
        if ($bytes === false || strlen($bytes) > $limit || !$size || $size['mime'] !== $matches[1] ||
            ($size[0] ?? 0) > 5000 || ($size[1] ?? 0) > 5000) {
            throw new ValidationException([$kind . 'Image' => 'Invalid or oversized image.']);
        }
        $directory = $this->root() . '/' . $id;
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new \RuntimeException('Could not create image storage.');
        }
        $name = $kind . '-' . bin2hex(random_bytes(12)) . '.' . self::MIME[$matches[1]];
        if (file_put_contents($directory . '/' . $name, $bytes, LOCK_EX) === false) {
            throw new \RuntimeException('Could not save image.');
        }
        return $id . '/' . $name;
    }

    public function serve(string $relative): never
    {
        $path = $this->path($relative);
        if ($path === null || !is_file($path)) {
            \App\Core\Response::text('Image not found.', 404);
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';
        if (!isset(self::MIME[$mime])) {
            \App\Core\Response::text('Image unavailable.', 404);
        }
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    }

    public function remove(?string $relative): void
    {
        if (!$relative) return;
        $path = $this->path($relative);
        if ($path && is_file($path)) @unlink($path);
    }

    private function path(string $relative): ?string
    {
        if (!preg_match('#^[A-Za-z0-9_-]{1,100}/(?:profile|background)-[a-f0-9]{24}\.(?:jpg|png|webp)$#', $relative)) {
            return null;
        }
        return $this->root() . '/' . $relative;
    }

    private function root(): string
    {
        return dirname(__DIR__, 2) . '/storage/uploads';
    }
}
