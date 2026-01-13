'use server';

import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Default Categories Config
const DEFAULT_CATEGORIES = [
    { name: 'Vivienda', icon: 'Home', color: 'text-blue-500', type: 'FIXED' },
    { name: 'Comida', icon: 'ShoppingBag', color: 'text-orange-500', type: 'VARIABLE' },
    { name: 'Transporte', icon: 'Car', color: 'text-zinc-500', type: 'FIXED' },
    { name: 'Entretenimiento', icon: 'Coffee', color: 'text-pink-500', type: 'LUXURY' },
    { name: 'Servicios', icon: 'Zap', color: 'text-yellow-500', type: 'FIXED' },
    { name: 'Salud', icon: 'HeartPulse', color: 'text-red-500', type: 'VARIABLE' },
    { name: 'Educación', icon: 'GraduationCap', color: 'text-indigo-500', type: 'FIXED' },
    { name: 'Tecnología', icon: 'Smartphone', color: 'text-cyan-500', type: 'VARIABLE' },
    { name: 'Viajes', icon: 'Plane', color: 'text-emerald-500', type: 'LUXURY' },
];

export async function initializeDefaultCategories(profileId: number) {
    // Check if user already has categories
    const count = await prisma.category.count({ where: { profileId } });
    if (count > 0) return;

    // Bulk create defaults using transaction for SQLite compatibility
    await prisma.$transaction(
        DEFAULT_CATEGORIES.map(cat =>
            prisma.category.create({
                data: {
                    ...cat,
                    profileId
                }
            })
        )
    );

    revalidatePath('/budget');
}

export async function getCategories(profileId: number): Promise<Category[]> {
    let categories = await prisma.category.findMany({
        where: { profileId },
        orderBy: { name: 'asc' }
    });

    // Fallback: If no categories exist (maybe new feature rollout), init them now
    if (categories.length === 0) {
        await initializeDefaultCategories(profileId);
        categories = await prisma.category.findMany({
            where: { profileId },
            orderBy: { name: 'asc' }
        });
    }

    return categories;
}

export async function createCategory(profileId: number, name: string, icon: string, color: string, type: string) {
    const category = await prisma.category.create({
        data: {
            name,
            icon,
            color,
            type,
            profileId
        }
    });
    revalidatePath('/budget');
    return category;
}

export async function deleteCategory(id: number) {
    // Optional: Check if used? Or simply set expenses to null category?
    // For now, let's keep it simple. If we delete a category, expenses lose the link.
    // Ideally we should warn user.

    // Unlink expenses first
    await prisma.expense.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
    });

    await prisma.category.delete({ where: { id } });
    revalidatePath('/budget');
}

export async function updateCategoryLimit(id: number, limit: number | null) {
    await prisma.category.update({
        where: { id },
        data: { monthlyLimit: limit }
    });
    revalidatePath('/budget');
}
