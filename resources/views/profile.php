<?php
$profileId = (string) $profile['id'];
$phones = array_values(array_filter([$profile['mobile'], $profile['phoneNumber'], ...$profile['extraPhones']]));
$emails = array_values(array_filter([$profile['email'], ...$profile['extraEmails']]));
$websites = array_values(array_filter([$profile['website'], ...$profile['extraWebsites']]));
?>
<main class="public-profile">
  <article class="profile-card">
    <div class="profile-cover">
      <?php if ($profile['profileBackground']): ?><img src="<?= e($profile['profileBackground']) ?>" alt="Profile background"><?php endif; ?>
    </div>
    <div class="profile-content">
      <div class="profile-avatar">
        <?php if ($profile['profileImage']): ?><img src="<?= e($profile['profileImage']) ?>" alt="<?= e($profile['name']) ?>"><?php else: ?><span><?= e(strtoupper(substr($profile['firstName'], 0, 1) . substr($profile['lastName'], 0, 1))) ?></span><?php endif; ?>
      </div>
      <h1><?= e($profile['name']) ?></h1>
      <?php if ($profile['jobTitle'] || $profile['company']): ?><p class="profile-role"><?= e(trim($profile['jobTitle'] . ' · ' . $profile['company'], ' ·')) ?></p><?php endif; ?>
      <div class="profile-actions">
        <a class="button primary" href="/profile/<?= rawurlencode($profileId) ?>.vcf">Download VCF</a>
        <?php if ($profile['mobile']): ?><a class="button" href="tel:<?= e($profile['mobile']) ?>">Call</a><?php endif; ?>
        <?php if ($profile['email']): ?><a class="button" href="mailto:<?= e($profile['email']) ?>">Email</a><?php endif; ?>
      </div>
      <dl class="profile-details">
        <?php foreach ($phones as $phone): ?><div><dt>Phone</dt><dd><a href="tel:<?= e($phone) ?>"><?= e($phone) ?></a></dd></div><?php endforeach; ?>
        <?php foreach ($emails as $email): ?><div><dt>Email</dt><dd><a href="mailto:<?= e($email) ?>"><?= e($email) ?></a></dd></div><?php endforeach; ?>
        <?php foreach ($websites as $website): ?><div><dt>Website</dt><dd><a href="<?= e($website) ?>" rel="noopener noreferrer" target="_blank"><?= e($website) ?></a></dd></div><?php endforeach; ?>
        <?php if ($profile['address'] || $profile['city'] || $profile['country']): ?><div><dt>Address</dt><dd><?= e(implode(', ', array_filter([$profile['address'], $profile['city'], $profile['postCode'], $profile['country']]))) ?></dd></div><?php endif; ?>
        <?php foreach ($profile['extraAddresses'] as $address): ?><div><dt>Address</dt><dd><?= e(implode(', ', array_filter([$address['address'] ?? '', $address['city'] ?? '', $address['postCode'] ?? '', $address['country'] ?? '']))) ?></dd></div><?php endforeach; ?>
        <?php if ($profile['wechatId']): ?><div><dt>WeChat ID</dt><dd><?= e($profile['wechatId']) ?></dd></div><?php endif; ?>
      </dl>
      <p class="profile-updated">Latest saved profile · <?= e($profile['updatedAt']) ?> UTC</p>
    </div>
  </article>
</main>
