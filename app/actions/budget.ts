'use server';

import { Expense, Goal, Profile, AdditionalIncome, Salary, CreditCard, Account, Loan, Category } from "@prisma/client";
import { prisma } from '@/lib/prisma';
import { revalidatePath } from "next/cache";

// --- PROFILES ---
export async function createProfile(name: string): Promise<Profile> {
    // Verificar si existen perfiles
    const count = await prisma.profile.count();

    // El primer perfil es ADMIN, los demás son USUARIO
    const role = count === 0 ? 'ADMIN' : 'USER';

    const profile = await prisma.profile.create({
        data: {
            name,
            role,
            accounts: {
                create: {
                    name: "Efectivo",
                    type: "CASH",
                    balance: 0,
                    currency: "USD",
                    isDefault: true
                }
            }
        }
    });
    revalidatePath('/budget');
    return profile;
}

export async function getProfiles(): Promise<(Profile & { expenses: (Expense & { categoryRel?: Category | null })[], goals: Goal[], incomes: AdditionalIncome[], salaries: Salary[], creditCards: CreditCard[], accounts: Account[], categories: Category[] })[]> {
    return await prisma.profile.findMany({
        include: {
            expenses: {
                include: {
                    categoryRel: true
                }
            },
            goals: true,
            incomes: true,
            salaries: true,
            creditCards: true,
            loans: true,
            accounts: true,
            categories: true
        }
    });
}

export async function deleteProfile(id: number): Promise<void> {
    await prisma.$transaction([
        prisma.expense.deleteMany({ where: { profileId: id } }),
        prisma.goal.deleteMany({ where: { profileId: id } }),
        prisma.salary.deleteMany({ where: { profileId: id } }),
        prisma.additionalIncome.deleteMany({ where: { profileId: id } }),
        prisma.creditCard.deleteMany({ where: { profileId: id } }),
        prisma.loan.deleteMany({ where: { profileId: id } }), // Eliminación de nuevos préstamos
        prisma.account.deleteMany({ where: { profileId: id } }), // Eliminación de cuentas agregada
        prisma.category.deleteMany({ where: { profileId: id } }), // Corrección: Eliminar categorías antes del perfil
        prisma.profile.delete({ where: { id } })
    ]);
    revalidatePath('/budget');
}

// --- ACCOUNTS ---
export async function createAccount(name: string, type: string, balance: number, profileId: number): Promise<Account> {
    const account = await prisma.account.create({
        data: {
            name,
            type,
            balance,
            profileId
        }
    });
    revalidatePath('/budget');
    return account;
    revalidatePath('/budget');
    return account;
}

