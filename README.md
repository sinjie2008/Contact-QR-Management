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

## Password Access

The site now requires a password before Contact QR Management is initialized.

- Password verification uses PBKDF2-SHA256 with 310,000 iterations.
- The plaintext password is not stored in the repository.
- Authentication is kept only in `sessionStorage`, so a new browser session requires authentication again.
- After 5 failed attempts, the current tab is temporarily locked for 30 seconds.
- Saved contact records remain in the browser's `localStorage` and are not rendered until authentication succeeds.

### Security note

This repository is a public static website. The password gate helps prevent normal unauthenticated access, but client-side protection is not equivalent to server-side authentication. Do not store confidential source data directly in this public repository. For stronger protection, use a private repository and a hosting layer with server-side or edge authentication.


## Profile Images

- Each contact supports a **Profile Image** and **Profile Background Image**.
- Both fields accept an image URL or a browser upload.
- The contact listing shows the profile image and background image directly in the datatable.
- **Reset Test Data** provides built-in sample profile/background images for immediate testing.
- CSV import/template now support `ProfileImageURL` and `ProfileBackgroundImageURL`.
- Browser uploads are stored as data URLs in localStorage, so large images can consume browser storage quickly.

## Profile QR

- The **Profile QR** opens `profile.html`, a public mobile-friendly digital profile page.
- It shows the latest saved **Profile Image URL** and **Profile Background Image URL**, plus contact details and action buttons.
- The Profile QR is regenerated every time the contact row is rendered, so editing and saving a contact creates a new QR payload with the latest data.
- The existing **V-card QR** remains available for saving contact details; it does not support a custom background image.
- Use public HTTPS image URLs for images that must appear after scanning on another phone. Browser-uploaded data URLs are kept local to the management browser and are intentionally not placed into the QR because they can make the QR payload too large.

## Android Contact Photo

- Android contact photos are now handled through **Profile QR → Add to Android Contacts**.
- The public profile page downloads the Profile Image URL, converts it to vCard PHOTO data, and embeds the photo in the downloaded VCF whenever possible.
- If the original image host blocks cross-origin downloads, the page falls back to the public wsrv.nl image-resize/cache service to create a small contact photo for the VCF.
- The direct V-card QR also includes a `PHOTO;VALUE=URI` field, but Android contact apps vary in whether they fetch remote photo URIs. The Profile QR download path is therefore the recommended Android flow.
- Android/Google Contacts does not have a standard vCard field for a custom profile background/calling-card background. The Profile Background Image remains visible on the digital profile page, while the profile photo is imported into Contacts.
