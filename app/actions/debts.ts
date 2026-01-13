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
        // 1. Deduct from Source Account
        await tx.account.update({
            where: { id: sourceAccountId },
            data: { balance: { decrement: amount } }
        });

        // 2. Reduce Loan Balance
        // We fetch first to check if it's already 0? Not strictly necessary but good for validation.
        // For now, straightforward update.
        const loan = await tx.loan.update({
            where: { id: loanId },
            data: { currentBalance: { decrement: amount } }
        });

        // 3. Record Expense (Optimization: Check if 'Deudas' category exists? Or just use a generic name)
        // We'll just create the expense without tying to a specific category ID if we don't have it handy, 
        // or we rely on the component to pass it? 
        // Let's create a "Pago Deuda" expense.
        await tx.expense.create({
            data: {
                name: `Pago Préstamo: ${loan.name}`,
                amount: amount,
                category: "Deudas", // Legacy String field
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
