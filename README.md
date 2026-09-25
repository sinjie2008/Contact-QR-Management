# Contact QR Management

A static contact manager with CSV import, public profile links, and QR downloads.

## Public profiles and contact QR

- Each datatable row shows a clickable **Public URL**, a **Copy URL** button, and the matching profile QR beside the link. Tap the QR to enlarge it for scanning. The URL opens `profile.html` with the contact's saved details, profile photo, background, and **Download VCF** action.
- **View Profile** in the Action column opens that same public profile in a popup. The popup includes an **Open in new tab** link.
- The profile QR in the Public URL cell encodes that same link. Scan it, review the profile, and download/open the VCF to save the contact. The VCF includes the contact photo as embedded image data when its public image URL can be fetched. A photo URI is used if embedding fails. The custom background appears on the profile page; vCard has no standard background field.
- **Download QR** and **Download All QR Codes** include `Contact_Profile_QR.png` instead of a direct vCard QR. Direct QR scanner imports can drop the vCard photo on some phones.
- The public URL contains a base64url-encoded **snapshot** of the contact in its fragment. It is readable to anyone holding the link, and old links do not update after an edit. Copy a new URL or QR after saving changes. Do not put confidential fields in a public profile.
- Public HTTPS image URLs are needed for images on another device. Browser-uploaded images stay in the manager's local storage and are not embedded in the URL or QR.

The public page displays name, phone numbers, fax, email, website, company, role, address, city, post code, country, WeChat ID, WhatsApp message, optional WeChat QR image, and status when provided. The VCF stores standard contact fields and includes WeChat and WhatsApp context in a note.

## Other QR codes

- WhatsApp QR comes from the current Mobile field and optional default message. Editing Mobile regenerates it. The row offers **Open WhatsApp** and **Save .vcf** for that number.
- WeChat QR is an image URL or browser upload. WeChat ID alone does not create a QR.

## Data and access

The manager is a static password-gated page whose application payload is encrypted in `index.html`. The plaintext password is not stored in the repository. Contact records live in the manager browser's `localStorage`; there is no server database or server-side contact lookup. The public `profile.html` is accessible without the manager password using a generated link. Client-side protection is not equivalent to server-side authentication.

CSV import and the template support `ProfileImageURL`, `ProfileBackgroundImageURL`, `WeChatId`, `WhatsAppMessage`, `WeChatQRCodeUrl`, and the other contact fields. **Reset Test Data** restores sample contacts in the current browser.
