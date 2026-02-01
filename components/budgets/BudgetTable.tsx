'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/utils';
import { Category, Expense } from '@prisma/client';
import { updateCategoryLimit, toggleCategoryRollover, updateCategoryRolloverBalance } from '@/app/actions/budget';
import { toast } from 'sonner';
import { Check, Edit2, RotateCcw, TrendingUp } from 'lucide-react';

type ExtendedCategory = Category & {
    monthlyLimit: number | null;
    isRollover: boolean;
    rolloverBalance: number;
}

interface BudgetTableProps {
    categories: any[];
    expenses: any[];
    currentMonth: number;
    currentYear: number;
    currency: string;
}

export default function BudgetTable({ categories, expenses, currentMonth, currentYear, currency }: BudgetTableProps) {

    // Helper to calculate spent amount per category for CURRENT month
    const getSpent = (catId: number) => {
        return expenses
            .filter(e => {
                const d = new Date(e.createdAt); // Should ideally use transaction date if different
                return e.categoryId === catId && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + Number(e.amount), 0);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden animate-in fade-in duration-700">
            <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="text-blue-500" size={24} />
                    Control de Presupuesto
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-100 dark:border-zinc-800">
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4 text-right">Límite Mensual</th>
                            <th className="px-6 py-4 text-right">Gastado</th>
                            <th className="px-6 py-4 text-right">Disponible</th>
                            <th className="px-6 py-4 text-center">Rollover</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {categories.map(cat => (
                            <BudgetRow
                                key={cat.id}
                                category={cat}
                                spent={getSpent(cat.id)}
                                currency={currency}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {categories.length === 0 && (
                <div className="p-12 text-center text-zinc-400">
                    No tienes categorías configuradas.
                </div>
            )}
        </div>
    );
}

// Sub-component for efficient rendering of rows
function BudgetRow({ category, spent, currency }: { category: ExtendedCategory, spent: number, currency: string }) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [limit, setLimit] = useState(category.monthlyLimit?.toString() || '');
    const [isLoading, setIsLoading] = useState(false);
    // Rollover Edit State
    const [isEditingRollover, setIsEditingRollover] = useState(false);
    const [rolloverInput, setRolloverInput] = useState(category.rolloverBalance?.toString() || '');

    const limitNum = Number(category.monthlyLimit) || 0;

    // Rollover check
    const isRollover = category.isRollover;
    const rolloverBal = Number(category.rolloverBalance) || 0;

    // Sync state with props
    useEffect(() => {
        setLimit(category.monthlyLimit?.toString() || '');
        setRolloverInput(category.rolloverBalance?.toString() || '');
    }, [category.monthlyLimit, category.rolloverBalance]);

    // Available Logic: Limit + Rollover - Spent
    // IMPORTANT: If no limit is set, "Available" doesn't make sense (Infinite). We treat Limit 0 as "No Budget".
    const available = limitNum > 0 ? (limitNum + rolloverBal - spent) : 0;
    const percent = limitNum > 0 ? Math.min((spent / (limitNum + rolloverBal)) * 100, 100) : 0;

    async function handleSave() {
        const val = parseFloat(limit) || 0;
        if (val === limitNum) { setIsEditing(false); return; }

        setIsLoading(true);
        const res = await updateCategoryLimit(category.id, val);
        setIsLoading(false);

        if (res.success) {
            toast.success("Presupuesto actualizado");
            setIsEditing(false);
            router.refresh(); // Ensure the UI updates with the new server data
        } else {
            toast.error("Error al actualizar");
        }
    }

    async function handleSaveRollover() {
        const val = parseFloat(rolloverInput) || 0;
        if (val === rolloverBal) { setIsEditingRollover(false); return; }

        const res = await updateCategoryRolloverBalance(category.id, val);

        if (res.success) {
            toast.success("Rollover actualizado");
            setIsEditingRollover(false);
            router.refresh();
        } else {
            toast.error("Error al actualizar rollover");
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setLimit(category.monthlyLimit?.toString() || '');
        }
    };

    async function handleToggleRollover() {
        const res = await toggleCategoryRollover(category.id, !isRollover);
        if (res.success) {
            toast.success(isRollover ? "Rollover desactivado" : "Rollover activado");
            router.refresh();
        }
    }

    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group text-sm">
            {/* Category Name */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${category.color || 'bg-zinc-400'}`} />
                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">{category.name}</span>
                </div>
            </td>

            {/* Monthly Limit (Inline Edit) */}
            <td className="px-6 py-4 text-right">
                {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                        <input
                            type="number"
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-24 h-8 text-right font-mono border rounded px-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                            autoFocus
                            disabled={isLoading}
                        />
                        <button onClick={handleSave} disabled={isLoading} className="p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-200">
                            <Check size={14} />
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => { setLimit(limitNum.toString()); setIsEditing(true); }}
                        className="cursor-pointer group/edit flex items-center justify-end gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded-md transition-colors"
                    >
                        <span className={`font-mono font-medium ${limitNum === 0 ? 'text-zinc-300' : 'text-zinc-900 dark:text-white'}`}>
                            {limitNum === 0 ? '--' : formatMoney(limitNum)}
                        </span>
                        <Edit2 size={12} className="opacity-0 group-hover/edit:opacity-50 text-zinc-400" />
                    </div>
                )}
            </td>

            {/* Spent */}
            <td className="px-6 py-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                {formatMoney(spent)}
            </td>

            {/* Available */}
            <td className="px-6 py-4 text-right">
                {limitNum > 0 ? (
                    <div className="flex flex-col items-end">
                        <span className={`font-bold font-mono ${available < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {formatMoney(available)}
                        </span>
                        {/* Progress Bar */}
                        <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full rounded-full ${available < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }} />
                        </div>
                    </div>
                ) : (
                    <span className="text-zinc-300">--</span>
                )}
            </td>

            {/* Rollover Toggle & Edit */}
            <td className="px-6 py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={handleToggleRollover}
                        title={isRollover ? "Rollover Activo: El dinero no gastado pasa al siguiente mes" : "Activar Sinking Fund"}
                        className={`p-2 rounded-full transition-all ${isRollover ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-300 hover:text-zinc-400'}`}
                    >
                        <RotateCcw size={18} className={isRollover ? "" : "opacity-20"} />
                    </button>

                    {isRollover && (
                        isEditingRollover ? (
                            <div className="flex items-center justify-center gap-1 mt-1 animate-in zoom-in-50">
                                <input
                                    type="number"
                                    value={rolloverInput}
                                    onChange={(e) => setRolloverInput(e.target.value)}
                                    className="w-16 h-6 text-center text-xs font-bold border rounded bg-white dark:bg-zinc-800 border-blue-200 dark:border-blue-800 text-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                    onBlur={handleSaveRollover}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRollover()}
                                />
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsEditingRollover(true)}
                                className="group/roll cursor-pointer flex items-center gap-1 mt-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-0.5 rounded-md transition-colors"
                            >
                                <span className={`text-xs font-bold ${rolloverBal > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`}>
                                    {rolloverBal > 0 ? `+${formatMoney(rolloverBal)}` : '$0'}
                                </span>
                                <Edit2 size={10} className="text-blue-400 opacity-0 group-hover/roll:opacity-100 transition-opacity" />
                            </div>
                        )
                    )}
                </div>
            </td>
        </tr>
    );
}
