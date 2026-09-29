# Contact QR Management

A Vinext ChatGPT Site for managing contacts and sharing their live public profiles.

## Public URL + Less Dense QR

Each contact row has one stable Public URL and a Less Dense QR. The URL and QR open `p.html#<contact-id>`, which loads the latest saved profile from `/api/live-profile`. **Open Profile** opens that same live URL. After the profile saves to Sites storage, the row reads **Live · latest saved profile**. Tap the QR to enlarge it.

The manager no longer displays or offers WhatsApp QR, WeChat QR, or direct vCard QR downloads. The public profile still offers **Download VCF** to add the contact to a phone. The profile may also display a WhatsApp contact action and WeChat ID as contact details; these are separate from QR codes.

## Save and image updates

The password-protected manager lives at `public/manager.html`. Its contact list is held in the manager browser's local storage. A Save updates the same contact ID in D1 (`DB`) and uploads any new Profile Image and Profile Background Image to R2 (`PROFILE_IMAGES`). A later scan of the same Less Dense QR loads the latest profile and images. Image responses use cache busting after updates.

The public profile page is available to anyone who has a profile link. Do not enter confidential information into a public profile. The manager's encrypted password gate remains in place.

## Contact fields and CSV

The manager supports extra phone numbers, email addresses, websites, and addresses. In Add Contact or Edit Contact, use **+ Add** and **Remove** for optional values. The required Mobile field remains separate.

The downloadable CSV template includes `PhoneNumber2`, `Email2`, `WebsiteURL2`, and the corresponding second address fields. Higher numbered columns are recognized on import. It includes Profile Image and Profile Background Image URLs, WeChat ID, and WhatsApp message, but no WeChat QR field.

## Hosting

The root route in `app/page.tsx` redirects to the manager. This is a Vinext Worker build with `/api/live-profile` and `/api/profile-image`, using the bindings declared in `.openai/hosting.json`. It must be deployed as a Worker on the existing Site rather than as static HTML.
