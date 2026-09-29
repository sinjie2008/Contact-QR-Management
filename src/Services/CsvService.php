<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\ValidationException;
use App\Repositories\ContactRepository;

final class CsvService
{
    public function import(array $upload): array
    {
        if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK ||
            !is_uploaded_file((string) ($upload['tmp_name'] ?? '')) ||
            ($upload['size'] ?? 0) > 5 * 1024 * 1024) {
            throw new ValidationException(['file' => 'Choose a CSV file up to 5 MB.']);
        }
        $file = fopen($upload['tmp_name'], 'rb');
        if (!$file) throw new ValidationException(['file' => 'Unable to read the CSV file.']);
        $headers = fgetcsv($file);
        if (!$headers) {
            fclose($file);
            throw new ValidationException(['file' => 'The CSV file is empty.']);
        }
        $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);
        $headers = array_map(static fn(string $h): string => trim($h), $headers);
        if (count($headers) !== count(array_unique($headers)) || !in_array('FirstName', $headers, true) ||
            !in_array('LastName', $headers, true) || !in_array('Mobile', $headers, true)) {
            fclose($file);
            throw new ValidationException(['file' => 'The CSV needs unique FirstName, LastName and Mobile columns.']);
        }
        $repository = new ContactRepository();
        $db = Database::connection();
        $db->beginTransaction();
        $line = 1;
        $count = 0;
        try {
            while (($values = fgetcsv($file)) !== false) {
                $line++;
                if ($line > 10001) throw new ValidationException(['file' => 'Import at most 10,000 contacts at once.']);
                if (count($values) === 1 && trim((string) $values[0]) === '') continue;
                if (count($values) > count($headers)) {
                    throw new ValidationException(['row' => 'Row ' . $line . ' has too many columns.']);
                }
                $cells = array_combine($headers, array_pad($values, count($headers), ''));
                $input = $this->decode($cells);
                if (trim($input['firstName']) === '' && trim($input['lastName']) === '') continue;
                $existing = !empty($input['id']) ? $repository->find($input['id']) :
                    $repository->match($input['email'], $input['mobile']);
                if ($existing) $input['id'] = $existing['id'];
                try {
                    $row = ContactService::normalize($input, $existing);
                } catch (ValidationException $e) {
                    throw new ValidationException(['row' => 'Row ' . $line . ': ' . implode(' ', $e->errors)]);
                }
                $repository->upsert($row);
                $count++;
            }
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        } finally {
            fclose($file);
        }
        return ['message' => "Imported {$count} CSV rows.", 'imported' => $count];
    }

    private function decode(array $cells): array
    {
        $map = [
            'Id' => 'id', 'FirstName' => 'firstName', 'LastName' => 'lastName',
            'PhoneNumber' => 'phoneNumber', 'Mobile' => 'mobile', 'Email' => 'email',
            'WebsiteURL' => 'website', 'Company' => 'company', 'JobTitle' => 'jobTitle',
            'Fax' => 'fax', 'Address' => 'address', 'City' => 'city', 'PostCode' => 'postCode',
            'Country' => 'country', 'WeChatId' => 'wechatId', 'WhatsAppMessage' => 'whatsappMessage',
            'ProfileImageURL' => 'profileImage', 'ProfileBackgroundImageURL' => 'profileBackground',
        ];
        $input = [];
        foreach ($map as $column => $key) $input[$key] = trim((string) ($cells[$column] ?? ''));
        $input['isActive'] = !in_array(strtolower(trim((string) ($cells['Status'] ?? 'Active'))), ['inactive', 'false', 'no', '0'], true);
        $input['extraPhones'] = $this->additional($cells, '/^PhoneNumber([2-9][0-9]*)$/');
        $input['extraEmails'] = $this->additional($cells, '/^Email([2-9][0-9]*)$/');
        $input['extraWebsites'] = $this->additional($cells, '/^WebsiteURL([2-9][0-9]*)$/');
        $addresses = [];
        foreach ($cells as $column => $value) {
            if (!preg_match('/^Address([2-9][0-9]*)$/', $column, $matches) || trim($value) === '') continue;
            $n = $matches[1];
            $addresses[] = [
                'address' => trim($value), 'city' => trim((string) ($cells['City' . $n] ?? '')),
                'postCode' => trim((string) ($cells['PostCode' . $n] ?? '')),
                'country' => trim((string) ($cells['Country' . $n] ?? '')),
            ];
        }
        $input['extraAddresses'] = $addresses;
        return $input;
    }

    private function additional(array $cells, string $pattern): array
    {
        $items = [];
        foreach ($cells as $column => $value) {
            if (preg_match($pattern, $column) && trim($value) !== '') $items[] = trim($value);
        }
        return $items;
    }

    public function export(array $rows): never
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="contact_qr_export.csv"');
        header('Cache-Control: no-store');
        $out = fopen('php://output', 'wb');
        fwrite($out, "\xEF\xBB\xBF");
        $headers = [
            'Id', 'FirstName', 'LastName', 'PhoneNumber', 'Mobile', 'Email', 'WebsiteURL',
            'Company', 'JobTitle', 'Fax', 'Address', 'City', 'PostCode', 'Country',
            'ProfileImageURL', 'ProfileBackgroundImageURL', 'WeChatId', 'WhatsAppMessage', 'Status',
        ];
        foreach (['PhoneNumber', 'Email', 'WebsiteURL', 'Address', 'City', 'PostCode', 'Country'] as $prefix) {
            for ($n = 2; $n <= 10; $n++) $headers[] = $prefix . $n;
        }
        fputcsv($out, $headers);
        foreach ($rows as $row) {
            $profile = ContactService::present($row);
            $cells = [
                'Id' => $row['id'], 'FirstName' => $row['first_name'], 'LastName' => $row['last_name'],
                'PhoneNumber' => $row['phone_number'], 'Mobile' => $row['mobile'], 'Email' => $row['email'],
                'WebsiteURL' => $row['website'], 'Company' => $row['company'], 'JobTitle' => $row['job_title'],
                'Fax' => $row['fax'], 'Address' => $row['address'], 'City' => $row['city'],
                'PostCode' => $row['post_code'], 'Country' => $row['country'],
                'ProfileImageURL' => $profile['profileImage'], 'ProfileBackgroundImageURL' => $profile['profileBackground'],
                'WeChatId' => $row['wechat_id'], 'WhatsAppMessage' => $row['whatsapp_message'],
                'Status' => $row['is_active'] ? 'Active' : 'Inactive',
            ];
            foreach (['PhoneNumber' => $profile['extraPhones'], 'Email' => $profile['extraEmails'], 'WebsiteURL' => $profile['extraWebsites']] as $prefix => $items) {
                foreach (array_slice($items, 0, 9) as $i => $value) $cells[$prefix . ($i + 2)] = $value;
            }
            foreach (array_slice($profile['extraAddresses'], 0, 9) as $i => $address) {
                foreach (['Address' => 'address', 'City' => 'city', 'PostCode' => 'postCode', 'Country' => 'country'] as $prefix => $key) {
                    $cells[$prefix . ($i + 2)] = $address[$key] ?? '';
                }
            }
            fputcsv($out, array_map(static fn(string $header): string => (string) ($cells[$header] ?? ''), $headers));
        }
        fclose($out);
        exit;
    }
}