export async function adjustAccountBalance(accountId: number, newBalance: number, reason: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error("Cuenta no encontrada");

    const difference = newBalance - account.balance;
    if (difference === 0) return; // Sin cambios

    // Crear un registro de ajuste (¿Transferencia de tipo AJUSTE? ¿O solo un Gasto/Ingreso?)
    // Usaremos Gasto/Ingreso por ahora para rastrear por qué cambió el saldo en los reportes.
    // Si la diferencia > 0 (Excedente) -> Ingreso
    // Si la diferencia < 0 (Déficit) -> Gasto

    // Modificación: Solo actualizar el saldo sin generar registros de Gasto/Ingreso
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

    // Normalizar y fusionar
    const transactions = [
        ...expenses.map(e => ({ ...e, type: 'EXPENSE', date: e.createdAt })),
        ...incomes.map(i => ({ ...i, type: 'INCOME', date: i.createdAt })),
        ...transfersFrom.map(t => ({ ...t, type: 'TRANSFER_OUT', date: t.date, relatedAccountName: t.destinationAccount.name })),
        ...transfersTo.map(t => ({ ...t, type: 'TRANSFER_IN', date: t.date, relatedAccountName: t.sourceAccount.name })),
        ...salaries.map(s => ({ ...s, type: 'SALARY', date: s.createdAt, amount: s.netVal, name: 'Salario' }))
    ];

    // Ordenar por fecha desc
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// --- TRANSFERS ---
export async function createTransfer(sourceAccountId: number, destinationAccountId: number, amount: number, description?: string) {
    if (sourceAccountId === destinationAccountId) {
        throw new Error("No puedes transferir a la misma cuenta");
    }

    const sourceAccount = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!sourceAccount || sourceAccount.balance < amount) {
        throw new Error("Fondos insuficientes en la cuenta origen");
    }

    await prisma.$transaction(async (tx) => {
        // 1. Descontar de Origen
        await tx.account.update({
            where: { id: sourceAccountId },
            data: { balance: { decrement: amount } }
        });

        // 2. Sumar a Destino
        await tx.account.update({
            where: { id: destinationAccountId },
            data: { balance: { increment: amount } }
        });

        // 3. Registrar Transferencia
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
    if (account?.name === 'Efectivo' || account?.type === 'CASH') {
        // ¿Permitir eliminar EFECTIVO solo si no es el predeterminado llamado "Efectivo"? 
        // El usuario dijo "la cuenta de efectivo". Seguro proteger el nombre "Efectivo" específicamente.
        if (account.name === 'Efectivo') {
            throw new Error("No se puede eliminar la cuenta principal de Efectivo.");
        }
    }

    // Transacción para desvincular registros relacionados de forma segura antes de la eliminación
    await prisma.$transaction(async (tx) => {
        // Desvincular Gastos
        await tx.expense.updateMany({
            where: { accountId: id },
            data: { accountId: null }
        });

        // Desvincular Ingresos
        await tx.additionalIncome.updateMany({
            where: { accountId: id },
            data: { accountId: null }
        });

        // Desvincular Salarios
        await tx.salary.updateMany({
            where: { accountId: id },
            data: { accountId: null }
        });

        // Nota: Para Metas, actualmente no guardamos accountId persistentemente en la Meta, 
        // solo en la transacción (Gasto/Ingreso) generada, así que desvincular Gastos/Ingresos lo cubre.
        // Pero espera, ¿verificación de esquema para Meta? No hay accountId en el modelo Meta en la vista de esquema.

        // Eliminar la Cuenta
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
    // Nuevos campos
    isOneTime?: boolean;
    paymentMethod?: string;
    linkedCardId?: number;
    accountId?: number;
    categoryId?: number; // Agregado
}

export async function createExpense(data: CreateExpenseInput): Promise<Expense> {
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
            categoryId: data.categoryId // Mapeado
        }
    });

    // Si el gasto está vinculado a una tarjeta, actualizamos la deuda
    if (data.linkedCardId) {
        await prisma.creditCard.update({
            where: { id: data.linkedCardId },
            data: {
                balance: {
                    increment: data.amount
                }
            }
        });
    }

    // Si el gasto está vinculado a una cuenta (Débito/Efectivo), restamos del saldo
    if (data.accountId) {
        await prisma.account.update({
            where: { id: data.accountId },
            data: {
                balance: {
                    decrement: data.amount
                }
            }
        });
    }

    revalidatePath('/budget');
    return expense;
}

export async function deleteExpense(id: number): Promise<void> {
    // 1. Obtener el gasto antes de borrarlo
    const expense = await prisma.expense.findUnique({ where: { id } });

    if (expense) {
        // 2. Si estaba vinculado a una cuenta (Débito/Efectivo), DEVOLVEMOS el dinero al saldo
        if (expense.accountId) {
            await prisma.account.update({
                where: { id: expense.accountId },
                data: {
                    balance: {
                        increment: expense.amount // Devolvemos lo que se gastó
                    }
                }
            });
        }

        // 3. Si estaba vinculado a una tarjeta, RESTAMOS de la deuda
        if (expense.linkedCardId) {
            await prisma.creditCard.update({
                where: { id: expense.linkedCardId },
                data: {
                    balance: {
                        decrement: expense.amount // Reducimos la deuda porque se borró el gasto
                    }
                }
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
    type: string; // "FIXED" | "VARIABLE"
    frequency?: string;
    contributionAmount?: number;
    priority?: string;
    sourceAccountId?: number; // Agregado
}

export async function createGoal(data: CreateGoalInput): Promise<Goal> {
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
    return goal;
}

export async function updateGoal(id: number, data: Partial<CreateGoalInput>): Promise<Goal> {
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
    return goal;
}

export async function deleteGoal(id: number): Promise<void> {
    await prisma.goal.delete({ where: { id } });
    revalidatePath('/budget');
}

export async function deleteGoalWithReclaim(id: number, targetAccountId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const goal = await tx.goal.findUnique({ where: { id } });
        if (!goal) throw new Error("Meta no encontrada");

        if (goal.currentAmount > 0) {
            // 1. Mover fondos a la cuenta destino
            await tx.account.update({
                where: { id: targetAccountId },
                data: { balance: { increment: goal.currentAmount } }
            });

            // 2. Registrar el ingreso
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

        // 3. Eliminar la meta
        await tx.goal.delete({ where: { id } });
    });
    revalidatePath('/budget');
}

export async function handleGoalTransaction(goalId: number, amount: number, type: 'DEPOSIT' | 'WITHDRAW', accountId?: number): Promise<Goal> {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error("Meta no encontrada");

    // VALIDACIÓN ESTRICTA: Depósito requiere fondearse de una cuenta con saldo
    if (type === 'DEPOSIT') {
        // Determinamos cuenta origen: argumento explícito O cuenta vinculada a la meta
        const sourceAccountId = accountId || goal.sourceAccountId;

        if (!sourceAccountId) {
            throw new Error("Se requiere una cuenta de origen para depositar a la meta.");
        }

        const account = await prisma.account.findUnique({ where: { id: sourceAccountId } });
        if (!account) throw new Error("Cuenta de origen no encontrada.");

        if (account.balance < amount) {
            throw new Error(`Fondos insuficientes en ${account.name}. Saldo: $${account.balance.toFixed(2)}`);
        }

        // Si pasa la validación, procedemos
        // 1. Descontar de la cuenta
        await prisma.account.update({
            where: { id: sourceAccountId },
            data: { balance: { decrement: amount } }
        });

        // 2. Registrar el movimiento (Gasto visual para tracking)
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
        // WITHDRAW (Retiro de Meta -> Cuenta)
        // Validar que la meta tenga fondos
        if (goal.currentAmount < amount) {
            throw new Error("No puedes retirar más de lo ahorrado en la meta.");
        }

        const destAccountId = accountId; // Para retiro SIEMPRE debe ser explícito a dónde va
        if (!destAccountId) {
            throw new Error("Debes seleccionar una cuenta de destino para los fondos retirados.");
        }

        // 1. Sumar a la cuenta destino
        await prisma.account.update({
            where: { id: destAccountId },
            data: { balance: { increment: amount } }
        });

        // 2. Registrar movimiento (Ingreso visual)
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

    const newAmount = type === 'DEPOSIT' ? goal.currentAmount + amount : goal.currentAmount - amount;

    // Actualizar Saldo Meta
    const updatedGoal = await prisma.goal.update({
        where: { id: goalId },
        data: { currentAmount: newAmount }
    });

    revalidatePath('/budget');
    return updatedGoal;
}

// --- INCOMES ---
interface CreateIncomeInput {
    name: string;
    amount: number;
    type: string; // "EVENTUAL" | "ONE_TIME"
    frequency?: string;
    durationMonths?: number;
    profileId: number;
    accountId?: number; // Nuevo campo
    icon?: string; // Nuevo campo para icono personalizado
}

export async function createIncome(data: CreateIncomeInput): Promise<AdditionalIncome> {
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

        // Si el ingreso está vinculado a una cuenta, sumamos al saldo
        if (data.accountId) {
            await tx.account.update({
                where: { id: data.accountId },
                data: {
                    balance: {
                        increment: data.amount
                    }
                }
            });
        }

        return income;
    });

    revalidatePath('/budget');
}

export async function deleteIncome(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
        // 1. Obtener el ingreso antes de borrarlo
        const income = await tx.additionalIncome.findUnique({ where: { id } });

        if (income) {
            // 2. Si estaba vinculado a una cuenta, RESTAMOS el dinero del saldo (Revertir deposito)
            if (income.accountId) {
                await tx.account.update({
                    where: { id: income.accountId },
                    data: {
                        balance: {
                            decrement: income.amount
                        }
                    }
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
    minPaymentPercentage?: number;
    insuranceRate?: number;
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
            minPaymentPercentage: data.minPaymentPercentage,
            insuranceRate: data.insuranceRate
        }
    });
    revalidatePath('/budget');
    return card;
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
    return card;
}

export async function payCreditCard(cardId: number, amount: number, accountId?: number) {
    // 1. Validar si hay saldo suficiente en la cuenta (Si se seleccionó una)
    if (accountId) {
        const account = await prisma.account.findUnique({ where: { id: accountId } });
        if (!account) throw new Error("Cuenta no encontrada");
        if (account.balance < amount) throw new Error("Fondos insuficientes en la cuenta seleccionada");
    }

    await prisma.$transaction(async (tx) => {
        // 2. Descontar de la cuenta (Origen)
        if (accountId) {
            await tx.account.update({
                where: { id: accountId },
                data: { balance: { decrement: amount } }
            });

            // Opcional: Registrar como Gasto tipo "Transferencia/Pago Deuda" para historial?
            // Por ahora solo movimiento de saldos para simplificar, o podríamos crear un Expense.
            // Si creamos expense, se duplica la salida? No, si el expense resta saldo. 
            // Pero aquí lo estamos haciendo manual. 
            // Vamos a dejarlo como movimiento de saldos puro para integridad "Anti-Magic".
        }

        // 3. Reducir la deuda de la tarjeta (Destino)
        await tx.creditCard.update({
            where: { id: cardId },
            data: { balance: { decrement: amount } }
        });
    });

    revalidatePath('/budget');
}

export async function resetProfileData(profileId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
        // 1. Eliminar todos los datos relacionales
        await tx.expense.deleteMany({ where: { profileId } });
        await tx.additionalIncome.deleteMany({ where: { profileId } });
        await tx.salary.deleteMany({ where: { profileId } });
        await tx.goal.deleteMany({ where: { profileId } });
        await tx.creditCard.deleteMany({ where: { profileId } });
        await tx.loan.deleteMany({ where: { profileId } });
        await tx.transfer.deleteMany({
            where: {
                OR: [
                    { sourceAccount: { profileId } },
                    { destinationAccount: { profileId } }
                ]
            }
        });

        // 2. Gestionar Cuentas
        // Eliminar todas las cuentas excepto la cuenta de EFECTIVO predeterminada
        await tx.account.deleteMany({
            where: {
                profileId,
                NOT: { type: 'CASH', isDefault: true } // Mantener efectivo predeterminado
            }
        });

        // Restablecer saldo de la(s) cuenta(s) predeterminada(s) restante(s)
        await tx.account.updateMany({
            where: { profileId },
            data: { balance: 0 }
        });

        // ¿Restablecer categorías? El usuario podría querer conservar las categorías.
        // "Limpiar la cuenta y probarla de cero" generalmente significa transacciones.
        // Vamos a eliminar datos, pero mantener Categorías ya que son configuración.
    });

    revalidatePath('/budget');
}
