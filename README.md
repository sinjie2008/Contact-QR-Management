# Contact QR Management

Standalone test site for managing contact QR codes.

## Features
- Search, sorting, status filter and pagination
- Add / Edit / Remove contacts
- CSV import and matching CSV template download
- WhatsApp QR
- WeChat QR
- V-card QR with .VCF download
- Click any QR to open a large testing preview
- Fully populated built-in test contacts
- Missing required QR values display **N/A**
- Browser localStorage persistence and Reset Test Data

## Run
Open `index.html` in a browser. The page uses QRCode.js from cdnjs for generated QR codes.

## QR behavior
- WhatsApp QR requires Mobile or Phone Number.
- WeChat QR requires WeChat ID.
- V-card QR requires a name plus at least one contact/company/location value.
- Optional WhatsApp / WeChat QR image URLs can override the generated test QR image.

Test QR images are for development/testing. Replace platform-specific QR images with official production QR codes when required.
