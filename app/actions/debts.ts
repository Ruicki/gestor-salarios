'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CreateLoanInput = {
    name: string;
    lender: string;
    type: string;
    totalAmount: number;
    currentBalance: number;
    interestRate?: number;
    termMonths?: number;
    monthlyPayment?: number;
    paymentDay?: number;
    isAutomatic: boolean;
    profileId: number;
}

export async function createLoan(data: CreateLoanInput) {
    const loan = await prisma.loan.create({
        data: {
            ...data,
            interestRate: data.interestRate || 0,
            termMonths: data.termMonths || 0,
            monthlyPayment: data.monthlyPayment || 0,
            paymentDay: data.paymentDay || 0
        }
    });

    revalidatePath('/budget');
    return loan;
}

export async function deleteLoan(id: number) {
    await prisma.loan.delete({ where: { id } });
    revalidatePath('/budget');
}

export async function payLoan(loanId: number, amount: number, sourceAccountId: number) {
    if (amount <= 0) throw new Error("El monto debe ser positivo");

    const account = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!account) throw new Error("Cuenta no encontrada");
    if (account.balance < amount) throw new Error("Fondos insuficientes");

    await prisma.$transaction(async (tx) => {
        // 1. Deducir de la cuenta de origen
        await tx.account.update({
            where: { id: sourceAccountId },
            data: { balance: { decrement: amount } }
        });

        // 2. Reducir el saldo del préstamo
        // ¿Buscar primero para ver si ya es 0? No es estrictamente necesario pero es bueno para validación.
        // Por ahora, actualización directa.
        const loan = await tx.loan.update({
            where: { id: loanId },
            data: { currentBalance: { decrement: amount } }
        });

        // 3. Registrar Gasto (Optimización: ¿Verificar si existe la categoría 'Deudas'? O usar nombre genérico)
        // Crearemos el gasto sin vincularlo a un ID de categoría específico si no lo tenemos a mano,
        // ¿o confiamos en que el componente lo pase?
        // Vamos a crear un gasto "Pago Deuda".
        await tx.expense.create({
            data: {
                name: `Pago Préstamo: ${loan.name}`,
                amount: amount,
                category: "Deudas", // Campo de cadena heredado
                isRecurring: false,
                isOneTime: true,
                paymentMethod: "TRANSFER",
                profileId: loan.profileId,
                accountId: sourceAccountId
            }
        });
    });

    revalidatePath('/budget');
}
