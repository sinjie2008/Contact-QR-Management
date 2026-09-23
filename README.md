# Contact QR Management

Standalone test site for managing contact QR codes.

## WhatsApp QR — restored from the supplied working v5

The latest site now uses the same WhatsApp feature as the user-provided `contact_qr_test_site_v5(1).html`:

- Combine **WhatsApp Country Code + WhatsApp Phone Number**
- Build `https://wa.me/<country-code><phone-number>`
- If **WhatsApp Default Message** has a value, append it as `?text=<encoded message>`
- Generate the QR from that URL
- Show **Open WhatsApp**
- Show **Save .vcf** for the WhatsApp contact

The display/download QR generation also uses the embedded QR encoder copied from the supplied v5 implementation, including its quiet-zone SVG rendering.

## WeChat QR
- WeChat remains image-only in the latest version.
- WeChat ID alone does not generate a QR.
- If neither a WeChat QR image nor image URL is supplied, the table shows **N/A**.

## V-card QR
- Generated from the full available contact/company/location fields.
- Includes the existing **Download .VCF** action.

## QR Downloads
- **Download All QR Codes** downloads all available QR codes in one ZIP.
- **Download QR** in each row downloads that contact's available WhatsApp / WeChat / V-card QR codes.
- Missing/N/A QR types are skipped.

## Other features
- Search, sorting, status filter and pagination
- Add / Edit / Remove
- CSV import/export template
- Click QR to enlarge
- Reset Test Data
