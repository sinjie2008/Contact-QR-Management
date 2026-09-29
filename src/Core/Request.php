<?php
declare(strict_types=1);

namespace App\Core;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $form,
        public readonly array $files
    ) {}

    public static function fromGlobals(): self
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        return new self(strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'), $path, $_GET, $_POST, $_FILES);
    }

    public function json(): array
    {
        try {
            $input = json_decode(file_get_contents('php://input') ?: '', true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ValidationException(['body' => 'Invalid JSON body.']);
        }
        if (!is_array($input) || array_is_list($input)) {
            throw new ValidationException(['body' => 'A JSON object is required.']);
        }
        return $input;
    }

    public function csrfToken(): string
    {
        return (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $this->form['_csrf'] ?? '');
    }
}
