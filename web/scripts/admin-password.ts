// Prints the ADMIN_PASSWORD_HASH line for a password you type. The password itself is never stored:
// put the printed line in .env.local (or the Vercel project's environment), then sign in at /admin.
//
//   pnpm admin:password
import { createInterface } from "node:readline/promises";
import { hashPassword } from "@/lib/admin-auth";

const rl = createInterface({ input: process.stdin, output: process.stderr });
const password = (await rl.question("New admin password (12+ characters): ")).trim();
rl.close();
if (password.length < 12) {
  console.error("Use at least 12 characters.");
  process.exit(1);
}
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
