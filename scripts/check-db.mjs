// Checks a MongoDB connection string and explains in plain English what's
// wrong with it, without ever printing the password.
//
// Usage: npm run check-db   (then paste the line when asked)

import readline from "node:readline";
import { MongoClient } from "mongodb";

function ask(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(prompt);
    // Don't echo what's pasted — it contains the database password.
    rl._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const line = await ask("Paste your mongodb+srv:// line (it won't be shown), then press Enter: ");

const problems = [];
if (line !== line.trim()) problems.push("It has a space or line break at the start or end.");
if (/["']/.test(line)) problems.push("It contains quote marks (\" or '). Remove them.");
if (/[<>]/.test(line)) problems.push("It still contains < or >. Replace <db_username>/<db_password> completely, brackets included.");
if (!line.trim().startsWith("mongodb+srv://") && !line.trim().startsWith("mongodb://")) {
  problems.push("It doesn't start with mongodb+srv://");
}

const match = line.trim().match(/^mongodb(?:\+srv)?:\/\/([^:@/]+):([^@]*)@([^/?]+)/);
if (match) {
  const [, username, password, host] = match;
  console.log(`Username in your line: ${username}`);
  console.log(`Password in your line: ${password.length} characters (hidden)`);
  console.log(`Cluster address:       ${host}`);
  if (/[@:/?#[\]%]/.test(password)) {
    problems.push("The password contains a symbol like @ : / ? # % that breaks the line. Autogenerate a new password in Atlas.");
  }
} else if (problems.length === 0) {
  problems.push("It isn't shaped like mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/...");
}

if (problems.length > 0) {
  console.log("\n❌ Problems with the line itself:");
  for (const p of problems) console.log(`   - ${p}`);
  process.exit(1);
}

console.log("\nTrying to connect (up to 15 seconds)...");
const client = new MongoClient(line, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  await client.db("partiers").command({ ping: 1 });
  console.log("\n✅ SUCCESS: this line works. If the site still fails, the line saved in Vercel is different from this one.");
} catch (err) {
  const msg = String(err?.message ?? err).replace(/mongodb(\+srv)?:\/\/\S+/g, "[hidden]");
  console.log("\n❌ Could not connect.");
  if (/bad auth|authentication failed/i.test(msg)) {
    console.log("   Reason: WRONG USERNAME OR PASSWORD. The username above must exactly match the one");
    console.log("   under Atlas → Database Users, and the password must be that database user's password");
    console.log("   (not your Atlas website login).");
  } else if (/ENOTFOUND|querySrv|ENODATA/i.test(msg)) {
    console.log("   Reason: THE CLUSTER ADDRESS IS WRONG (typo in the part after the @).");
  } else if (/timed out|Server selection/i.test(msg)) {
    console.log("   Reason: NETWORK BLOCKED. Check Atlas → Network Access has 0.0.0.0/0 and it says Active.");
  } else {
    console.log(`   Details: ${msg}`);
  }
  process.exitCode = 1;
} finally {
  await client.close();
}
