'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';

// Helper functions for serialization
const toNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return val.toNumber();
    }
    return Number(val);
};

const toNumOrNull = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return val.toNumber();
    }
    return Number(val);
};

function serializeCreditCard(card: any) {
    return {
        ...card,
        limit: toNum(card.limit),
        balance: toNum(card.balance),
        interestRate: toNumOrNull(card.interestRate),
        annualFee: toNumOrNull(card.annualFee),
        minPaymentPercentage: toNumOrNull(card.minPaymentPercentage),
        insuranceRate: toNumOrNull(card.insuranceRate)
    };
}

// --- PROFILES ---
export async function getProfiles() {
    const profiles = await prisma.profile.findMany({
        include: {
            expenses: true,
            goals: true,
            accounts: true,
            creditCards: true,
            incomes: true,
            salaries: true,
            loans: true,
            categories: true
        },
        orderBy: { createdAt: 'asc' }
    });

    return profiles.map(p => ({
        ...p,
        expenses: p.expenses.map(e => ({ ...e, amount: toNum(e.amount) })),
        goals: p.goals.map(g => ({
            ...g,
            targetAmount: toNum(g.targetAmount),
            currentAmount: toNum(g.currentAmount),
            contributionAmount: toNumOrNull(g.contributionAmount)
        })),
        accounts: p.accounts.map(a => ({ ...a, balance: toNum(a.balance) })),
        incomes: p.incomes.map(i => ({ ...i, amount: toNum(i.amount) })),
        salaries: p.salaries.map(s => ({
            ...s,
            grossVal: toNum(s.grossVal),
            netVal: toNum(s.netVal),
            taxes: toNum(s.taxes),
            socialSec: toNum(s.socialSec),
            eduIns: toNum(s.eduIns),
            incomeTax: toNum(s.incomeTax),
            bonus: toNum(s.bonus)
        })),
        creditCards: p.creditCards.map(c => serializeCreditCard(c)),
        loans: p.loans.map(l => ({
            ...l,
            totalAmount: toNum(l.totalAmount),
            currentBalance: toNum(l.currentBalance),
            interestRate: toNumOrNull(l.interestRate),
            monthlyPayment: toNumOrNull(l.monthlyPayment)
        })),
        categories: p.categories.map(c => ({
            ...c,
            monthlyLimit: toNumOrNull(c.monthlyLimit),
            rolloverBalance: toNum(c.rolloverBalance)
        }))
    }));
}

export async function getGlobalStats() {
    const [profilesCount, totalMoney, totalDebt, totalExpenses] = await prisma.$transaction([
        prisma.profile.count(),
        prisma.account.aggregate({ _sum: { balance: true } }),
        prisma.loan.aggregate({ _sum: { currentBalance: true } }),
        prisma.expense.aggregate({ _sum: { amount: true } })
    ]);

    const creditCardBalances = await prisma.creditCard.aggregate({ _sum: { balance: true } });

    return {
        users: profilesCount,
        money: toNum(totalMoney._sum.balance),
        debt: toNum(totalDebt._sum.currentBalance) + toNum(creditCardBalances._sum.balance),
        expenses: toNum(totalExpenses._sum.amount)
    };
}

