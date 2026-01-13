'use client';

import { useState, useEffect } from 'react';
import { createProfile, getProfiles, createExpense, createGoal, deleteExpense } from '@/app/actions/budget';
import { Profile, Expense, Goal } from '@prisma/client';
import { toast } from 'sonner';

// Tipos extendidos para incluir relaciones
type ProfileWithData = Profile & {
    expenses: Expense[];
    goals: Goal[];
};

export default function BudgetPage() {
    const [profiles, setProfiles] = useState<ProfileWithData[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'expenses' | 'goals'>('expenses');

    // Form States
    const [newProfileName, setNewProfileName] = useState('');
    const [expenseForm, setExpenseForm] = useState({
        name: '',
        amount: '',
        category: 'Fijo',
        dueDate: ''
    });
    const [goalForm, setGoalForm] = useState({
        name: '',
        targetAmount: '',
        deadline: ''
    });

    useEffect(() => {
        loadProfiles();
    }, []);

    async function loadProfiles() {
        try {
            // @ts-ignore
            const data = await getProfiles();
            setProfiles(data as any);
            if (data.length > 0 && !selectedProfileId) {
                setSelectedProfileId(data[0].id);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando perfiles");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateProfile() {
        if (!newProfileName.trim()) return;
        try {
            await createProfile(newProfileName);
            await loadProfiles();
            setNewProfileName('');
            toast.success("Perfil creado");
        } catch (error) {
            toast.error("Error creando perfil");
        }
    }

    async function handleAddExpense() {
        if (!selectedProfileId || !expenseForm.name || !expenseForm.amount) return;
        try {
            await createExpense({
                name: expenseForm.name,
                amount: parseFloat(expenseForm.amount),
                category: expenseForm.category,
                profileId: selectedProfileId,
                dueDate: expenseForm.dueDate ? parseInt(expenseForm.dueDate) : undefined
            });
            await loadProfiles();
            setExpenseForm({ name: '', amount: '', category: 'Fijo', dueDate: '' });
            toast.success("Gasto agregado");
        } catch (error) {
            toast.error("Error agregando gasto");
        }
    }

    async function handleCreateGoal() {
        if (!selectedProfileId || !goalForm.name || !goalForm.targetAmount) return;
        try {
            await createGoal({
                name: goalForm.name,
                targetAmount: parseFloat(goalForm.targetAmount),
                profileId: selectedProfileId,
                deadline: goalForm.deadline ? new Date(goalForm.deadline) : undefined
            });
            await loadProfiles();
            setGoalForm({ name: '', targetAmount: '', deadline: '' });
            toast.success("Meta creada");
        } catch (error) {
            toast.error("Error creando meta");
        }
    }

    async function handleDeleteExpense(id: number) {
        try {
            await deleteExpense(id);
            await loadProfiles();
            toast.success("Gasto eliminado");
        } catch (error) {
            toast.error("Error eliminando gasto");
        }
    }

    if (loading) return <div className="p-8 text-white">Cargando presupuesto...</div>;

    const activeProfile = profiles.find(p => p.id === selectedProfileId);
    const totalExpenses = activeProfile?.expenses.reduce((sum, exp) => sum + exp.amount, 0) || 0;
    const totalGoals = activeProfile?.goals.reduce((sum, g) => sum + g.currentAmount, 0) || 0;

    return (
        <div className="min-h-screen p-8 pb-24 text-zinc-100">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-500 mb-8">
                Presupuesto & Metas
            </h1>

            {/* SELECCION DE PERFIL */}
            <div className="flex flex-wrap gap-4 mb-8 items-center">
                {profiles.map(profile => (
                    <button
                        key={profile.id}
                        onClick={() => setSelectedProfileId(profile.id)}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${selectedProfileId === profile.id
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        {profile.name}
                    </button>
                ))}

                <div className="flex items-center gap-2 bg-zinc-800/50 p-1 rounded-full border border-zinc-700">
                    <input
                        className="bg-transparent px-3 py-1 outline-none text-sm w-32"
                        placeholder="Nuevo Perfil..."
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                    />
                    <button
                        onClick={handleCreateProfile}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold"
                    >
                        +
                    </button>
                </div>
            </div>

            {activeProfile ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* COLUMNA 1: FORMULARIOS */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Selector de Modo */}
                        <div className="flex bg-zinc-900 rounded-2xl p-1 border border-zinc-800">
                            <button
                                onClick={() => setActiveTab('expenses')}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Gastos
                            </button>
                            <button
                                onClick={() => setActiveTab('goals')}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'goals' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Metas
                            </button>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl sticky top-8">
                            {activeTab === 'expenses' ? (
                                <>
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <span className="text-emerald-400">+</span> Agregar Gasto
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase">Nombre</label>
                                            <input
                                                className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                                value={expenseForm.name}
                                                onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })}
                                                placeholder="Ej: Internet"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Monto</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                                    value={expenseForm.amount}
                                                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Día Pago</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                                    value={expenseForm.dueDate}
                                                    onChange={e => setExpenseForm({ ...expenseForm, dueDate: e.target.value })}
                                                    placeholder="Ej: 15"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase">Categoría</label>
                                            <select
                                                className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                                value={expenseForm.category}
                                                onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                            >
                                                <option value="Fijo">Gastos Fijos</option>
                                                <option value="Variable">Gastos Variables</option>
                                                <option value="Ahorro">Ahorro / Inversión</option>
                                                <option value="Deuda">Deudas</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleAddExpense}
                                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            Guardar Gasto
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <span className="text-cyan-400">🎯</span> Nueva Meta
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase">Nombre de Meta</label>
                                            <input
                                                className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                                                value={goalForm.name}
                                                onChange={e => setGoalForm({ ...goalForm, name: e.target.value })}
                                                placeholder="Ej: Viaje a Japón"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase">Monto Objetivo</label>
                                            <input
                                                type="number"
                                                className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                                                value={goalForm.targetAmount}
                                                onChange={e => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                                                placeholder="5000.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase">Fecha Límite (Opcional)</label>
                                            <input
                                                type="date"
                                                className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                                                value={goalForm.deadline}
                                                onChange={e => setGoalForm({ ...goalForm, deadline: e.target.value })}
                                            />
                                        </div>
                                        <button
                                            onClick={handleCreateGoal}
                                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                                        >
                                            Crear Meta
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA 2: LISTAS */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Summary Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-linear-to-br from-zinc-800 to-zinc-900 p-6 rounded-3xl border border-zinc-700/50">
                                <h2 className="text-zinc-400 font-medium">Gastos Mensuales</h2>
                                <p className="text-4xl font-black text-white mt-2">${totalExpenses.toFixed(2)}</p>
                            </div>
                            <div className="bg-linear-to-br from-cyan-900/30 to-zinc-900 p-6 rounded-3xl border border-cyan-800/30">
                                <h2 className="text-cyan-400 font-medium">Ahorrado en Metas</h2>
                                <p className="text-4xl font-black text-white mt-2">${totalGoals.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* SECCION METAS */}
                        {activeProfile.goals.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold mb-4 text-zinc-300">Mis Metas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activeProfile.goals.map(goal => {
                                        const progress = (goal.currentAmount / goal.targetAmount) * 100;
                                        return (
                                            <div key={goal.id} className="bg-zinc-900/30 border border-zinc-800/50 p-5 rounded-2xl">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-lg">{goal.name}</h4>
                                                    <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                                                        {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Sin fecha'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm mb-1 text-zinc-400">
                                                    <span>${goal.currentAmount.toFixed(0)} ahorrado</span>
                                                    <span>Meta: ${goal.targetAmount.toFixed(0)}</span>
                                                </div>
                                                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-linear-to-r from-cyan-500 to-emerald-500"
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SECCION GASTOS */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-zinc-300">Historial de Gastos</h3>
                            <div className="space-y-3">
                                {activeProfile.expenses.map((expense) => (
                                    <div key={expense.id} className="group flex items-center justify-between p-4 bg-zinc-900/30 hover:bg-zinc-800 border border-zinc-800/50 rounded-2xl transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                                                ${expense.category === 'Fijo' ? 'bg-blue-500/10 text-blue-400' :
                                                    expense.category === 'Variable' ? 'bg-orange-500/10 text-orange-400' :
                                                        'bg-purple-500/10 text-purple-400'
                                                }`}
                                            >
                                                {expense.category === 'Fijo' ? '🔒' : expense.category === 'Variable' ? '🛒' : '💰'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-zinc-200">{expense.name}</h4>
                                                <p className="text-xs text-zinc-500">
                                                    {expense.category} • {expense.dueDate ? `Día ${expense.dueDate}` : 'Sin fecha'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="font-bold text-zinc-300">${expense.amount.toFixed(2)}</span>
                                            <button
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-2"
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {activeProfile.expenses.length === 0 && (
                                    <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-3xl">
                                        <p>No hay gastos registrados aún</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-24">
                    <p className="text-xl text-zinc-400">Selecciona o crea un perfil para comenzar</p>
                </div>
            )}
        </div>
    );
}
