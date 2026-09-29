<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="csrf-token" content="<?= e($csrfToken ?? '') ?>">
  <meta name="app-url" content="<?= e($appUrl ?? \App\Services\ContactService::baseUrl()) ?>">
  <title><?= e($title ?? 'Contact QR Management') ?> · Contact QR Management</title>
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
<?php if (!empty($user)): ?>
  <nav class="site-nav" aria-label="Main">
    <a href="/">Contacts</a>
    <?php if ($user['role'] === 'admin'): ?><a href="/users">Users</a><?php endif; ?>
    <span class="site-nav-user"><?= e($user['username']) ?></span>
    <form method="post" action="/logout">
      <input type="hidden" name="_csrf" value="<?= e($csrfToken ?? '') ?>">
      <button type="submit" class="button small">Sign out</button>
    </form>
  </nav>
<?php endif; ?>
<?= $content ?>
</body>
</html>
