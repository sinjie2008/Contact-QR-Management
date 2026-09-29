<?php
declare(strict_types=1);

namespace App\Services;

use App\Config\Env;
use App\Core\ValidationException;

final class ContactService
{
    private const FIELDS = [
        'firstName' => ['first_name', 120],
        'lastName' => ['last_name', 120],
        'phoneNumber' => ['phone_number', 80],
        'mobile' => ['mobile', 80],
        'email' => ['email', 254],
        'website' => ['website', 2048],
        'company' => ['company', 255],
        'jobTitle' => ['job_title', 255],
        'fax' => ['fax', 80],
        'address' => ['address', 500],
        'city' => ['city', 120],
        'postCode' => ['post_code', 40],
        'country' => ['country', 120],
        'wechatId' => ['wechat_id', 120],
        'whatsappMessage' => ['whatsapp_message', 2000],
    ];

    public static function validId(string $id): bool
    {
        return (bool) preg_match('/^[A-Za-z0-9_-]{1,100}$/', $id);
    }

    public static function normalize(array $input, ?array $existing = null): array
    {
        $id = trim((string) ($input['id'] ?? ''));
        if ($id === '') $id = (string) ($existing['id'] ?? self::newId());
        $errors = [];
        if (!self::validId($id)) $errors['id'] = 'Invalid contact ID.';
        $row = ['id' => $id];
        foreach (self::FIELDS as $api => [$column, $limit]) {
            $value = $input[$api] ?? $existing[$column] ?? '';
            if (!is_string($value) && !is_numeric($value)) {
                $errors[$api] = 'Use text for this field.';
                continue;
            }
            $value = trim((string) $value);
            if (strlen($value) > $limit) $errors[$api] = "Use at most {$limit} bytes.";
            $row[$column] = $value;
        }
        foreach (['firstName' => 'first_name', 'lastName' => 'last_name', 'mobile' => 'mobile'] as $api => $column) {
            if (empty($row[$column])) $errors[$api] = 'Required.';
        }
        if (!empty($row['email']) && !filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }
        if (!empty($row['website']) && !self::httpUrl($row['website'])) {
            $errors['website'] = 'Enter an http or https URL.';
        }
        foreach (['extraPhones' => 'extra_phones', 'extraEmails' => 'extra_emails', 'extraWebsites' => 'extra_websites'] as $api => $column) {
            $value = $input[$api] ?? ($existing ? json_decode($existing[$column] ?: '[]', true) : []);
            if (!is_array($value) || count($value) > 20) {
                $errors[$api] = 'Use a list of up to 20 values.';
                continue;
            }
            $items = [];
            foreach ($value as $item) {
                if (!is_string($item) || strlen($item) > 2048) {
                    $errors[$api] = 'Invalid list value.';
                    break;
                }
                if (trim($item) !== '') $items[] = trim($item);
            }
            if ($api === 'extraWebsites' && array_filter($items, static fn(string $url): bool => !self::httpUrl($url))) {
                $errors[$api] = 'Use http or https URLs.';
            }
            $row[$column] = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }
        $addresses = $input['extraAddresses'] ?? ($existing ? json_decode($existing['extra_addresses'] ?: '[]', true) : []);
        if (!is_array($addresses) || count($addresses) > 20) {
            $errors['extraAddresses'] = 'Use a list of up to 20 addresses.';
            $addresses = [];
        }
        $cleanAddresses = [];
        foreach ($addresses as $address) {
            if (!is_array($address)) {
                $errors['extraAddresses'] = 'Invalid address.';
                continue;
            }
            $clean = [];
            foreach (['address', 'city', 'postCode', 'country'] as $field) {
                $value = $address[$field] ?? '';
                if (!is_string($value) || strlen($value) > 500) $errors['extraAddresses'] = 'Invalid address.';
                $clean[$field] = is_string($value) ? trim(substr($value, 0, 500)) : '';
            }
            $cleanAddresses[] = $clean;
        }
        $row['extra_addresses'] = json_encode($cleanAddresses, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $active = $input['isActive'] ?? $existing['is_active'] ?? true;
        $row['is_active'] = in_array($active, [true, 1, '1', 'true', 'Active'], true) ? 1 : 0;
        foreach (['profile' => 'profile_image', 'background' => 'profile_background'] as $kind => $prefix) {
            $api = $kind === 'profile' ? 'profileImage' : 'profileBackground';
            $url = $input[$api] ?? $existing[$prefix . '_url'] ?? '';
            if (!is_string($url) || strlen($url) > 2048 || ($url !== '' && !self::httpUrl($url))) {
                $errors[$api] = 'Enter an http or https image URL.';
                $url = '';
            }
            $row[$prefix . '_url'] = $url;
            $row[$prefix . '_path'] = $existing[$prefix . '_path'] ?? null;
        }
        if ($errors) throw new ValidationException($errors);
        return $row;
    }

    public static function present(array $row): array
    {
        $result = [
            'id' => $row['id'],
            'name' => trim($row['first_name'] . ' ' . $row['last_name']),
            'isActive' => (bool) $row['is_active'],
            'extraPhones' => json_decode($row['extra_phones'] ?: '[]', true) ?: [],
            'extraEmails' => json_decode($row['extra_emails'] ?: '[]', true) ?: [],
            'extraWebsites' => json_decode($row['extra_websites'] ?: '[]', true) ?: [],
            'extraAddresses' => json_decode($row['extra_addresses'] ?: '[]', true) ?: [],
            'updatedAt' => $row['updated_at'] ?? '',
        ];
        foreach (self::FIELDS as $api => [$column]) $result[$api] = $row[$column];
        $result['phone'] = $row['phone_number'];
        $result['publicUrl'] = self::baseUrl() . '/p.html#' . rawurlencode($row['id']);
        foreach (['profile' => 'profileImage', 'background' => 'profileBackground'] as $kind => $api) {
            $prefix = $kind === 'profile' ? 'profile_image' : 'profile_background';
            $result[$api] = ($row[$prefix . '_path'] || $row[$prefix . '_url'])
                ? self::baseUrl() . '/api/profile-image?id=' . rawurlencode($row['id']) . '&kind=' . $kind . '&v=' . rawurlencode($row['updated_at'] ?? '')
                : '';
        }
        return $result;
    }

    public static function baseUrl(): string
    {
        return rtrim(Env::get('APP_URL', 'http://localhost:8000'), '/');
    }

    private static function httpUrl(string $value): bool
    {
        return (bool) filter_var($value, FILTER_VALIDATE_URL) &&
            in_array(strtolower((string) parse_url($value, PHP_URL_SCHEME)), ['http', 'https'], true);
    }

    private static function newId(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(12)), '+/', '-_'), '=');
    }
}
