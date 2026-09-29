<main class="auth-page">
  <section class="auth-card" aria-labelledby="login-title">
    <div class="brand-mark" aria-hidden="true">CQ</div>
    <h1 id="login-title">Sign in</h1>
    <p>Contact QR Management</p>
    <?php if (!empty($error)): ?><div class="notice error" role="alert"><?= e($error) ?></div><?php endif; ?>
    <form action="/login" method="post">
      <input type="hidden" name="_csrf" value="<?= e($csrfToken) ?>">
      <div class="field"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required autofocus></div>
      <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <button class="button primary" type="submit">Sign in</button>
    </form>
  </section>
</main>
