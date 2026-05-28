import fs from 'fs';
import dotenv from 'dotenv';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const parsed = dotenv.parse(envContent);
  console.log("Found keys in .env.local:");
  Object.keys(parsed).forEach(key => {
    console.log(`- ${key} (length: ${parsed[key].length})`);
  });
} catch (err) {
  console.error("Error reading .env.local:", err.message);
}
