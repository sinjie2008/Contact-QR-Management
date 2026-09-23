# Contact QR Management

Standalone test site for managing contact QR codes.

## QR rules

### WhatsApp QR
- The WhatsApp QR column only displays an **official WhatsApp QR image** or image URL.
- A mobile number by itself is **not enough** to generate a QR that WhatsApp's dedicated **Add via QR code** scanner accepts.
- Get the official QR in WhatsApp:
  1. Open WhatsApp.
  2. Open Settings / your profile.
  3. Tap the QR icon next to your name.
  4. Open **My Code**.
  5. Save/share the QR image.
  6. Upload it in this site or provide the image URL.
- If neither image nor URL is supplied, WhatsApp QR displays **N/A**.

### WeChat QR
- WeChat ID alone does **not** generate a QR.
- WeChat QR is displayed only when a WeChat QR image or image URL is provided.
- Otherwise WeChat QR displays **N/A**.

### V-card QR
- V-card QR is generated from the contact form data.
- Use this QR with the normal iPhone / Android camera to add/save the contact.
- It is separate from WhatsApp's proprietary Add-via-QR format.

## Other features
- Search, sorting, status filter and pagination
- Add / Edit / Remove contacts
- CSV import and matching CSV template
- QR click-to-enlarge preview
- .VCF download
- Reset Test Data
