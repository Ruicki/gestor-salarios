'use client';

import { useState } from 'react';
// import { Expense as PrismaExpense, CreditCard as PrismaCreditCard, Account as PrismaAccount, Category as PrismaCategory } from '@prisma/client'; 
import { ProfileWithData } from '@/types';

type ExpenseWithCategory = ProfileWithData['expenses'][number];
type CreditCard = ProfileWithData['creditCards'][number];
type Account = ProfileWithData['accounts'][number];
type Category = ProfileWithData['categories'][number];

import { createExpense, deleteExpense } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/DeleteConfirmation';
import ExpenseWizard from '@/components/ExpenseWizard';
import { updateCategoryLimit } from '@/app/actions/categories';
import { Search, Filter, Plus, Trash2, Calendar, CreditCard as CardIcon, DollarSign, Wallet } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';

interface ExpensesTabProps {
    expenses: ExpenseWithCategory[];
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
    const [searchQuery, setSearchQuery] = useState('');

    // Filtrar deudas y aplicar búsqueda
    const expensesList = expenses.filter(e => {
        // Se eliminó el filtro !isDebt para mostrar todos los gastos
        const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.amount.toString().includes(searchQuery));
        return matchesSearch;
    });

    const totalExpenses = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

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

    const getCategoryColor = (catName: string) => {
        const cat = categories.find(c => c.name === catName);
        return cat?.color || 'text-zinc-500';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">

            {/* --- ENCABEZADO Y ACCIONES --- */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
                <div>
                    <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">Mis Gastos</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-md">
                        Controla cada centavo. Gestiona tus salidas, suscripciones y límites de presupuesto.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowCategoryManager(true)}
                        className="h-12 px-6 rounded-2xl font-bold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm hover:shadow-md"
                    >
                        Categorías
                    </button>

                    <button
                        onClick={() => setShowWizard(true)}
                        className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 dark:bg-zinc-100 px-8 font-bold text-white dark:text-black transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 flex-1 md:flex-none"
                    >
                        <span className="flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Nuevo Gasto
                        </span>
                        <div className="absolute inset-0 -z-10 bg-linear-to-r from-indigo-500 to-purple-500 opacity-0 transition-opacity duration-500 group-hover:opacity-10" />
                    </button>
                </div>
            </div>

            {/* --- TARJETA DE RESUMEN --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-zinc-900 dark:bg-zinc-950 text-white border border-zinc-800 p-10 shadow-2xl group">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl group-hover:bg-indigo-500/40 transition-all duration-1000" />
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-48 w-48 rounded-full bg-pink-500/20 blur-3xl group-hover:bg-pink-500/30 transition-all duration-1000" />

                    <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Total este mes</span>
                        </div>
                        <div>
                            <h3 className="text-5xl md:text-7xl font-black tracking-tighter shadow-black drop-shadow-lg">
                                ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="col-span-1 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-sm">
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full h-32 w-32 flex items-center justify-center mb-4">
                        <span className="text-4xl">📊</span>
                    </div>
                    <p className="text-3xl font-black text-zinc-900 dark:text-white">{expensesList.length}</p>
                    <p className="text-sm font-bold text-zinc-400 uppercase">Movimientos</p>
                </div>
            </div>

            {/* --- CONTROLES: BÚSQUEDA + PESTAÑAS --- */}
            <div className="sticky top-4 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-xl p-2 rounded-4xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col md:flex-row gap-2 md:items-center justify-between">
                {/* Barra de Búsqueda */}
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar gastos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-900/50 border-none rounded-2xl h-12 pl-12 pr-4 font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                </div>

                {/* Control Segmentado */}
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1 shrink-0">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Listado
                    </button>
                    <button
                        onClick={() => setViewMode('grouped')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'grouped' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Presupuesto
                    </button>
                    <button
                        onClick={() => setViewMode('subscriptions')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'subscriptions' ? 'bg-white dark:bg-zinc-800 text-purple-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Suscripciones
                    </button>
                </div>
            </div>

            {/* --- GRUPOS --- */}
            <div className="min-h-[400px]">

                {/* 1. VISTA DE LISTA */}
                {viewMode === 'list' && (
                    <div className="space-y-8">
                        {(() => {
                            const grouped = expensesList.reduce((groups, exp) => {
                                const date = new Date(exp.createdAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                                if (!groups[date]) groups[date] = [];
                                groups[date].push(exp);
                                return groups;
                            }, {} as Record<string, ExpenseWithCategory[]>);

                            if (Object.keys(grouped).length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                        <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-4xl grayscale">👻</div>
                                        <p className="text-xl font-bold">No se encontraron gastos</p>
                                        <p>Intenta con otro término de búsqueda</p>
                                    </div>
                                );
                            }

                            return Object.entries(grouped).map(([date, items]) => (
                                <div key={date} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 dark:bg-black px-4 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">{date}</h4>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                                    </div>

                                    <div className="grid gap-3">
                                        {items.map((exp) => (
                                            <div key={exp.id} className="group relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 rounded-3xl p-5 flex items-center gap-5 transition-all hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5">

                                                {/* Caja de Icono */}
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${getCategoryColor(exp.category)} ${getCategoryColor(exp.category).includes('text-') ? getCategoryColor(exp.category).replace('text-', 'bg-').replace('500', '100') + ' dark:bg-opacity-10' : 'bg-zinc-100'}`}>
                                                    <CategoryIcon iconName={exp.categoryRel?.icon || categories.find(c => c.name === exp.category)?.icon || 'HelpCircle'} size={24} />
                                                </div>

                                                <div className="flex-1 min-w-0 pr-16">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-lg text-zinc-900 dark:text-white truncate pr-2">{exp.name}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{exp.category}</span>
                                                                {exp.isRecurring && <span className="text-[10px] font-black bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Suscripción</span>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xl font-black text-zinc-900 dark:text-white">-${exp.amount.toFixed(2)}</p>
                                                            <div className="flex items-center justify-end gap-1 text-xs font-medium text-zinc-400 mt-1">
                                                                {exp.linkedCardId ? <CardIcon size={12} /> : <Wallet size={12} />}
                                                                <span>
                                                                    {exp.linkedCardId
                                                                        ? (creditCards.find(c => c.id === exp.linkedCardId)?.name || 'Tarjeta')
                                                                        : (accounts.find(a => a.id === exp.accountId)?.name || 'Efectivo/Otro')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Acción al pasar el mouse */}
                                                <button
                                                    onClick={() => handleDelete(exp.id)}
                                                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 shadow-lg"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}

                {/* 2. VISTA DE PRESUPUESTO (AGRUPADO) */}
                {viewMode === 'grouped' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                        {Object.entries(
                            expensesList.reduce((acc, exp) => {
                                const catName = exp.category || 'Otros';
                                if (!acc[catName]) acc[catName] = { total: 0, items: [] };
                                acc[catName].items.push(exp);
                                acc[catName].total += exp.amount;
                                return acc;
                            }, {} as Record<string, { total: number, items: ExpenseWithCategory[] }>)
                        ).map(([categoryName, data]) => {
                            const categoryObj = categories.find(c => c.name === categoryName);
                            const limit = categoryObj?.monthlyLimit || 0;
                            const percentage = limit > 0 ? Math.min((data.total / limit) * 100, 100) : 0;
                            const isOverLimit = limit > 0 && data.total > limit;
                            const remaining = Math.max(0, limit - data.total);

                            return (
                                <div key={categoryName} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${categoryObj?.color?.replace('text-', 'bg-').replace('500', '100') || 'bg-zinc-100'} ${categoryObj?.color || 'text-zinc-500'}`}>
                                                    {categoryName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xl text-zinc-900 dark:text-white truncate max-w-[120px]">{categoryName}</h4>
                                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{data.items.length} gastos</p>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-3xl font-black text-zinc-900 dark:text-white mb-4">${data.total.toFixed(0)}</p>

                                        {/* Barra de Presupuesto */}
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
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${isOverLimit ? 'bg-linear-to-r from-orange-400 to-red-500' : 'bg-linear-to-r from-emerald-400 to-emerald-500'}`} style={{ width: `${percentage}%` }} />
                                                ) : (
                                                    <div className="w-full h-full opacity-20 bg-zinc-300 dark:bg-zinc-600" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nota al pie de acción */}
                                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                                        <button onClick={() => { setSearchQuery(categoryName); setViewMode('list'); }} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-wider">
                                            Ver Detalles
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 3. VISTA DE SUSCRIPCIONES */}
                {viewMode === 'subscriptions' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Widget de Resumen */}
                        <div className="relative overflow-hidden rounded-[3rem] bg-indigo-600 text-white p-10 shadow-xl shadow-indigo-500/30">
                            <div className="absolute top-0 right-0 p-12 opacity-20 transform rotate-12">
                                <Calendar size={200} />
                            </div>
                            <h3 className="text-xl font-medium text-indigo-200 mb-2">Gastos Fijos Mensuales</h3>
                            <h2 className="text-6xl font-black tracking-tighter mb-4">
                                ${expensesList.filter(e => e.isRecurring).reduce((s, e) => s + e.amount, 0).toLocaleString()}
                            </h2>
                            <p className="max-w-md text-indigo-100 text-sm font-medium leading-relaxed opacity-80">
                                Total de tus suscripciones y pagos recurrentes. Este es tu "costo de vida" base.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {expensesList.filter(e => e.isRecurring).map((exp) => (
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
                                        <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">-${exp.amount.toFixed(0)}</p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-zinc-400 font-bold">Mensual</span>
                                        <button onClick={() => handleDelete(exp.id)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">Cancelar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE GESTOR DE CATEGORÍAS */}
            {showCategoryManager && (
                <CategoryManager
                    categories={categories}
                    profileId={profileId}
                    onClose={() => setShowCategoryManager(false)}
                    onUpdate={() => {
                        onUpdate();
                    }}
                />
            )}

            {/* MODAL DE ASISTENTE */}
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
