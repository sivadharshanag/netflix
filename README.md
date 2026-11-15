# VARUNIKA — A Birthday Original

## Run it

1. Install dependencies (requires Node.js 18.18+):

   ```bash
   npm install
   ```

2. Create your `.env`:

   ```bash
   cp .env.example .env
   ```

3. Generate a passcode hash and paste the printed `BIRTHDAY_PASSWORD_HASH=...` line into `.env`:

   ```bash
   npm run hash-password -- "yourSecretPasscode"
   ```

4. Generate a session secret and set it as `SESSION_SECRET` in `.env`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. Put your photo/video folders inside `media/` at the project root.

6. Create the content file:

   ```bash
   cp content/editorial.example.json content/editorial.json
   ```

7. Start the app:

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
