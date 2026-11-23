// Creates (or resets the password of) the single admin account.
//   npm run create-admin
// You type the email and password here; they are never stored in plain text.
const readline = require("readline");
const bcrypt = require("bcryptjs");
const { requireSettings } = require("../config");

function ask(question, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // hide the password while typing
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write("*"); };
    }
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(answer.trim()); });
  });
}

(async () => {
  requireSettings();
  const pool = require("../db");
  const email = (await ask("Admin email: ")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That does not look like an email address.");
  const pw = await ask("Password (min 10 characters): ", true);
  if (pw.length < 10) throw new Error("Password must be at least 10 characters.");
  const pw2 = await ask("Repeat password: ", true);
  if (pw !== pw2) throw new Error("Passwords do not match.");

  const hash = await bcrypt.hash(pw, 12);
  await pool.query("DELETE FROM admins"); // one admin account only
  await pool.query("INSERT INTO admins (email, password_hash) VALUES (?, ?)", [email, hash]);
  console.log("\nAdmin account saved for " + email + ". You can now log in to the admin panel.");
  await pool.end();
})().catch((e) => { console.error("\n" + e.message); process.exit(1); });
