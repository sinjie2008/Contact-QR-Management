<?php
declare(strict_types=1);

namespace App\Services;

final class VCardService
{
    public function build(array $profile): string
    {
        $lines = ['BEGIN:VCARD', 'VERSION:3.0'];
        $lines[] = 'N:' . $this->escape($profile['lastName']) . ';' . $this->escape($profile['firstName']) . ';;;';
        $lines[] = 'FN:' . $this->escape($profile['name']);
        foreach (array_filter([$profile['mobile'], $profile['phoneNumber'], ...$profile['extraPhones']]) as $phone) {
            $lines[] = 'TEL:' . $this->escape($phone);
        }
        foreach (array_filter([$profile['email'], ...$profile['extraEmails']]) as $email) {
            $lines[] = 'EMAIL:' . $this->escape($email);
        }
        foreach (array_filter([$profile['website'], ...$profile['extraWebsites']]) as $url) {
            $lines[] = 'URL:' . $this->escape($url);
        }
        if ($profile['company'] !== '') $lines[] = 'ORG:' . $this->escape($profile['company']);
        if ($profile['jobTitle'] !== '') $lines[] = 'TITLE:' . $this->escape($profile['jobTitle']);
        foreach (array_merge([[
            'address' => $profile['address'], 'city' => $profile['city'],
            'postCode' => $profile['postCode'], 'country' => $profile['country'],
        ]], $profile['extraAddresses']) as $address) {
            if (empty($address['address']) && empty($address['city']) && empty($address['country'])) continue;
            $lines[] = 'ADR:;;' . $this->escape($address['address'] ?? '') . ';' .
                $this->escape($address['city'] ?? '') . ';;' . $this->escape($address['postCode'] ?? '') .
                ';' . $this->escape($address['country'] ?? '');
        }
        $notes = [];
        if ($profile['wechatId'] !== '') $notes[] = 'WeChat: ' . $profile['wechatId'];
        if ($profile['whatsappMessage'] !== '') $notes[] = 'WhatsApp message: ' . $profile['whatsappMessage'];
        if ($notes) $lines[] = 'NOTE:' . $this->escape(implode("\n", $notes));
        $lines[] = 'END:VCARD';
        return implode("\r\n", $lines) . "\r\n";
    }

    private function escape(string $value): string
    {
        return str_replace(["\\", ";", ",", "\r\n", "\n", "\r"], ["\\\\", "\\;", "\\,", "\\n", "\\n", "\\n"], $value);
    }
}
