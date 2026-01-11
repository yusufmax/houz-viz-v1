
import jwt from 'jsonwebtoken';

const args = process.argv.slice(2);
const secret = args[0];

if (!secret) {
    console.error('Error: Please provide your JWT_SECRET as an argument.');
    console.error('Usage: node scripts/generate-supabase-keys.js <YOUR_JWT_SECRET>');
    process.exit(1);
}

const anon = jwt.sign({
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3153600000
}, secret);

const service = jwt.sign({
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3153600000
}, secret);

console.log('\n✅ Keys generated successfully!\n');
console.log('--- Copy to your .env ---');
console.log('ANON_KEY=' + anon);
console.log('SERVICE_ROLE_KEY=' + service);
console.log('-------------------------\n');
