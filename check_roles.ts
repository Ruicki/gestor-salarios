
import { prisma } from './lib/prisma';

async function main() {
    const profiles = await prisma.profile.findMany({
        select: { id: true, name: true, role: true }
    });
    console.log('--- PROFILES REPORT ---');
    console.log(JSON.stringify(profiles, null, 2));
}

main();
