'use client';

import { useState } from 'react';
import { Expense, CreditCard, Account, Category } from '@prisma/client';
import { createExpense, deleteExpense } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/DeleteConfirmation';
import ExpenseWizard from '@/components/ExpenseWizard';
import { updateCategoryLimit } from '@/app/actions/categories';

interface ExpensesTabProps {
    expenses: Expense[];
    creditCards: CreditCard[];
    accounts: Account[];
    categories: Category[];
    profileId: number;
    onUpdate: () => void;
}

import CategoryManager from '@/components/CategoryManager';

export default function ExpensesTab({ expenses, creditCards, accounts, categories, profileId, onUpdate }: ExpensesTabProps) {
    const [showWizard, setShowWizard] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grouped' | 'subscriptions'>('list');
    const [currentPage, setCurrentPage] = useState(1);

    // Filter out debts
    const expensesList = expenses.filter(e => e.category !== 'Deuda');
    const totalExpenses = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

    const today = new Date().getDate();

    async function handleDelete(id: number) {
        confirmDelete(async () => {
            try {
                await deleteExpense(id);
                onUpdate();
                toast.success("Gasto eliminado");
            } catch (error) {
                toast.error("Error eliminando gasto");
            }
        });
    }

    // Helper for category colors/icons if needed, though we use the ones from DB mostly
    const getCategoryColor = (catName: string) => {
        const cat = categories.find(c => c.name === catName);
        return cat?.color || 'text-zinc-500';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- HEADER COMPONENT --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Mis Gastos</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">Gestiona y optimiza tus salidas de dinero.</p>
                </div>

                <button
                    onClick={() => setShowWizard(true)}
                    className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 dark:bg-zinc-100 px-6 font-medium text-white dark:text-black transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 shadow-lg hover:shadow-xl w-full md:w-auto"
                >
                    <span className="flex items-center gap-2">
                        <span className="text-xl leading-none">+</span> Nuevo Gasto
                    </span>
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 transition-opacity duration-500 group-hover:opacity-10" />
                </button>
            </div>

            {/* --- SUMMARY CARD (Bento Style) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Expense Card */}
                <div className="col-span-1 md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-red-500/10 blur-3xl" />
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 9-7 7-7-7" /></svg>
                            </div>
                            <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Total Gastado este Mes</span>
                        </div>
                        <div>
                            <h3 className="text-5xl md:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter blur-sensitive">
                                ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Quick Stat / Decoration */}
                <div className="col-span-1 rounded-[2.5rem] bg-zinc-900 dark:bg-zinc-100 p-8 text-white dark:text-black flex flex-col justify-between relative overflow-hidden shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                    <div className="relative z-10">
                        <p className="font-bold opacity-70 mb-2">Transacciones</p>
                        <p className="text-4xl font-black">{expensesList.length}</p>
                    </div>
                    <div className="relative z-10 text-sm font-medium opacity-60">
                        Mantén tus gastos bajo control para aumentar tu patrimonio.
                    </div>
                </div>
            </div>

            {/* --- SEGMENTED CONTROL TOGGLE --- */}
            <div className="flex justify-center">
                <div className="inline-flex items-center p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 relative">
                    {/* Sliding Background Pill (Simulated with conditional classes for simplicity, ideally automated with layout animations) */}
                    <button
                        onClick={() => setViewMode('list')}
                        className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm scale-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 scale-95'}`}
                    >
                        Listado
                    </button>
                    <button
                        onClick={() => setViewMode('grouped')}
                        className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${viewMode === 'grouped' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm scale-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 scale-95'}`}
                    >
                        Presupuesto
                    </button>
                    <button
                        onClick={() => setViewMode('subscriptions')}
                        className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${viewMode === 'subscriptions' ? 'bg-white dark:bg-zinc-800 text-purple-500 shadow-sm scale-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 scale-95'}`}
                    >
                        Suscripciones
                    </button>
                </div>
            </div>

            {/* --- VIEWS --- */}
            <div className="min-h-[400px]">
                {/* 1. LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="space-y-3">
                        {expensesList.slice((currentPage - 1) * 5, currentPage * 5).map((exp) => (
                            <div key={exp.id} className="group relative bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/50 rounded-3xl p-4 flex flex-col md:flex-row items-center gap-4 transition-all hover:shadow-lg hover:border-zinc-200 dark:hover:border-zinc-700 hover:-translate-y-1">
                                {/* Icon */}
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${exp.category === 'Fijo' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' : exp.category === 'Entretenimiento' ? 'bg-pink-50 text-pink-500 dark:bg-pink-900/20' : 'bg-orange-50 text-orange-500 dark:bg-orange-900/20'}`}>
                                    {exp.category === 'Fijo' ? '🏠' : exp.category === 'Entretenimiento' ? '🍿' : exp.category === 'Comida' ? '🍔' : '💸'}
                                </div>

                                {/* Info */}
                                <div className="flex-1 text-center md:text-left min-w-0">
                                    <h4 className="font-bold text-lg text-zinc-900 dark:text-white truncate">{exp.name}</h4>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                                        <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                                            {exp.category}
                                        </span>
                                        {exp.dueDate && (
                                            <span className={`text-xs font-bold flex items-center gap-1 ${today > exp.dueDate ? 'text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg' : 'text-zinc-400'}`}>
                                                {today > exp.dueDate ? '⚠️ Vencido' : '📅'} Día {exp.dueDate}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Amount & Actions */}
                                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t border-zinc-50 dark:border-zinc-800 pt-4 md:border-0 md:pt-0">
                                    <div className="text-left md:text-right">
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">-${exp.amount.toFixed(2)}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(exp.id)}
                                        className="p-3 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {expensesList.length === 0 && (
                            <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-12 text-center">
                                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🍃</div>
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Todo tranquilo por aquí</h3>
                                <p className="text-zinc-500 mt-2">No tienes gastos registrados. ¡Buen trabajo!</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {expensesList.length > 5 && (
                            <div className="flex items-center justify-center gap-6 mt-8">
                                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 disabled:opacity-30 hover:scale-105 transition-all">←</button>
                                <span className="font-bold text-zinc-400">Página {currentPage}</span>
                                <button onClick={() => setCurrentPage(Math.min(Math.ceil(expensesList.length / 5), currentPage + 1))} disabled={currentPage >= Math.ceil(expensesList.length / 5)} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 disabled:opacity-30 hover:scale-105 transition-all">→</button>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. GROUPED (BUDGET) VIEW */}
                {viewMode === 'grouped' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
                        {Object.entries(
                            expensesList.reduce((acc, exp) => {
                                const catName = exp.category || 'Otros';
                                if (!acc[catName]) acc[catName] = { total: 0, items: [] };
                                acc[catName].items.push(exp);
                                acc[catName].total += exp.amount;
                                return acc;
                            }, {} as Record<string, { total: number, items: Expense[] }>)
                        ).map(([categoryName, data]) => {
                            const categoryObj = categories.find(c => c.name === categoryName);
                            const limit = categoryObj?.monthlyLimit || 0;
                            const percentage = limit > 0 ? Math.min((data.total / limit) * 100, 100) : 0;
                            const isOverLimit = limit > 0 && data.total > limit;
                            const remaining = Math.max(0, limit - data.total);

                            return (
                                <div key={categoryName} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${categoryObj?.color?.replace('text-', 'bg-').replace('500', '100') || 'bg-zinc-100'} ${categoryObj?.color || 'text-zinc-500'}`}>
                                                {categoryName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-xl text-zinc-900 dark:text-white">{categoryName}</h4>
                                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{data.items.length} movimientos</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-zinc-900 dark:text-white">${data.total.toFixed(0)}</p>
                                        </div>
                                    </div>

                                    {/* Budget Bar Section */}
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl mb-4">
                                        <div className="flex justify-between items-end mb-3">
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">PRESUPUESTO</p>
                                                <div className="flex items-center gap-2 cursor-pointer group/edit hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2 py-1 -ml-2 rounded-lg transition-colors"
                                                    onClick={async () => {
                                                        if (!categoryObj) return;
                                                        const newLimit = window.prompt(`Nuevo límite para ${categoryName}:`, limit.toString());
                                                        if (newLimit !== null) {
                                                            const val = parseFloat(newLimit);
                                                            if (!isNaN(val) && val >= 0) {
                                                                await updateCategoryLimit(categoryObj.id, val === 0 ? null : val);
                                                                onUpdate();
                                                                toast.success("Límite actualizado");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                                        {limit > 0 ? `$${limit.toLocaleString()}` : 'Sin límite'}
                                                    </span>
                                                    <span className="opacity-0 group-hover/edit:opacity-100 text-xs">✏️</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {limit > 0 && (
                                                    <p className={`text-xs font-bold ${isOverLimit ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {isOverLimit ? `Excedido $${(data.total - limit).toFixed(0)}` : `Quedan $${remaining.toFixed(0)}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                            {limit > 0 ? (
                                                <div className={`h-full rounded-full transition-all duration-1000 ${isOverLimit ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`} style={{ width: `${percentage}%` }} />
                                            ) : (
                                                <div className="w-full h-full opacity-20 bg-zinc-300 dark:bg-zinc-600" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Mini List */}
                                    <div className="space-y-2 pl-2">
                                        {data.items.slice(0, 3).map(i => (
                                            <div key={i.id} className="flex justify-between text-xs text-zinc-500">
                                                <span className="truncate max-w-[150px]">{i.name}</span>
                                                <span className="font-medium text-zinc-700 dark:text-zinc-300">-${i.amount.toFixed(0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {expensesList.length === 0 && (
                            <div className="col-span-full py-20 text-center opacity-50">No hay datos para mostrar el presupuesto.</div>
                        )}
                    </div>
                )}

                {/* 3. SUBSCRIPTIONS VIEW */}
                {viewMode === 'subscriptions' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Summary Widget */}
                        <div className="relative overflow-hidden rounded-[3rem] bg-indigo-600 text-white p-10 shadow-xl shadow-indigo-500/30">
                            <div className="absolute top-0 right-0 p-12 opacity-20">
                                <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                            </div>
                            <h3 className="text-xl font-medium text-indigo-200 mb-2">Gastos Fijos Mensuales</h3>
                            <h2 className="text-6xl font-black tracking-tighter mb-4">
                                ${expensesList.filter(e => e.isRecurring).reduce((s, e) => s + e.amount, 0).toLocaleString()}
                            </h2>
                            <p className="max-w-md text-indigo-100 text-sm font-medium leading-relaxed">
                                Este es tu "Número de Supervivencia". La cantidad mínima que necesitas para cubrir tus obligaciones recurrentes cada mes.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {expensesList.filter(e => e.isRecurring).map((exp) => (
                                <div key={exp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] flex flex-col justify-between min-h-[180px] shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1 relative overflow-hidden">
                                    {/* Decorative top strip */}
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />

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
                                        <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">-${exp.amount.toFixed(0)}</p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-zinc-400 font-bold">Mensual</span>
                                        <button onClick={() => handleDelete(exp.id)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">Cancelar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {expensesList.filter(e => e.isRecurring).length === 0 && (
                            <div className="text-center py-12 text-zinc-400 font-medium">No se encontraron suscripciones activas.</div>
                        )}
                    </div>
                )}
            </div>

            {/* CATEGORY MANAGER MODAL */}
            {showCategoryManager && (
                <CategoryManager
                    categories={categories}
                    profileId={profileId}
                    onClose={() => setShowCategoryManager(false)}
                    onUpdate={() => {
                        // setShowCategoryManager(false); // Optional: keep open or close
                        onUpdate();
                    }}
                />
            )}

            {/* WIZARD MODAL */}
            {showWizard && (
                <ExpenseWizard
                    accounts={accounts}
                    creditCards={creditCards}
                    categories={categories}
                    profileId={profileId}
                    onClose={() => setShowWizard(false)}
                    onInit={() => onUpdate()}
                    onSuccess={() => {
                        setShowWizard(false);
                        onUpdate();
                    }}
                />
            )}
        </div>
    );
}
