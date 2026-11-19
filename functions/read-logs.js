import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:/Users/HP/.gemini/antigravity/brain/8e16a622-9313-4eea-9852-491512b6d558/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

for await (const line of rl) {
  if (line.includes('index.js') && line.includes('replace_file_content')) {
    console.log(line.substring(0, 800)); // Print start of line
  }
}
