import argon2 from "argon2";

async function run(): Promise<void> {
  const plaintext = process.argv[2];
  if (!plaintext) {
    console.error('Usage: npm run hash-password -- "yourSecretPasscode"');
    process.exitCode = 1;
    return;
  }

  const hash = await argon2.hash(plaintext, { type: argon2.argon2id });
  console.log("\nAdd this line to your .env file:\n");
  console.log(`BIRTHDAY_PASSWORD_HASH=${hash}\n`);
  console.log("Do not commit .env or share this hash publicly alongside the plaintext passcode.");
}

run().catch((error) => {
  console.error("Failed to hash password:", error);
  process.exitCode = 1;
});
