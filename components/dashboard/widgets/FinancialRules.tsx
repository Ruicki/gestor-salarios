'use client';

import React from 'react';
import { formatMoney } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, AlertTriangle, TrendingUp, Landmark, Calculator } from 'lucide-react';

interface FinancialRulesProps {
    income: number;
    expenses: any[];
    debtsPayment: number;
    totalSavings: number;
    totalCash: number;
}

export default function FinancialRules({ income, expenses, debtsPayment, totalSavings, totalCash }: FinancialRulesProps) {
    if (income === 0) return null; // Avoid division by zero visuals

    // --- RULE 1: 50/30/20 ---
    // Needs (Fixed), Wants (Variable/Luxury), Savings (Saving + Goals)
    const needs = expenses.filter(e => e.categoryRel?.type === 'FIXED').reduce((sum, e) => sum + Number(e.amount), 0);
    const wants = expenses.filter(e => ['VARIABLE', 'LUXURY'].includes(e.categoryRel?.type || 'VARIABLE')).reduce((sum, e) => sum + Number(e.amount), 0);
    // Savings is tricky: it's "Money sent to Savings Categories" OR "Money left over" OR "Goal Contributions"
    // For this rule, strict "Savings" = (Income - Expenses) + (Expenses typed as SAVING)
    const savingsExp = expenses.filter(e => e.categoryRel?.type === 'SAVING').reduce((sum, e) => sum + Number(e.amount), 0);
    const surplus = Math.max(0, income - (needs + wants + savingsExp));
    const totalSavingsCalc = savingsExp + surplus + totalSavings; // Simplified: Current Month Savings Flow

    // To visualize simpler: Expenses classified + Proportional Surplus
    const data503020 = [
        { name: 'Necesidades (50%)', value: needs, color: '#3b82f6', target: 0.5 },
        { name: 'Deseos (30%)', value: wants, color: '#a855f7', target: 0.3 },
        { name: 'Ahorro (20%)', value: totalSavingsCalc, color: '#10b981', target: 0.2 },
    ];

    // --- RULE 2: DEBT-TO-INCOME (DTI) ---
    // Healthy: < 36%
    const dtiRatio = (debtsPayment / income) * 100;
    const dtiStatus = dtiRatio <= 30 ? 'Excellent' : dtiRatio <= 43 ? 'Warning' : 'Critical';
    const dtiColor = dtiStatus === 'Excellent' ? 'text-emerald-500' : dtiStatus === 'Warning' ? 'text-amber-500' : 'text-red-500';

    // --- RULE 3: EMERGENCY FUND ---
    // Target: 3-6 Months of "Needs" (Fixed Expenses)
    // Avoid division by zero if needs is 0, use total expenses or fallback
    const monthlyBurn = needs > 0 ? needs : (needs + wants);
    const monthsCovered = monthlyBurn > 0 ? (totalCash / monthlyBurn) : 0;
    const emergencyStatus = monthsCovered >= 6 ? 'Excellent' : monthsCovered >= 3 ? 'Good' : 'Building';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-700">

            {/* RULE 1: 50/30/20 */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-500" />
                        Regla 50/30/20
                    </h3>
                    <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                        PRESUPUESTO
                    </div>
                </div>

                <div className="h-40 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data503020}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data503020.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any) => formatMoney(Number(value))}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-zinc-400">DISTRIBUCIÓN</span>
                    </div>
                </div>

                <div className="space-y-2 mt-2">
                    {data503020.map((item) => {
                        const pct = income > 0 ? (item.value / income) * 100 : 0;
                        const diff = pct - (item.target * 100);
                        return (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-zinc-600 dark:text-zinc-400">{item.name.split(' ')[0]}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-900 dark:text-white">{pct.toFixed(0)}%</span>
                                    <span className={`text-[10px] ${diff > 5 ? 'text-red-400' : diff < -5 ? 'text-blue-400' : 'text-emerald-400'}`}>
                                        {diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* RULE 2: DEBT TO INCOME */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                        <Calculator size={18} className="text-purple-500" />
                        Endeudamiento
                    </h3>
                    <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                        SALUD (30%)
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <div className={`text-5xl font-black tracking-tighter mb-2 ${dtiColor}`}>
                        {dtiRatio.toFixed(1)}%
                    </div>
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-6">Ratio de Deuda</p>

                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden relative">
                        {/* Safe Zone */}
                        <div className="absolute top-0 left-0 h-full bg-emerald-500/20 w-[30%]" />
                        {/* Danger Zone */}
                        <div className="absolute top-0 right-0 h-full bg-red-500/20 w-[60%]" />

                        {/* Marker */}
                        <div
                            className={`absolute top-0 h-full w-1.5 rounded-full ${dtiStatus === 'Excellent' ? 'bg-emerald-500' : dtiStatus === 'Warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ left: `${Math.min(dtiRatio, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-zinc-500 mt-4 px-4 leading-relaxed">
                        {dtiStatus === 'Excellent'
                            ? "¡Excelente! Destinas menos del 30% a deudas."
                            : dtiStatus === 'Warning'
                                ? "Cuidado. Estás cerca del límite saludable del 36%."
                                : "Crítico. Tus deudas consumen gran parte de tu ingreso."}
                    </p>
                </div>
            </div>

            {/* RULE 3: EMERGENCY FUND */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-500" />
                        Fondo Emergencia
                    </h3>
                    <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                        FONDO (6 Meses)
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-black text-zinc-900 dark:text-white">{monthsCovered.toFixed(1)}</span>
                        <span className="text-sm font-bold text-zinc-400 mb-1.5">Meses Cubiertos</span>
                    </div>

                    <div className="flex gap-1 h-12 items-end mb-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div
                                key={i}
                                className={`flex-1 rounded-t-lg transition-all duration-500 border-b-2 border-zinc-50 dark:border-zinc-900 ${i <= monthsCovered ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                                style={{ height: `${(i / 6) * 100}%` }}
                            />
                        ))}
                    </div>

                    <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <span>Gasto Mensual (Fix)</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-200">{formatMoney(monthlyBurn)}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
