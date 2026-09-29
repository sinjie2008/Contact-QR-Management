<?php
declare(strict_types=1);

namespace App\Core;

final class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [$method, $pattern, $handler];
    }

    public function dispatch(Request $request): void
    {
        $path = rawurldecode($request->path);
        foreach ($this->routes as [$method, $pattern, $handler]) {
            if ($method !== $request->method || !preg_match($pattern, $path, $matches)) {
                continue;
            }
            array_shift($matches);
            $handler($request, ...$matches);
            return;
        }
        if (str_starts_with($path, '/api/')) {
            Response::json(['error' => 'Route not found.'], 404);
        }
        Response::text('Page not found.', 404);
    }
}
