import dotenv from "dotenv";

// `.env.local` is git-ignored (via `*.local`), so it's the safe place for
// cloud-storage keys. It's loaded first; dotenv never overrides a variable
// that's already set, so `.env.local` wins over `.env`, and real environment
// variables (e.g. set in the Render dashboard) win over both.
dotenv.config({ path: ".env.local" });
dotenv.config();
