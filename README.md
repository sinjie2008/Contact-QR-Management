# Contact QR Management

Standalone contact QR management test site.

## WhatsApp QR

The WhatsApp QR now uses **Mobile as the single source of truth**.

- The QR payload is generated from the current `Mobile` value.
- Example: `+65 9123 4567` becomes `https://wa.me/6591234567`.
- If the contact's Mobile is edited and saved, the old QR is discarded and the table immediately regenerates the WhatsApp QR from the new Mobile.
- No separate WhatsApp country-code or WhatsApp phone-number fields are stored.
- The optional WhatsApp Default Message is still appended when provided.
- **Open WhatsApp** and **Save .vcf** use the same current Mobile value.
- If Mobile is blank, WhatsApp QR displays **N/A**.

## WeChat QR
- WeChat is image-only.
- WeChat ID alone does not generate a QR.
- No image / image URL means **N/A**.

## V-card QR
- Generated from the full current contact details.

## Downloads
- **Download All QR Codes** downloads available QR codes for all contacts.
- **Download QR** in each row downloads available QR codes for that contact.
- Downloaded WhatsApp QR files are also generated from the current Mobile value.
