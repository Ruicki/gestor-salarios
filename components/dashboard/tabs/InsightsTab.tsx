
"use client";

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { ArrowUp, ArrowDown, Target, AlertTriangle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Expense, Category, AdditionalIncome, Salary } from '@prisma/client';

// Helper types
type InsightsTabProps = {
    expenses: Expense[];
    categories: Category[];
    incomes: AdditionalIncome[];
    salaries: Salary[];
    currency?: string;
};

export default function InsightsTab({ expenses, categories, incomes, salaries, currency = "$" }: InsightsTabProps) {

    // --- 1. DATA PROCESSING ---
    const {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        monthlyData,
        budgetComparison
    } = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // A. Totals
        const salaryTotal = salaries.reduce((acc, s) => acc + s.netVal, 0); // Logic might differ if real records
        const incomeTotal = incomes.reduce((acc, i) => acc + i.amount, 0);
        const totalIncome = salaryTotal + incomeTotal;

        const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);
        const netSavings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

        // B. Chart Data (Daily Accumulation for Edge-to-Edge)
        // Group expenses by day
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const chartData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayExpenses = expenses
                .filter(e => {
                    const d = new Date(e.createdAt || new Date()); // Fallback if no date
                    return d.getDate() === day;
                }) // This logic assumes 'expenses' prop is ALREADY filtered for current month by parent
                .reduce((acc, e) => acc + e.amount, 0);

            return { day, expense: dayExpenses };
        });

        // Accumulate for area chart? Or just daily spikes? Area chart usually implies accumulation or trend.
        // Let's do cumulative for "Burn Rate" visualization
        let accumulatedExpense = 0;
        const cumulativeData = chartData.map(d => {
            accumulatedExpense += d.expense;
            return { ...d, cumulative: accumulatedExpense };
        });


        // C. Budget Comparison
        const budgetComparison = categories.map(cat => {
            const catExpenses = expenses.filter(e => e.categoryId === cat.id).reduce((acc, e) => acc + e.amount, 0);
            const limit = cat.monthlyLimit || 0;
            const diff = limit - catExpenses;
            const percent = limit > 0 ? (catExpenses / limit) * 100 : 0;

            return {
                ...cat,
                spent: catExpenses,
                diff,
                percent
            };
        }).sort((a, b) => b.percent - a.percent); // Sort by highest execution

        return {
            totalIncome,
            totalExpense,
            netSavings,
            savingsRate,
            monthlyData: cumulativeData,
            budgetComparison
        };
    }, [expenses, categories, incomes, salaries]);


    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* --- 1. EDGE-TO-EDGE CHART --- */}
            <div className="relative h-64 w-full bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-800">
                <div className="absolute top-6 left-8 z-10">
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Flujo de Caja (Acumulado)</p>
                    <h3 className="text-3xl font-black text-white flex items-center gap-2">
                        {netSavings >= 0 ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-red-500" />}
                        {currency}{netSavings.toLocaleString()}
                        <span className="text-lg font-medium text-zinc-500">Neto</span>
                    </h3>
                </div>

                <div className="absolute inset-0 pt-20">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="cumulative"
                                stroke="#f43f5e"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorExpense)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- 2. KPIs COMPACTOS --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Ingresos</p>
                    <p className="text-xl font-black text-emerald-500">{currency}{totalIncome.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Gastos</p>
                    <p className="text-xl font-black text-rose-500">{currency}{totalExpense.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Tasa de Ahorro</p>
                    <p className={`text-xl font-black ${savingsRate > 20 ? 'text-indigo-500' : 'text-amber-500'}`}>
                        {savingsRate.toFixed(1)}%
                    </p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Proyección</p>
                    <p className="text-xl font-black text-zinc-700 dark:text-zinc-300">
                        {/* Simple projection: Avg daily spend * days in month */}
                        {currency}{((totalExpense / Math.max(new Date().getDate(), 1)) * 30).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                </div>
            </div>

            {/* --- 3. BUDGET TABLE (PRESUPUESTO) --- */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <Target className="text-indigo-500" /> Presupuesto vs Real
                </h3>

                <div className="flex flex-col gap-4">
                    {budgetComparison.map((item) => {
                        const statusColor = item.percent > 100 ? 'bg-red-500' : item.percent > 85 ? 'bg-amber-500' : 'bg-emerald-500';
                        const textColor = item.percent > 100 ? 'text-red-500' : item.percent > 85 ? 'text-amber-500' : 'text-emerald-500';

                        return (
                            <div key={item.id} className="group">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{item.icon}</span>
                                        <div>
                                            <p className="font-bold text-zinc-800 dark:text-zinc-100">{item.name}</p>
                                            <p className="text-xs text-zinc-400 font-medium">
                                                Meta: <span className="text-zinc-500">{currency}{item.monthlyLimit?.toLocaleString() || '∞'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${textColor}`}>
                                            {currency}{item.spent.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full inline-block mt-1">
                                            {item.monthlyLimit && item.monthlyLimit > 0
                                                ? `${item.percent.toFixed(0)}% Ejecutado`
                                                : 'Sin Límite'}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${statusColor}`}
                                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- 4. SEMÁFORO MENSUAL (Final Widget) --- */}
            <div className={`p-6 rounded-3xl flex items-center gap-4 ${netSavings > 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <div className={`p-3 rounded-full ${netSavings > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    {netSavings > 0 ? <ArrowUp size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div>
                    <h4 className={`font-black text-lg ${netSavings > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {netSavings > 0 ? "¡Vas Ganando!" : "Zona de Peligro"}
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                        {netSavings > 0
                            ? "Tus ingresos superan tus gastos. Sigue así."
                            : "Estás gastando más de lo que ganas este mes."}
                    </p>
                </div>
            </div>

        </div>
    );
}