export async function getProfileById(id: number) {
    const profile = await prisma.profile.findUnique({
        where: { id },
        include: {
            expenses: true,
            goals: true,
            accounts: true,
            incomes: true,
            salaries: true,
            creditCards: true,
            loans: true,
            categories: true
        }
    });

    if (!profile) return null;

    return {
        ...profile,
        expenses: profile.expenses.map(e => ({ ...e, amount: toNum(e.amount) })),
        goals: profile.goals.map(g => ({
            ...g,
            targetAmount: toNum(g.targetAmount),
            currentAmount: toNum(g.currentAmount),
            contributionAmount: toNumOrNull(g.contributionAmount)
        })),
        accounts: profile.accounts.map(a => ({ ...a, balance: toNum(a.balance) })),
        incomes: profile.incomes.map(i => ({ ...i, amount: toNum(i.amount) })),
        salaries: profile.salaries.map(s => ({
            ...s,
            grossVal: toNum(s.grossVal),
            netVal: toNum(s.netVal),
            taxes: toNum(s.taxes),
            socialSec: toNum(s.socialSec),
            eduIns: toNum(s.eduIns),
            incomeTax: toNum(s.incomeTax),
            bonus: toNum(s.bonus)
        })),
        creditCards: profile.creditCards.map(c => serializeCreditCard(c)),
        loans: profile.loans.map(l => ({
            ...l,
            totalAmount: toNum(l.totalAmount),
            currentBalance: toNum(l.currentBalance),
            interestRate: toNumOrNull(l.interestRate),
            monthlyPayment: toNumOrNull(l.monthlyPayment)
        })),
        categories: profile.categories.map(c => ({
            ...c,
            monthlyLimit: toNumOrNull(c.monthlyLimit),
            rolloverBalance: toNum(c.rolloverBalance)
        }))
    };
}

export async function createProfile(name: string) {
    const profile = await prisma.profile.create({
        data: { name }
    });
    await logAction('CREATE_PROFILE', `Nombre: ${name}`, profile.id);
    revalidatePath('/budget');
}

export async function deleteProfile(id: number) {
    await prisma.$transaction(async (tx) => {
        await tx.expense.deleteMany({ where: { profileId: id } });
        await tx.additionalIncome.deleteMany({ where: { profileId: id } });
        await tx.salary.deleteMany({ where: { profileId: id } });
        await tx.goal.deleteMany({ where: { profileId: id } });
        await tx.creditCard.deleteMany({ where: { profileId: id } });
        await tx.category.deleteMany({ where: { profileId: id } });
        await tx.loan.deleteMany({ where: { profileId: id } });

        const userAccounts = await tx.account.findMany({ where: { profileId: id }, select: { id: true } });
        const accountIds = userAccounts.map(a => a.id);

        if (accountIds.length > 0) {
            await tx.transfer.deleteMany({
                where: {
                    OR: [
                        { sourceAccountId: { in: accountIds } },
                        { destinationAccountId: { in: accountIds } }
                    ]
                }
            });
            await tx.account.deleteMany({ where: { id: { in: accountIds } } });
        }

        await tx.profile.delete({ where: { id } });
    });
    await logAction('DELETE_PROFILE', `Perfil ID: ${id} eliminado`, id);
    revalidatePath('/budget');
}

export async function resetProfileData(id: number) {
    await prisma.$transaction(async (tx) => {
        // 1. Delete Dependencies First (Transactions)
        await tx.expense.deleteMany({ where: { profileId: id } });
        await tx.additionalIncome.deleteMany({ where: { profileId: id } });
        await tx.salary.deleteMany({ where: { profileId: id } });
        await tx.transfer.deleteMany({
            where: {
                OR: [
                    { sourceAccount: { profileId: id } },
                    { destinationAccount: { profileId: id } }
                ]
            }
        });

        // 2. Delete Financial Items
        await tx.goal.deleteMany({ where: { profileId: id } });
        await tx.loan.deleteMany({ where: { profileId: id } });
        await tx.creditCard.deleteMany({ where: { profileId: id } });

        // 3. Delete Accounts (This was missing before)
        await tx.account.deleteMany({ where: { profileId: id } });

        // 4. Delete Categories (Optional, but "Hard Reset" usually implies starting fresh)
        // We will keep standard categories if they are seeded, but here we likely have custom ones.
        // Let's delete ALL categories for this profile to be safe.
        await tx.category.deleteMany({ where: { profileId: id } });
    });
    await logAction('RESET_DATA_FULL', `Hard Reset de datos para perfil ${id}`, id);
    revalidatePath('/budget');
}

// --- ACCOUNTS ---
export async function createAccount(name: string, type: string, balance: number, profileId: number, lockDate?: Date) {
    if (balance < 0) throw new Error("El saldo no puede ser negativo");
    const account = await prisma.account.create({
        data: { name, type, balance, profileId, lockDate }
    });
    revalidatePath('/budget');
    return { ...account, balance: toNum(account.balance) };
}

