
import { prisma } from './lib/prisma';

async function main() {
    const profiles = await prisma.profile.findMany();
    console.log('ID | Name | Role');
    profiles.forEach(p => console.log(`${p.id} | ${p.name} | ${p.role}`));
}

main();
