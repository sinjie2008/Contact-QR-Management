# Contact QR Management

A static contact manager with CSV import, public profile links, and QR downloads.

## Public profiles and contact QR

- Each datatable row shows a clickable **Public URL**, a **Copy URL** button, and the matching profile QR beside the link. Tap the QR to enlarge it for scanning. The URL opens `profile.html` with the contact's saved details, profile photo, background, and **Download VCF** action.
- **View Profile** in the Action column opens that same public profile in a popup. The popup includes an **Open in new tab** link.
- The profile QR in the Public URL cell encodes that same link. Scan it, review the profile, and download/open the VCF to save the contact. The VCF includes the contact photo as embedded image data when its public image URL can be fetched. A photo URI is used if embedding fails. The custom background appears on the profile page; vCard has no standard background field.
- **Download QR** and **Download All QR Codes** include both `Contact_Profile_QR.png` (opens the profile) and `V-card_QR.png` (direct vCard scan), plus available WhatsApp and WeChat codes.
- The public URL contains a base64url-encoded **snapshot** of the contact in its fragment. It is readable to anyone holding the link, and old links do not update after an edit. Copy a new URL or QR after saving changes. Do not put confidential fields in a public profile.
- Public HTTPS image URLs are needed for images on another device. Browser-uploaded images stay in the manager's local storage and are not embedded in the URL or QR.

The public page displays name, phone numbers, fax, email, website, company, role, address, city, post code, country, WeChat ID, WhatsApp message, optional WeChat QR image, and status when provided. The VCF stores standard contact fields and includes WeChat and WhatsApp context in a note.

## Multiple phone, email, website, and address fields

In **Add Contact** or **Edit Contact**, use the **+ Add** and **Remove** buttons for optional phone numbers, email addresses, websites, and full addresses. Each address has its own street, city, post code, and country. The required **Mobile** field stays separate and continues to drive the WhatsApp QR. The first value in each group remains compatible with older saved contacts.

The downloadable CSV template contains `PhoneNumber2`, `Email2`, `WebsiteURL2`, and `Address2`/`City2`/`PostCode2`/`Country2`. Add numbered columns such as `PhoneNumber3`, `Email3`, `WebsiteURL3`, `Address3`, `City3`, `PostCode3`, and `Country3` for further values; import recognizes any higher number. Existing CSV files with only the original columns still import. Reset Test Data includes a contact with multiple values for quick testing.

All saved values appear on the public profile and in both the direct V-card QR and downloaded VCF. More fields make QR payloads longer; if a QR exceeds capacity, the table says **QR too large** and the URL can still be opened directly.

## QR scan comparison for HR

| Route | What the phone does | Photo and background |
| --- | --- | --- |
| **V-card QR** | The QR holds vCard 3.0 text. The phone's scanner may offer to add the contact directly. | It contains only a public `PHOTO;VALUE=URI` reference; some scanners ignore it. No custom background is imported. |
| **Profile QR + Download VCF** | The QR opens the public profile. Tap **Download VCF**, then open the file in Contacts. | The web page displays photo and background. The VCF attempts to embed a reachable photo; if fetching fails, it falls back to a photo URI. |

QR codes have limited capacity. Long names, messages, or image URLs can make a code too dense or too large; the table then shows **QR too large** and the ZIP omits that code. Phone scanners and Contacts apps vary, so test the direct-scan result on the actual Android and iPhone models used.

## Other QR codes

- WhatsApp QR comes from the current Mobile field and optional default message. Editing Mobile regenerates it. The row offers **Open WhatsApp** and **Save .vcf** for that number.
- WeChat QR is an image URL or browser upload. WeChat ID alone does not create a QR.

## Data and access

The manager is a static password-gated page whose application payload is encrypted in `index.html`. The plaintext password is not stored in the repository. Contact records live in the manager browser's `localStorage`; there is no server database or server-side contact lookup. The public `profile.html` is accessible without the manager password using a generated link. Client-side protection is not equivalent to server-side authentication.

CSV import and the template support `ProfileImageURL`, `ProfileBackgroundImageURL`, `WeChatId`, `WhatsAppMessage`, `WeChatQRCodeUrl`, and the other contact fields. **Reset Test Data** restores sample contacts in the current browser.
