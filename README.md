# Contact QR Management

Standalone test site for managing contact QR codes.

## Features
- Search, sorting, status filter and pagination
- Add / Edit / Remove contacts
- CSV import and matching CSV template download
- WhatsApp **Add Contact** QR
- WeChat QR
- Full V-card QR with .VCF download
- Click any QR to open a large testing preview
- Fully populated built-in test contacts
- Missing required QR values display **N/A**
- Browser localStorage persistence and Reset Test Data

## Run
Open `index.html` in a browser. The page uses QRCode.js from cdnjs for generated QR codes.

## QR behavior
- **WhatsApp QR** requires Mobile or Phone Number. The generated QR is a minimal vCard containing the contact name and mobile number. Scan it with the normal phone camera to add/save the contact. It does **not** use `wa.me`, open a chat, or prefill/send a message.
- **WeChat QR** requires WeChat ID. The generated QR is a test payload unless an official WeChat QR image URL/image is supplied.
- **V-card QR** contains the full available contact/company/location information.
- Optional WhatsApp / WeChat QR image URLs can override the generated QR image.

For production, replace platform-specific QR image overrides with official QR images when required.
