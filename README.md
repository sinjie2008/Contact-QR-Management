# Contact QR Management — PHP branch

This branch is a PHP 8.2+ and MySQL 8 application. It is separate from the Vinext ChatGPT Site on `main`; no PHP code from this branch is deployed to that Site. The web server must point to `public/`, so `.env`, SQL files, and uploaded originals are outside the web root.

## Local setup

1. Create a MySQL database and a database user with access to it.
2. Copy `.env.example` to `.env`. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `APP_URL`, `ADMIN_USERNAME`, and a unique `ADMIN_PASSWORD` of at least 12 characters. Do not commit `.env`.
3. Run `php bin/migrate.php` to create the tables.
4. Run `php bin/seed.php` to create the first administrator. Add `--demo` to also seed five sample contacts. The seeder is safe to run again; it does not reset existing passwords or overwrite contacts.
5. Run `npm ci` and `npm run build:css` when changing `resources/scss/app.scss`. The compiled `public/assets/css/app.css` is already committed for hosts that do not run Node.
6. For local development, run `php -S localhost:8000 -t public public/router.php` and open `http://localhost:8000/login`.

Required PHP extensions are PDO MySQL and Fileinfo. Uploads use the PHP image metadata functions. Configure `upload_max_filesize` and `post_max_size` to allow the 5 MB app limit. On HTTPS hosts, set `SESSION_SECURE=true` in `.env` and set `APP_URL` to the actual public origin. Keep `storage/uploads/` writable by the PHP process and persist it across releases. Serve only `public/` through Apache, Nginx, or another PHP capable host; route unknown paths to `public/index.php`.

## Accounts and contacts

Sign in with the administrator credentials configured for the initial seed. Administrators can add more `user` or `admin` accounts at `/users`; contact managers can add, edit, delete, search, import, and export contacts. Passwords are hashed with PHP's `password_hash`. The protected JSON API also supports `PATCH /api/users/{id}` for changing a password or enabling or disabling an account. Use a JSON object such as `{"password":"new-long-password"}` or `{"isActive":false}` with the session CSRF token. An administrator cannot disable their own account.

The dashboard has four charts backed by `/api/stats`: contact status, top countries, top companies, and profile image coverage. If the database is empty, counts show zero and distribution charts say “No data yet.” CSV import uses `public/contact_qr_import_template.csv`, matches existing contacts by ID, email, or mobile, and performs the import in one database transaction. It does not silently replace an existing administrator password or create accounts from CSV.

## Public profile and images

Each contact has a stable `p.html#<id>` public URL. The QR encodes that URL. Opening it shows the current database record at `/profile/<id>`; saving new profile and background images keeps the same QR but changes the images on the next scan. The manager displays “Live · latest saved profile,” with Open Profile and Copy URL inline. The public profile has Download VCF; the manager has no WhatsApp, WeChat, or vCard QR features. The public API routes are `GET /api/live-profile?id=<id>` and `GET /api/profile-image?id=<id>&kind=profile|background`. Missing profiles return JSON errors from the live profile API.

Uploads are validated as JPG, PNG, or WebP, stored in `storage/uploads/`, and served by `/api/profile-image`. The image URL includes the contact's database update timestamp to refresh caches. Remote image URLs from CSV/demo data are returned through that route as redirects. Back up both MySQL and `storage/uploads/` together. Public profile links are available to anyone with the link, so put only information intended for public sharing in a contact.

## API

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/auth/me` | Signed in |
| GET, POST | `/api/users` | Admin |
| PATCH | `/api/users/{id}` | Admin |
| GET | `/api/stats` | Signed in |
| GET, POST | `/api/contacts` | Signed in |
| GET, PUT, DELETE | `/api/contacts/{id}` | Signed in |
| POST | `/api/contacts/{id}/images` | Signed in |
| POST | `/api/contacts/import` | Signed in |
| GET | `/api/contacts/export` | Signed in |
| GET | `/api/live-profile?id={id}` | Public |
| PUT | `/api/live-profile?id={id}` | Signed in |
| GET | `/api/profile-image?id={id}&kind={kind}` | Public |
| GET | `/profile/{id}`, `/profile/{id}.vcf` | Public |

All state changing requests require `X-CSRF-TOKEN` from the signed in page or `/api/auth/me`; HTML forms use `_csrf`. Image upload and CSV import use multipart form data. API responses are JSON except the CSV export and image response.

## Moving data from the current Site

The existing Site on `main` has a browser local contact manager plus live profile storage. This PHP branch uses a new MySQL database and new account system; it cannot read that Site's D1/R2 bindings or reuse its password automatically. Export contacts as CSV from the existing manager and import them into the PHP manager after setup. Reupload local profile/background image files where the CSV does not contain a usable remote URL. Keep the old Site and its password protection in place until migration and QR scans are verified on the eventual PHP host. QR codes containing the old Site origin continue to point to that Site; changing hosts does not rewrite printed QR codes.
