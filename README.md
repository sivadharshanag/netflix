# VARUNIKA — A Birthday Original

## Run it

1. Install dependencies (requires Node.js 18.18+):

   ```bash
   npm install
   ```

2. Put your photo/video folders inside `media/` at the project root.

3. Create the content file:

   ```bash
   cp content/editorial.example.json content/editorial.json
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

   Open **http://localhost:5173**.

## Run in production

```bash
npm run build
npm start
```

Open **http://localhost:3000**.

## Deploy for free (GitHub + Render + Cloudflare R2)

```
browser ──► Render (free web service: app + password gate)
   │            │ checks session, then 302 → short-lived signed URL
   └──────────► Cloudflare R2 (private bucket: photos, videos, thumbnails)
```

- **GitHub** holds only app code. `media/`, `content/editorial.json` and
  thumbnails are git-ignored.
- **R2** holds the media (free: 10 GB storage, no egress fees). The bucket
  stays private: the app hands out signed links only after login.
- **Render** runs the app. Videos stream straight from R2, so Render's small
  free instance never touches the large files.

Local dev is unchanged: with `MEDIA_STORAGE=local` (the default) media is read
from `./media`.

### 1. Cloudflare R2

1. Cloudflare dashboard → **R2 Object Storage** → enable R2 (the free plan
   asks for a card but charges nothing under 10 GB).
2. **Create bucket** → name `varunika-media`, location Automatic. Leave public
   access **off**.
3. Bucket → **Settings → CORS policy** → paste:

   ```json
   [{ "AllowedOrigins": ["*"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```

   (Needed for the in-browser video poster grab. `*` is safe here: every URL
   is signed and expires.)
4. R2 overview → **Manage API tokens → Create API token** → permission
   **Object Read & Write**, restricted to `varunika-media`. Copy the
   **Access Key ID**, **Secret Access Key**, and the S3 endpoint
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

### 2. Upload the media (from this PC)

Create `.env.local` (git-ignored) next to `.env`:

```env
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=varunika-media
S3_REGION=auto
S3_ACCESS_KEY_ID=<access key id>
S3_SECRET_ACCESS_KEY=<secret access key>
```

Then:

```bash
npm run generate-thumbnails   # posters (skips ones that already exist)
npm run upload-media -- --dry # preview
npm run upload-media          # upload ~2.2 GB; re-run any time, only new files go up
```

This uploads `media/`, the thumbnails, a manifest (which keeps the real photo
dates), and `content/editorial.json` + `media-overrides.json`.

### 3. GitHub

Push the code (`git push`). Check that `media/` doesn't appear in `git status`.

### 4. Render

1. Render → **New → Blueprint** → pick the repo. It reads `render.yaml`.
2. Fill in the prompted secrets:

   | Key | Value |
   | --- | --- |
   | `BIRTHDAY_PASSWORD_HASH` | output of `npm run hash-password -- "yourPasscode"` |
   | `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `S3_BUCKET` | `varunika-media` |
   | `S3_ACCESS_KEY_ID` | from step 1.4 |
   | `S3_SECRET_ACCESS_KEY` | from step 1.4 |

   `SESSION_SECRET` is generated automatically; `MEDIA_STORAGE=s3`,
   `COOKIE_SECURE=true`, `NODE_ENV=production` are preset.
3. Deploy. The log should say `Scanned bucket "varunika-media" ...: N items`.

After uploading new media or editing `editorial.json`, re-run
`npm run upload-media`, then Render → **Manual Deploy → Restart service**.

### Using Backblaze B2 instead

Create a **private** bucket and an application key with read/write access to
it, then set `S3_ENDPOINT=https://s3.<region>.backblazeb2.com` (shown on the
bucket page, e.g. `s3.us-west-004.backblazeb2.com`), `S3_REGION=<region>`
(e.g. `us-west-004`), key ID / application key as the access/secret keys. Add
a CORS rule for GET/HEAD from any origin. B2 is free up to 10 GB, but
downloads beyond 3× your stored data per month are billed. R2 has no egress
fees, so it's the better pick for video.

### Free-tier limits to know about

- **Render free sleeps after 15 min idle.** The first visit after that takes
  ~30–60 s to wake. Open the site a minute before the birthday moment.
- **Logins don't survive a restart/sleep** (sessions are in memory). She'll
  just enter the passcode again; it's not worth a paid database to fix.
- **R2 free tier:** 10 GB storage, 1M uploads + 10M reads per month. 2.2 GB
  is well inside that.
