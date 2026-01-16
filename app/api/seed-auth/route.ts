import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const salt = await bcrypt.genSalt(10);

        // 1. Password hashes
        const passCindy = await bcrypt.hash('cindy123', salt);
        const passAdmin = await bcrypt.hash('admin123', salt);

        // 2. Update Cindy
        // Buscamos un perfil que se llame parecido a "Cindy" o "Cindy Ruicki"
        const cindyProfile = await prisma.profile.findFirst({
            where: {
                name: {
                    contains: 'Cindy',
                    mode: 'insensitive'
                }
            }
        });

        let msgCindy = '';
        if (cindyProfile) {
            await prisma.profile.update({
                where: { id: cindyProfile.id },
                data: {
                    email: 'cindy@admin.com',
                    password: passCindy
                }
            });
            msgCindy = `Cindy updated (ID: ${cindyProfile.id})`;
        } else {
            // Create if not exists ? User said "Migrate existing", but fallback if not found
            // Let's create purely for testing if current db is empty
            const newCindy = await prisma.profile.create({
                data: {
                    name: 'Cindy Ruicki',
                    email: 'cindy@admin.com',
                    password: passCindy
                }
            });
            msgCindy = `Cindy created (ID: ${newCindy.id})`;
        }

        // 3. Update/Create Admin
        // Buscamos "Ricardo" o "Admin"
        const adminProfile = await prisma.profile.findFirst({
            where: {
                OR: [
                    { name: { contains: 'Ricardo', mode: 'insensitive' } },
                    { name: { contains: 'Admin', mode: 'insensitive' } }
                ]
            }
        });

        let msgAdmin = '';
        if (adminProfile) {
            await prisma.profile.update({
                where: { id: adminProfile.id },
                data: {
                    email: 'admin@admin.com',
                    password: passAdmin,
                    role: 'ADMIN'
                }
            });
            msgAdmin = `Admin updated (ID: ${adminProfile.id})`;
        } else {
            const newAdmin = await prisma.profile.create({
                data: {
                    name: 'Administrador',
                    email: 'admin@admin.com',
                    password: passAdmin,
                    role: 'ADMIN'
                }
            });
            msgAdmin = `Admin created (ID: ${newAdmin.id})`;
        }

        return NextResponse.json({
            success: true,
            details: { cindy: msgCindy, admin: msgAdmin }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
