'use client';

import React from 'react';
import BudgetTable from '@/components/budgets/BudgetTable';
import FinancialRules from '@/components/dashboard/widgets/FinancialRules';
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
}

export default function BudgetsTab({ categories, expenses, currency = 'USD', totalIncome, totalDebtPayments, totalSavings, totalCash, currentMonth, currentYear }: BudgetsTabProps) {


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Presupuesto</h2>
                    <p className="text-zinc-500">Planifica tus límites y controla tus fondos (Sinking Funds).</p>
                </div>
            </div>

            {/* FINANCIAL RULES WIDGETS */}
            <FinancialRules
                income={totalIncome}
                expenses={expenses}
                debtsPayment={totalDebtPayments}
                totalSavings={totalSavings}
                totalCash={totalCash}
            />

            {/* MAIN BUDGET TABLE */}
            <BudgetTable
                categories={categories}
                expenses={expenses}
                currentMonth={currentMonth}
                currentYear={currentYear}
                currency={currency}
            />
        </div>
    );
}
