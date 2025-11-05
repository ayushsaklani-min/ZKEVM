import fs from 'fs';
import path from 'path';

const deployed = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'deployed.json'), 'utf8'));

console.log('Deployed contracts:');
for (const [k, v] of Object.entries(deployed)) {
  console.log(`${k}: ${v}`);
}
console.log('\nVerify manually on explorer. (Etherscan API integration out-of-scope for MVP)');
