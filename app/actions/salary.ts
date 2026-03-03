'use server' // 1. ESTA LÍNEA ES MÁGICA:
// Le dice a Next.js que todo lo que pase en este archivo NUNCA salga al navegador del usuario.
// Se ejecuta solo en el servidor. Aquí es seguro usar la base de datos.

// 2. Importamos nuestra conexión a la BD
import { prisma } from "@/lib/prisma";

// 3. Importamos el "Tipo" que Prisma creó automáticamente
// ¡Fíjate! No tuvimos que escribir `interface Salary { ... }`. Prisma lo hizo por nosotros.
import { Salary } from "@prisma/client";

// 4. Definimos qué datos esperamos recibir del formulario
// Usamos TypeScript para decir: "Esta función SOLO acepta números"
// 4. Definimos qué datos esperamos recibir del formulario
// Usamos TypeScript para decir: "Esta función SOLO acepta números"
interface CreateSalaryInput {
    grossVal: number;
    bonus: number;
    taxes: number;
    netVal: number;
    socialSec: number;
    eduIns: number;
    incomeTax: number;
    company?: string;
    absentDays: number;
    profileId?: number;
    accountId?: number; // Nuevo campo
}

// 5. La función principal
// Promise<Salary>: Prometemos devolver un objeto tipo "Salario" al terminar.
// 5. La función principal
export async function createSalary(data: CreateSalaryInput) {
    console.log("Guardando salario en el servidor...", data);

    const newSalary = await prisma.$transaction(async (tx) => {
        // 6. Usamos Prisma para guardar (dentro de transacción)
        const salary = await tx.salary.create({
            data: {
                grossVal: data.grossVal,
                bonus: data.bonus,
                taxes: data.taxes,
                netVal: data.netVal,
                socialSec: data.socialSec,
                eduIns: data.eduIns,
                incomeTax: data.incomeTax,
                company: data.company || "Sin Empresa",
                absentDays: data.absentDays,
                profileId: data.profileId,
                accountId: data.accountId
            },
        });

        // Si el salario está vinculado a una cuenta, sumamos el NETO al saldo
        if (data.accountId) {
            await tx.account.update({
                where: { id: data.accountId },
                data: {
                    balance: {
                        increment: data.netVal // Sumamos el valor NETO, que es lo que realmente entra
                    }
                }
            });
        }

        return salary;
    });

    // Serializar para el cliente (Decimal -> Number)
    return {
        ...newSalary,
        grossVal: Number(newSalary.grossVal),
        netVal: Number(newSalary.netVal),
        taxes: Number(newSalary.taxes),
        socialSec: Number(newSalary.socialSec),
        eduIns: Number(newSalary.eduIns),
        incomeTax: Number(newSalary.incomeTax),
        bonus: Number(newSalary.bonus)
    };
}

// ... getSalaries existente ...

// 8. NUEVA FUNCIÓN: Eliminar Salario
// Borra un registro por su ID
export async function deleteSalaryById(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
        // 1. Obtener el salario antes de borrarlo
        const salary = await tx.salary.findUnique({ where: { id } });

        if (salary) {
            // 2. Si estaba vinculado a una cuenta, RESTAMOS el Neto del saldo (Revertir deposito)
            if (salary.accountId) {
                await tx.account.update({
                    where: { id: salary.accountId },
                    data: {
                        balance: {
                            decrement: salary.netVal
                        }
                    }
                });
            }

            await tx.salary.delete({
                where: { id }
            });
        }
    });
}

export async function updateSalary(id: number, data: CreateSalaryInput) {
    const oldSalary = await prisma.salary.findUnique({ where: { id } });
    if (!oldSalary) throw new Error("Salario no encontrado");

    await prisma.$transaction(async (tx) => {
        // 1. Revert Old Impact
        if (oldSalary.accountId) {
            await tx.account.update({
                where: { id: oldSalary.accountId },
                data: { balance: { decrement: oldSalary.netVal } }
            });
        }

        // 2. Apply New Impact
        if (data.accountId) {
            await tx.account.update({
                where: { id: data.accountId },
                data: { balance: { increment: data.netVal } }
            });
        }

        // 3. Update Record
        await tx.salary.update({
            where: { id },
            data: {
                grossVal: data.grossVal,
                bonus: data.bonus,
                taxes: data.taxes,
                netVal: data.netVal,
                socialSec: data.socialSec,
                eduIns: data.eduIns,
                incomeTax: data.incomeTax,
                company: data.company || "Sin Empresa",
                absentDays: data.absentDays,
                profileId: data.profileId,
                accountId: data.accountId
            }
        });
    });
}


