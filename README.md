# Contact QR Management

Standalone test site for managing contact QR codes.

## QR rules

### WhatsApp QR
- WhatsApp QR is generated automatically from **Mobile**.
- The generated QR contains a plain WhatsApp link: `https://wa.me/<mobile>`.
- It does **not** contain a prefilled message.
- Scan it using the **WhatsApp Camera**.
- WhatsApp's documented flow is: **WhatsApp link → Open link → Add to Contacts**.
- If Mobile is blank, WhatsApp QR displays **N/A**.
- Do **not** use **New Contact → Add via QR code** for this generated link QR; that screen expects WhatsApp's proprietary contact QR.

### WeChat QR
- WeChat ID alone does **not** generate a QR.
- WeChat QR is displayed only when a WeChat QR image or `WeChatQRCodeUrl` is provided.
- Otherwise WeChat QR displays **N/A**.

### V-card QR
- V-card QR is generated from the contact form data.
- Scan with the normal iPhone / Android camera to create/save the contact.

## Other features
- Search, sorting, status filter and pagination
- Add / Edit / Remove contacts
- CSV import and matching CSV template
- QR click-to-enlarge preview
- .VCF download
- Reset Test Data
