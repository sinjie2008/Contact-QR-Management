# Contact QR Management

Standalone test site for managing contact QR codes.

## WhatsApp QR — follows QR.io behavior
QR.io's static WhatsApp QR type asks for:
- Country code
- Phone number
- Message

QR.io describes this QR type as **Send WhatsApp message**. The generated QR opens WhatsApp for the target number; when a message is supplied it is prefilled.

This project now mirrors that behavior using:
`https://wa.me/<country-code><phone-number>?text=<message>`

The message is optional in this project. If Country Code or WhatsApp Phone Number is blank, WhatsApp QR displays **N/A**.

Important: this is QR.io-style WhatsApp behavior. It is not the proprietary **WhatsApp → Add via QR code** contact token.

## WeChat QR
- WeChat ID alone does not generate a QR.
- WeChat QR is displayed only when a WeChat QR image or image URL is supplied.
- Otherwise it displays **N/A**.

## V-card QR
- Generated from contact/company/location fields.
- Scan with the normal iPhone / Android camera to add/save the contact.

## Download QR codes
- **Download All QR Codes** creates one ZIP containing every available QR for all contacts.
- **Download QR** in the Action column creates one ZIP containing the available WhatsApp / WeChat / V-card QR files for that contact.
- N/A QR types are skipped.

## Other features
- Search, sorting, status filter and pagination
- Add / Edit / Remove
- CSV import/export template
- QR zoom preview
- .VCF download
- Reset Test Data