export async function adjustAccountBalance(accountId: number, newBalance: number, reason: string) {
    await prisma.account.update({
        where: { id: accountId },
        data: { balance: newBalance }
    });
    revalidatePath('/budget');
}

export async function getAccountTransactions(accountId: number) {
    const [expenses, incomes, transfersFrom, transfersTo, salaries] = await prisma.$transaction([
        prisma.expense.findMany({ where: { accountId }, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.additionalIncome.findMany({ where: { accountId }, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.transfer.findMany({ where: { sourceAccountId: accountId }, orderBy: { date: 'desc' }, take: 50, include: { destinationAccount: true } }),
        prisma.transfer.findMany({ where: { destinationAccountId: accountId }, orderBy: { date: 'desc' }, take: 50, include: { sourceAccount: true } }),
        prisma.salary.findMany({ where: { accountId }, orderBy: { createdAt: 'desc' }, take: 50 })
    ]);

    const transactions = [
        ...expenses.map(e => ({ ...e, amount: toNum(e.amount), type: 'EXPENSE', date: e.createdAt })),
        ...incomes.map(i => ({ ...i, amount: toNum(i.amount), type: 'INCOME', date: i.createdAt })),
        ...transfersFrom.map(t => ({ ...t, amount: toNum(t.amount), type: 'TRANSFER_OUT', date: t.date, relatedAccountName: t.destinationAccount.name })),
        ...transfersTo.map(t => ({ ...t, amount: toNum(t.amount), type: 'TRANSFER_IN', date: t.date, relatedAccountName: t.sourceAccount.name })),
        ...salaries.map(s => ({ ...s, amount: toNum(s.netVal), type: 'SALARY', date: s.createdAt, name: 'Salario' }))
    ];

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// --- TRANSFERS ---
export async function createTransfer(sourceAccountId: number, destinationAccountId: number, amount: number, description?: string) {
    if (sourceAccountId === destinationAccountId) throw new Error("No puedes transferir a la misma cuenta");

    const sourceAccount = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!sourceAccount || Number(sourceAccount.balance) < amount) {
        throw new Error("Fondos insuficientes en la cuenta origen");
    }

    // CHECK FOR LOCK
    if (sourceAccount.lockDate && new Date(sourceAccount.lockDate) > new Date()) {
        throw new Error(`Cuenta bloqueada hasta ${sourceAccount.lockDate.toLocaleDateString()}`);
    }

    await prisma.$transaction(async (tx) => {
        await tx.account.update({
            where: { id: sourceAccountId },
            data: { balance: { decrement: amount } }
        });

        await tx.account.update({
            where: { id: destinationAccountId },
            data: { balance: { increment: amount } }
        });

        await tx.transfer.create({
            data: {
                amount,
                sourceAccountId,
                destinationAccountId,
                description,
                date: new Date()
            }
        });
    });

    revalidatePath('/budget');
}

export async function deleteAccount(id: number): Promise<void> {
    const account = await prisma.account.findUnique({ where: { id } });
    if (account?.name === 'Efectivo' && account.isDefault) {
        throw new Error("No se puede eliminar la cuenta principal de Efectivo.");
    }

    await prisma.$transaction(async (tx) => {
        await tx.expense.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.additionalIncome.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.salary.updateMany({ where: { accountId: id }, data: { accountId: null } });
        // Transfers
        await tx.transfer.deleteMany({
            where: { OR: [{ sourceAccountId: id }, { destinationAccountId: id }] }
        });
        await tx.account.delete({ where: { id } });
    });

    revalidatePath('/budget');
}

// --- EXPENSES ---
interface CreateExpenseInput {
    name: string;
    amount: number;
    category: string;
    profileId: number;
    dueDate?: number;
    isRecurring?: boolean;
    isOneTime?: boolean;
    paymentMethod?: string;
    linkedCardId?: number;
    accountId?: number;
    categoryId?: number;
    date?: Date | string; // New field for backdating
}

export async function createExpense(data: CreateExpenseInput) {
    // CHECK FOR LOCK
    if (data.accountId) {
        const account = await prisma.account.findUnique({ where: { id: data.accountId } });
        if (account && account.lockDate && new Date(account.lockDate) > new Date()) {
            throw new Error(`Cuenta bloqueada hasta ${account.lockDate.toLocaleDateString()}`);
        }
    }

    const expense = await prisma.expense.create({
        data: {
            name: data.name,
            amount: data.amount,
            category: data.category,
            profileId: data.profileId,
            dueDate: data.dueDate,
            isRecurring: data.isRecurring ?? true,
            isOneTime: data.isOneTime ?? false,
            paymentMethod: data.paymentMethod,
            linkedCardId: data.linkedCardId,
            accountId: data.accountId,
            categoryId: data.categoryId,
            createdAt: data.date ? new Date(data.date) : undefined // Allow backdating
        }
    });

    if (data.linkedCardId) {
        await prisma.creditCard.update({
            where: { id: data.linkedCardId },
            data: { balance: { increment: data.amount } }
        });
    }

    if (data.accountId) {
        await prisma.account.update({
            where: { id: data.accountId },
            data: { balance: { decrement: data.amount } }
        });
    }

    revalidatePath('/budget');
    return { ...expense, amount: toNum(expense.amount) };
}

export async function deleteExpense(id: number): Promise<void> {
    const expense = await prisma.expense.findUnique({ where: { id } });

    if (expense) {
        if (expense.accountId) {
            await prisma.account.update({
                where: { id: expense.accountId },
                data: { balance: { increment: expense.amount } }
            });
        }

        if (expense.linkedCardId) {
            await prisma.creditCard.update({
                where: { id: expense.linkedCardId },
                data: { balance: { decrement: expense.amount } }
            });
        }
    }

    await prisma.expense.delete({ where: { id } });
    revalidatePath('/budget');
}

// --- GOALS ---
interface CreateGoalInput {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: Date;
    profileId: number;
    type: string;
    frequency?: string;
    contributionAmount?: number;
    priority?: string;
    sourceAccountId?: number;
}

export async function createGoal(data: CreateGoalInput) {
    const goal = await prisma.goal.create({
        data: {
            name: data.name,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount ?? 0,
            deadline: data.deadline,
            profileId: data.profileId,
            type: data.type,
            frequency: data.frequency,
            contributionAmount: data.contributionAmount,
            priority: data.priority,
            sourceAccountId: data.sourceAccountId
        }
    });
    revalidatePath('/budget');
    return {
        ...goal,
        targetAmount: toNum(goal.targetAmount),
        currentAmount: toNum(goal.currentAmount),
        contributionAmount: toNumOrNull(goal.contributionAmount)
    };
}

export async function updateGoal(id: number, data: Partial<CreateGoalInput>) {
    const goal = await prisma.goal.update({
        where: { id },
        data: {
            name: data.name,
            targetAmount: data.targetAmount,
            deadline: data.deadline,
            type: data.type,
            frequency: data.frequency,
            contributionAmount: data.contributionAmount,
            priority: data.priority,
            sourceAccountId: data.sourceAccountId
        }
    });
    revalidatePath('/budget');
    return {
        ...goal,
        targetAmount: toNum(goal.targetAmount),
        currentAmount: toNum(goal.currentAmount),
        contributionAmount: toNumOrNull(goal.contributionAmount)
    };
}

export async function deleteGoal(id: number): Promise<void> {
    await prisma.goal.delete({ where: { id } });
    revalidatePath('/budget');
}

export async function deleteGoalWithReclaim(id: number, targetAccountId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const goal = await tx.goal.findUnique({ where: { id } });
        if (!goal) throw new Error("Meta no encontrada");

        if (Number(goal.currentAmount) > 0) {
            await tx.account.update({
                where: { id: targetAccountId },
                data: { balance: { increment: goal.currentAmount } }
            });

            await tx.additionalIncome.create({
                data: {
                    name: `Retiro por Cierre de Meta: ${goal.name}`,
                    amount: goal.currentAmount,
                    type: 'ONE_TIME',
                    profileId: goal.profileId,
                    accountId: targetAccountId
                }
            });
        }

        await tx.goal.delete({ where: { id } });
    });
    revalidatePath('/budget');
}

export async function handleGoalTransaction(goalId: number, amount: number, type: 'DEPOSIT' | 'WITHDRAW', accountId?: number) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error("Meta no encontrada");

    if (type === 'DEPOSIT') {
        const sourceAccountId = accountId || goal.sourceAccountId;
        if (!sourceAccountId) throw new Error("Se requiere una cuenta de origen.");

        const account = await prisma.account.findUnique({ where: { id: sourceAccountId } });
        if (!account) throw new Error("Cuenta no encontrada.");
        if (Number(account.balance) < amount) throw new Error(`Fondos insuficientes.`);

        // CHECK FOR LOCK
        if (account.lockDate && new Date(account.lockDate) > new Date()) {
            throw new Error(`Cuenta bloqueada hasta ${account.lockDate.toLocaleDateString()}`);
        }

        await prisma.account.update({
            where: { id: sourceAccountId },
            data: { balance: { decrement: amount } }
        });

        await prisma.expense.create({
            data: {
                name: `Aporte Meta: ${goal.name}`,
                amount: amount,
                category: 'Ahorro',
                profileId: goal.profileId,
                isRecurring: false,
                isOneTime: true,
                accountId: sourceAccountId
            }
        });
    } else {
        if (Number(goal.currentAmount) < amount) throw new Error("No puedes retirar más de lo ahorrado.");

        const destAccountId = accountId;
        if (!destAccountId) throw new Error("Debes seleccionar una cuenta de destino.");

        await prisma.account.update({
            where: { id: destAccountId },
            data: { balance: { increment: amount } }
        });

        await prisma.additionalIncome.create({
            data: {
                name: `Retiro Meta: ${goal.name}`,
                amount: amount,
                type: 'ONE_TIME',
                profileId: goal.profileId,
                accountId: destAccountId
            }
        });
    }

    const newAmount = type === 'DEPOSIT' ? Number(goal.currentAmount) + amount : Number(goal.currentAmount) - amount;

    const updatedGoal = await prisma.goal.update({
        where: { id: goalId },
        data: { currentAmount: newAmount }
    });

    revalidatePath('/budget');
    return {
        ...updatedGoal,
        targetAmount: toNum(updatedGoal.targetAmount),
        currentAmount: toNum(updatedGoal.currentAmount),
        contributionAmount: toNumOrNull(updatedGoal.contributionAmount)
    };
}

// --- CATEGORY ACTIONS (BUDGET) ---

export async function updateCategoryLimit(categoryId: number, limit: number) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: { monthlyLimit: limit }
        });
        revalidatePath('/budget');
        return { success: true };
    } catch (error) {
        console.error('Error updating limit:', error);
        return { success: false, error: 'Failed to update limit' };
    }
}

