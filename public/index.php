<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';

use App\Controllers\AuthController;
use App\Controllers\ContactController;
use App\Controllers\ProfileController;
use App\Controllers\StatsController;
use App\Controllers\UserController;
use App\Core\Auth;
use App\Core\Csrf;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Core\ValidationException;
use App\Core\View;
use App\Services\ContactService;

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");

$router = new Router();
$auth = new AuthController();
$users = new UserController();
$contacts = new ContactController();
$profiles = new ProfileController();
$stats = new StatsController();

$router->add('GET', '#^/$#', static function (): void {
    $user = Auth::requireUser();
    View::render('dashboard', [
        'title' => 'Contacts',
        'user' => $user,
        'csrfToken' => Csrf::token(),
        'appUrl' => ContactService::baseUrl(),
    ]);
});
$router->add('GET', '#^/login$#', [$auth, 'form']);
$router->add('POST', '#^/login$#', [$auth, 'login']);
$router->add('POST', '#^/logout$#', [$auth, 'logout']);
$router->add('GET', '#^/users$#', [$users, 'page']);
$router->add('POST', '#^/users$#', static fn(Request $request) => $users->create($request, false));

$router->add('GET', '#^/api/auth/me$#', static function (): void {
    Response::json(['user' => Auth::safeUser(Auth::requireUser(true)), 'csrfToken' => Csrf::token()]);
});
$router->add('GET', '#^/api/users$#', [$users, 'index']);
$router->add('POST', '#^/api/users$#', [$users, 'create']);
$router->add('PATCH', '#^/api/users/([0-9]+)$#', [$users, 'update']);
$router->add('GET', '#^/api/stats$#', [$stats, 'index']);
$router->add('GET', '#^/api/contacts$#', [$contacts, 'index']);
$router->add('POST', '#^/api/contacts$#', [$contacts, 'create']);
$router->add('GET', '#^/api/contacts/export$#', [$contacts, 'export']);
$router->add('POST', '#^/api/contacts/import$#', [$contacts, 'import']);
$router->add('GET', '#^/api/contacts/([A-Za-z0-9_-]{1,100})$#', [$contacts, 'show']);
$router->add('PUT', '#^/api/contacts/([A-Za-z0-9_-]{1,100})$#', [$contacts, 'update']);
$router->add('DELETE', '#^/api/contacts/([A-Za-z0-9_-]{1,100})$#', [$contacts, 'delete']);
$router->add('POST', '#^/api/contacts/([A-Za-z0-9_-]{1,100})/images$#', [$contacts, 'upload']);
$router->add('GET', '#^/api/live-profile$#', [$profiles, 'live']);
$router->add('PUT', '#^/api/live-profile$#', [$profiles, 'saveLive']);
$router->add('GET', '#^/api/profile-image$#', [$profiles, 'image']);
$router->add('GET', '#^/profile/([A-Za-z0-9_-]{1,100})$#', [$profiles, 'page']);
$router->add('GET', '#^/profile/([A-Za-z0-9_-]{1,100})\.vcf$#', [$profiles, 'vcf']);

try {
    $router->dispatch(Request::fromGlobals());
} catch (ValidationException $e) {
    Response::json(['error' => 'Validation failed.', 'errors' => $e->errors], 422);
} catch (\Throwable $e) {
    error_log((string) $e);
    $detail = App\Config\Env::bool('APP_DEBUG') ? $e->getMessage() : 'Server error.';
    Response::json(['error' => $detail], 500);
}
