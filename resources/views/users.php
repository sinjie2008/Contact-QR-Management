<main class="settings-page">
  <header><h1>Users</h1><p>Administrators can add people who can manage contacts.</p></header>
  <section class="settings-card">
    <h2>Add user</h2>
    <form action="/users" method="post" class="settings-form">
      <input type="hidden" name="_csrf" value="<?= e($csrfToken) ?>">
      <div class="field"><label for="new-username">Username</label><input id="new-username" name="username" required minlength="3" maxlength="64" autocomplete="off"></div>
      <div class="field"><label for="new-password">Password (12+ characters)</label><input id="new-password" name="password" type="password" required minlength="12" autocomplete="new-password"></div>
      <div class="field"><label for="new-role">Role</label><select id="new-role" name="role"><option value="user">User</option><option value="admin">Administrator</option></select></div>
      <button class="button primary" type="submit">Add user</button>
    </form>
  </section>
  <section class="settings-card">
    <h2>Existing users</h2>
    <table class="settings-table"><thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Added</th></tr></thead><tbody>
    <?php foreach ($users as $entry): ?>
      <tr><td><?= e($entry['username']) ?></td><td><?= e(ucfirst($entry['role'])) ?></td><td><?= $entry['is_active'] ? 'Active' : 'Disabled' ?></td><td><?= e($entry['created_at']) ?> UTC</td></tr>
    <?php endforeach; ?>
    </tbody></table>
  </section>
</main>