export async function toggleCategoryRollover(categoryId: number, isRollover: boolean) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: { isRollover }
        });
        revalidatePath('/budget');
        return { success: true };
    } catch (error) {
        console.error('Error toggling rollover:', error);
        return { success: false, error: 'Failed to toggle rollover' };
    }
}

export async function updateCategoryRolloverBalance(categoryId: number, balance: number) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: { rolloverBalance: balance }
        });
        revalidatePath('/budget');
        return { success: true };
    } catch (error) {
        console.error('Error updating rollover balance:', error);
        return { success: false, error: 'Failed to update rollover balance' };
    }
}

// --- INCOMES ---
interface CreateIncomeInput {
    name: string;
    amount: number;
    type: string;
    frequency?: string;
    durationMonths?: number;
    profileId: number;
    accountId?: number;
    icon?: string;
}

export async function createIncome(data: CreateIncomeInput) {
    return await prisma.$transaction(async (tx) => {
        const income = await tx.additionalIncome.create({
            data: {
                name: data.name,
                amount: data.amount,
                type: data.type,
                frequency: data.frequency,
                durationMonths: data.durationMonths,
                profileId: data.profileId,
                accountId: data.accountId,
                icon: data.icon
            }
        });

        if (data.accountId) {
            await tx.account.update({
                where: { id: data.accountId },
                data: { balance: { increment: data.amount } }
            });
        }

        return { ...income, amount: toNum(income.amount) };
    });
}

