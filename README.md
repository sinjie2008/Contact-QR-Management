# Contact QR Management

Standalone test site for managing contact QR codes.

## Features
- Search, sorting, status filter and pagination
- Add / Edit / Remove contacts
- CSV import and matching CSV template download
- WhatsApp Add Contact QR generated from Mobile
- WeChat QR image support
- Full V-card QR with .VCF download
- Click any QR to open a large testing preview
- Fully populated built-in contact data
- Missing required QR values display **N/A**
- Browser localStorage persistence and Reset Test Data

## QR rules

### WhatsApp QR
- If **Mobile** has a value, the site automatically generates a minimal vCard QR using:
  - First name
  - Last name
  - Mobile
- Scan it using the normal iPhone / Android camera to add/save the contact.
- If Mobile is blank, WhatsApp QR displays **N/A**.
- An uploaded WhatsApp QR image or image URL can optionally override the generated QR.

### WeChat QR
- WeChat ID by itself does **not** generate a QR.
- WeChat QR is displayed only when:
  - `WeChatQRCodeUrl` has a value, or
  - a WeChat QR image is uploaded manually.
- If neither is provided, WeChat QR displays **N/A**.

### V-card QR
The V-card QR is generated from the available contact/company/location fields and is intended for normal phone-camera contact import.

## Run
Open `index.html` in a browser. The page uses QRCode.js from cdnjs for generated QR codes.
