'use client';

import React, { useState } from 'react';
import BudgetTable from '@/components/budgets/BudgetTable';
import BudgetCard from '@/components/budgets/BudgetCard';
import FinancialRules from '@/components/dashboard/widgets/FinancialRules';
import { formatMoney } from '@/lib/utils';
import { CreditCard, Category, Expense } from '@prisma/client';

// Extend types to match our serialization
type ExtendedCategory = Category & {
    monthlyLimit: number | null;
    isRollover: boolean;
    rolloverBalance: number;
}

interface BudgetsTabProps {
    categories: any[];
    expenses: any[];
    currency?: string;
    // New props for the rules
    totalIncome: number;
    totalDebtPayments: number;
    totalSavings: number;
    totalCash: number;
    // Date Filtering
    currentMonth: number; // 0-11
    currentYear: number;
    onUpdate?: () => void;
}

export default function BudgetsTab({ categories, expenses, currency = 'USD', totalIncome, totalDebtPayments, totalSavings, totalCash, currentMonth, currentYear, onUpdate }: BudgetsTabProps) {


    const [viewMode, setViewMode] = useState<'cards' | 'table' | 'subscriptions'>('cards');

    // Subscriptions Logic
    const subscriptions = expenses.filter(e => e.isRecurring);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 pt-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Presupuesto</h2>
                    <p className="text-zinc-500">Planifica tus límites y controla tus fondos (Sinking Funds).</p>
                </div>

                {/* Control Segmentado */}
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1 shrink-0">
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Tarjetas
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Tabla
                    </button>
                    <button
                        onClick={() => setViewMode('subscriptions')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'subscriptions' ? 'bg-white dark:bg-zinc-800 text-purple-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Suscripciones
                    </button>
                </div>
            </div>

            {/* FINANCIAL RULES WIDGETS (Only in Budget Views) */}
            {viewMode !== 'subscriptions' && (
                <FinancialRules
                    income={totalIncome}
                    expenses={expenses}
                    debtsPayment={totalDebtPayments}
                    totalSavings={totalSavings}
                    totalCash={totalCash}
                />
            )}

            {/* VISTA: TABLA */}
            {viewMode === 'table' && (
                <BudgetTable
                    categories={categories}
                    expenses={expenses}
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    currency={currency}
                />
            )}

            {/* VISTA: TARJETAS (Migrated from ExpensesTab) */}
            {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {categories.sort((a, b) => a.name.localeCompare(b.name)).map((categoryObj) => (
                        <BudgetCard
                            key={categoryObj.id}
                            category={categoryObj}
                            expenses={expenses}
                            onUpdate={onUpdate}
                        />
                    ))}
                </div>
            )}

            {/* VISTA: SUSCRIPCIONES (Migrated from ExpensesTab) */}
            {viewMode === 'subscriptions' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Widget de Resumen */}
                    <div className="relative overflow-hidden rounded-[3rem] bg-indigo-600 text-white p-10 shadow-xl shadow-indigo-500/30">
                        <h3 className="text-xl font-medium text-indigo-200 mb-2">Gastos Fijos Mensuales</h3>
                        <h2 className="text-6xl font-black tracking-tighter mb-4">
                            {formatMoney(subscriptions.reduce((s, e) => s + Number(e.amount), 0))}
                        </h2>
                        <p className="max-w-md text-indigo-100 text-sm font-medium leading-relaxed opacity-80">
                            Total de tus suscripciones y pagos recurrentes. Este es tu "costo de vida" base.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {subscriptions.map((exp) => (
                            <div key={exp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-4xl flex flex-col justify-between min-h-[180px] shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-purple-500 to-indigo-500" />

                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center text-xl">
                                        🔄
                                    </div>
                                    <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-black uppercase text-zinc-500">
                                        Día {exp.dueDate || '1'}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <h4 className="text-lg font-bold text-zinc-900 dark:text-white truncate">{exp.name}</h4>
                                    <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">-{formatMoney(Number(exp.amount))}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