export async function deleteIncome(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const income = await tx.additionalIncome.findUnique({ where: { id } });

        if (income) {
            if (income.accountId) {
                await tx.account.update({
                    where: { id: income.accountId },
                    data: { balance: { decrement: income.amount } }
                });
            }

            await tx.additionalIncome.delete({ where: { id } });
        }
    });

    revalidatePath('/budget');
}

// --- CREDIT CARDS ---
interface CreateCreditCardInput {
    name: string;
    limit: number;
    cutoffDay: number;
    paymentDay: number;
    profileId: number;
    interestRate?: number;
    annualFee?: number;
    annualFeeMonth?: number;
    minPaymentPercentage?: number;
    insuranceRate?: number;
    initialBalance?: number;
}

export async function createCreditCard(data: CreateCreditCardInput) {
    const card = await prisma.creditCard.create({
        data: {
            name: data.name,
            limit: data.limit,
            cutoffDay: data.cutoffDay,
            paymentDay: data.paymentDay,
            profileId: data.profileId,
            interestRate: data.interestRate,
            annualFee: data.annualFee,
            annualFeeMonth: data.annualFeeMonth,
            minPaymentPercentage: data.minPaymentPercentage,
            insuranceRate: data.insuranceRate,
            balance: data.initialBalance ?? 0
        }
    });
    revalidatePath('/budget');
    return serializeCreditCard(card);
}

