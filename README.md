# Contact QR Management

Standalone test site for managing contact QR codes.

## QR rules

### WhatsApp QR — direct Add Contact in WhatsApp
The WhatsApp contact QR accepted by **WhatsApp → New Contact → Add via QR code** is based on a WhatsApp-issued link such as:

`https://wa.me/qr/XXXXXXXXXXXXXX`

The code after `/qr/` is issued by WhatsApp and resolves to the WhatsApp account. It cannot be calculated from the mobile number alone.

The site therefore accepts:
- a full `https://wa.me/qr/<code>` link,
- a full `https://api.whatsapp.com/qr/<code>` link, or
- the WhatsApp-issued code itself.

The site then renders that value as a QR. Scanning it in WhatsApp's **Add via QR code** screen should show **Add to Contacts**.

If no WhatsApp contact QR link/code is supplied, the column shows **N/A**.

The site intentionally does **not** use:
- `https://wa.me/<mobile>` click-to-chat links,
- SMS links,
- prefilled messages, or
- generic vCard data in the WhatsApp QR column.

### WeChat QR
- WeChat ID alone does not generate a QR.
- WeChat QR appears only when a WeChat QR image or image URL is provided.
- Otherwise it shows **N/A**.

### V-card QR
- Generated from the contact/company/location fields.
- Scan with a normal iPhone / Android camera to add/save the contact.

## Other features
- Search, sorting, status filter and pagination
- Add / Edit / Remove
- CSV import/export template
- QR zoom preview
- .VCF download
- Reset Test Data