export async function deleteCreditCard(id: number) {
    await prisma.creditCard.delete({ where: { id } });
    revalidatePath('/budget');
}

export async function updateCreditCardBalance(id: number, balance: number) {
    const card = await prisma.creditCard.update({
        where: { id },
        data: { balance }
    });
    revalidatePath('/budget');
    return serializeCreditCard(card);
}

export async function updateCreditCardDetails(id: number, data: Partial<CreateCreditCardInput>) {
    const card = await prisma.creditCard.update({
        where: { id },
        data: {
            name: data.name,
            limit: data.limit,
            cutoffDay: data.cutoffDay,
            paymentDay: data.paymentDay,
            interestRate: data.interestRate,
            annualFee: data.annualFee,
            annualFeeMonth: data.annualFeeMonth,
            minPaymentPercentage: data.minPaymentPercentage,
            insuranceRate: data.insuranceRate
        }
    });

    revalidatePath('/budget');
    return serializeCreditCard(card);
}

export async function payCreditCard(cardId: number, amount: number, accountId: number) {
    if (amount <= 0) throw new Error("Monto debe ser positivo");

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error("Cuenta no encontrada");
    if (Number(account.balance) < amount) throw new Error("Fondos insuficientes");

    await prisma.$transaction(async (tx) => {
        // 1. Deducir de cuenta
        await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } }
        });

        // 2. Reducir balance (deuda) tarjeta
        const updatedCard = await tx.creditCard.update({
            where: { id: cardId },
            data: { balance: { decrement: amount } }
        });

        // 3. Registrar Gasto
        const card = await tx.creditCard.findUnique({ where: { id: cardId } });

        // Buscar/Crear categoria
        let cat = await tx.category.findFirst({ where: { profileId: account.profileId, name: "Pagos Tarjeta" } });
        if (!cat) {
            cat = await tx.category.create({
                data: {
                    name: "Pagos Tarjeta",
                    icon: "CreditCard",
                    profileId: account.profileId,
                    type: "FIXED",
                    color: "zinc"
                }
            });
        }

        await tx.expense.create({
            data: {
                name: `Pago: ${card?.name || 'Tarjeta'}`,
                amount: amount,
                category: "Pagos Tarjeta",
                categoryId: cat.id,
                profileId: account.profileId,
                accountId: accountId,
                isOneTime: true,
                isRecurring: false,
                paymentMethod: "TRANSFER"
            }
        });
    });

    revalidatePath('/budget');
}



// --- UNIVERSAL UPDATE ACTIONS ---

export async function updateExpense(id: number, data: Partial<CreateExpenseInput>) {
    // 1. Get old expense to revert impact
    const oldExpense = await prisma.expense.findUnique({ where: { id } });
    if (!oldExpense) throw new Error("Gasto no encontrado");

    await prisma.$transaction(async (tx) => {
        // Revert old impact
        if (oldExpense.accountId) {
            await tx.account.update({
                where: { id: oldExpense.accountId },
                data: { balance: { increment: oldExpense.amount } }
            });
        }
        if (oldExpense.linkedCardId) {
            await tx.creditCard.update({
                where: { id: oldExpense.linkedCardId },
                data: { balance: { decrement: oldExpense.amount } }
            });
        }

        // Apply new impact (if account/card/amount Changed)
        // We just re-apply the new (or same) values.
        // If data.amount is missing, use oldExpense.amount
        const newAmount = data.amount !== undefined ? data.amount : Number(oldExpense.amount);
        const newAccountId = data.accountId !== undefined ? data.accountId : oldExpense.accountId;
        const newCardId = data.linkedCardId !== undefined ? data.linkedCardId : oldExpense.linkedCardId;

        if (newAccountId) {
            await tx.account.update({
                where: { id: newAccountId },
                data: { balance: { decrement: newAmount } }
            });
        }
        if (newCardId) {
            await tx.creditCard.update({
                where: { id: newCardId },
                data: { balance: { increment: newAmount } }
            });
        }

        // Update Expense Record
        await tx.expense.update({
            where: { id },
            data: {
                name: data.name,
                amount: newAmount,
                category: data.category,
                dueDate: data.dueDate,
                isRecurring: data.isRecurring,
                paymentMethod: data.paymentMethod,
                linkedCardId: newCardId,
                accountId: newAccountId,
                categoryId: data.categoryId,
                createdAt: data.date ? new Date(data.date) : undefined
            }
        });
    });

    revalidatePath('/budget');
}

export async function updateIncome(id: number, data: Partial<CreateIncomeInput>) {
    const oldIncome = await prisma.additionalIncome.findUnique({ where: { id } });
    if (!oldIncome) throw new Error("Ingreso no encontrado");

    await prisma.$transaction(async (tx) => {
        // Revert old impact
        if (oldIncome.accountId) {
            await tx.account.update({
                where: { id: oldIncome.accountId },
                data: { balance: { decrement: oldIncome.amount } }
            });
        }

        // Apply new impact
        const newAmount = data.amount !== undefined ? data.amount : Number(oldIncome.amount);
        const newAccountId = data.accountId !== undefined ? data.accountId : oldIncome.accountId;

        if (newAccountId) {
            await tx.account.update({
                where: { id: newAccountId },
                data: { balance: { increment: newAmount } }
            });
        }

        await tx.additionalIncome.update({
            where: { id },
            data: {
                name: data.name,
                amount: newAmount,
                type: data.type,
                frequency: data.frequency,
                accountId: newAccountId,
                icon: data.icon
            }
        });
    });
    revalidatePath('/budget');
}

export async function updateAccount(id: number, data: { name?: string; type?: string; balance?: number; lockDate?: Date }) {
    if (data.balance !== undefined && data.balance < 0) throw new Error("El saldo no puede ser negativo");
    await prisma.account.update({
        where: { id },
        data: {
            name: data.name,
            type: data.type,
            balance: data.balance,
            lockDate: data.lockDate
        }
    });
    revalidatePath('/budget');
}


