'use client';

import { useState } from 'react';
import confetti from 'canvas-confetti';
import { Goal } from '@prisma/client';
import { createGoal, deleteGoal, handleGoalTransaction, updateGoal, deleteGoalWithReclaim } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/DeleteConfirmation';
import { Pencil, Trash2, X, PiggyBank, Calculator, Plus, Eye, EyeOff } from 'lucide-react';

interface GoalsTabProps {
    goals: Goal[];
    accounts: any[];
    profileId: number;
    onUpdate: () => void;
}

export default function GoalsTab({ goals, accounts, profileId, onUpdate }: GoalsTabProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        name: '',
        targetAmount: '',
        deadline: '',
        type: 'VARIABLE', // VARIABLE | FIXED
        frequency: 'MONTHLY',
        contributionAmount: '',
        priority: 'MEDIUM',
        sourceAccountId: ''
    });

    const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

    // Transaction States
    const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
    const [transactionAmount, setTransactionAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');

    // --- FORM HANDLERS ---
    function openNewGoalModal() {
        setEditingGoalId(null);
        setForm({
            name: '', targetAmount: '', deadline: '', type: 'VARIABLE',
            frequency: 'MONTHLY', contributionAmount: '', priority: 'MEDIUM', sourceAccountId: ''
        });
        setIsModalOpen(true);
    }

    function openEditGoalModal(goal: Goal) {
        setEditingGoalId(goal.id);
        setForm({
            name: goal.name,
            targetAmount: goal.targetAmount.toString(),
            deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
            type: goal.type,
            frequency: goal.frequency || 'MONTHLY',
            contributionAmount: goal.contributionAmount?.toString() || '',
            priority: goal.priority || 'MEDIUM',
            sourceAccountId: goal.sourceAccountId?.toString() || ''
        });
        setIsModalOpen(true);
    }

    async function handleSave() {
        if (!profileId || !form.name || !form.targetAmount) {
            toast.error("Nombre y Objetivo son obligatorios");
            return;
        }

        if (form.type === 'FIXED' && !form.sourceAccountId) {
            toast.error("Para metas fijas debes vincular una cuenta de origen");
            return;
        }

        try {
            const payload = {
                name: form.name,
                targetAmount: parseFloat(form.targetAmount),
                deadline: form.deadline ? new Date(form.deadline) : undefined,
                type: form.type,
                frequency: form.type === 'FIXED' ? form.frequency : undefined,
                contributionAmount: form.type === 'FIXED' ? parseFloat(form.contributionAmount || '0') : undefined,
                priority: form.priority,
                sourceAccountId: form.sourceAccountId ? parseInt(form.sourceAccountId) : undefined
            };

            if (editingGoalId) {
                await updateGoal(editingGoalId, payload);
                toast.success("Meta actualizada");
            } else {
                await createGoal({ ...payload, profileId });
                toast.success("Meta creada");
            }
            onUpdate();
            setIsModalOpen(false);
        } catch (error) {
            toast.error("Error al guardar meta");
        }
    }



    // --- SMART CALCULATOR (Helper) ---
    const calculateRecommendedSaving = () => {
        if (!form.targetAmount || !form.deadline) return null;
        const target = parseFloat(form.targetAmount);
        const deadlineDate = new Date(form.deadline);
        const today = new Date();

        // Difference in months
        const diffTime = Math.abs(deadlineDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = diffDays / 7;
        const months = diffDays / 30; // Approx

        if (months <= 0) return null;

        return {
            monthly: target / months,
            biweekly: target / (months * 2),
            weekly: target / weeks
        };
    };

    const recommended = calculateRecommendedSaving();

    // --- UI COMPONENTS ---
    const GoalCard = ({ goal }: { goal: Goal }) => {
        const [isRevealed, setIsRevealed] = useState(false);
        const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

        // Priority Badge Color
        const priorityColors = {
            'HIGH': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            'MEDIUM': 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
            'LOW': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
        };

        const priorityLabel = { 'HIGH': 'Alta', 'MEDIUM': 'Media', 'LOW': 'Baja' };

        return (
            <div className={`bg-white dark:bg-zinc-900/50 border ${percentage >= 100 ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800'} p-6 rounded-[2.5rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all`}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="font-bold text-xl text-zinc-900 dark:text-white leading-tight">{goal.name}</h4>
                            {goal.priority && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${priorityColors[goal.priority as keyof typeof priorityColors] || priorityColors.MEDIUM}`}>
                                    {priorityLabel[goal.priority as keyof typeof priorityLabel] || 'Normal'}
                                </span>
                            )}
                        </div>
                        <span>{goal.type === 'FIXED' ? 'Fijo' : 'Flexible'}</span>
                        {goal.type === 'FIXED' && <span className="text-zinc-300">•</span>}
                        {goal.type === 'FIXED' && <span>{goal.frequency}</span>}
                        {goal.type === 'FIXED' && goal.sourceAccountId && (
                            <>
                                <span className="text-zinc-300">•</span>
                                <span className="text-zinc-400 capitalize flex items-center gap-1">
                                    De: {accounts.find(a => a.id === goal.sourceAccountId)?.name || 'Cuenta Eliminada'}
                                </span>
                            </>
                        )}

                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-1">
                    <button onClick={() => openEditGoalModal(goal)} className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"><Pencil size={18} /></button>
                    <button onClick={() => handleSmartDelete(goal)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>


                {/* MAIN AMOUNT - PIGGY BANK LOGIC */}
                <div className="flex items-end gap-3 mb-6 cursor-pointer group/piggy" onClick={() => setIsRevealed(!isRevealed)}>
                    <div className={`p-3 rounded-2xl transition-all duration-500 ${isRevealed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-pink-100 text-pink-500 dark:bg-pink-500/20 dark:text-pink-400 rotate-0 group-hover/piggy:rotate-12'}`}>
                        <PiggyBank size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Ahorrado</p>
                        {isRevealed ? (
                            <span className="text-3xl font-black text-zinc-900 dark:text-white animate-in fade-in zoom-in duration-300">
                                ${goal.currentAmount.toFixed(2)}
                            </span>
                        ) : (
                            <span className="text-3xl font-black text-zinc-200 dark:text-zinc-700 select-none">
                                $••••
                            </span>
                        )}
                    </div>
                </div>

                {/* PROGRESS */}
                <div className="mb-6">
                    <div className="flex justify-between text-xs font-bold mb-2">
                        {percentage >= 100 ? (
                            <span className="text-emerald-500 flex items-center gap-1">
                                ¡COMPLETADA! 🏆
                            </span>
                        ) : (
                            <span className="text-zinc-500">{percentage.toFixed(0)}%</span>
                        )}
                        <span className="text-zinc-400">Meta: ${goal.targetAmount.toFixed(0)}</span>
                    </div>
                    <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${percentage >= 100 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-linear-to-r from-pink-500 to-rose-500'}`}
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                    {/* CELEBRATION BUTTON (Only if complete) */}
                    {percentage >= 100 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSmartDelete(goal);
                            }}
                            className="w-full mt-4 py-3 rounded-xl bg-linear-to-r from-emerald-400 to-teal-500 text-white font-black hover:scale-105 transition-all shadow-lg animate-pulse flex items-center justify-center gap-2"
                        >
                            🎉 ¡Meta Cumplida! Reclamar
                        </button>
                    )}
                </div>

                {/* EXPANDABLE ACTIONS AREA (Hide if complete to focus on Reclaim) */}
                {percentage < 100 && (
                    <>
                        {
                            expandedGoalId === goal.id ? (
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl animate-in fade-in slide-in-from-top-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold text-zinc-500 uppercase">Gestionar Fondos</span>
                                        <button onClick={() => setExpandedGoalId(null)} className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-800"><X size={14} /></button>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                                        <span className="text-zinc-400 font-bold pl-2">$</span>
                                        <input
                                            type="number"
                                            autoFocus
                                            value={transactionAmount}
                                            onChange={e => setTransactionAmount(e.target.value)}
                                            className="w-full bg-transparent outline-none font-bold text-lg text-zinc-900 dark:text-white"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        {goal.type === 'FIXED' && goal.sourceAccountId ? (
                                            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex justify-between items-center opacity-75">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-zinc-400 uppercase">Debitar de:</span>
                                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                                        {accounts.find(a => a.id === goal.sourceAccountId)?.name}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-zinc-500">Vinculada</span>
                                            </div>
                                        ) : (
                                            <select
                                                value={selectedAccountId}
                                                onChange={e => setSelectedAccountId(e.target.value)}
                                                className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 outline-none"
                                            >
                                                <option value="">Seleccionar Cuenta...</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleTransaction(goal.id, goal.currentAmount, 'DEPOSIT')} className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all">
                                            Depositar
                                        </button>
                                        <button onClick={() => handleTransaction(goal.id, goal.currentAmount, 'WITHDRAW')} className="p-3 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-900/30 rounded-xl font-bold text-sm transition-all">
                                            Retirar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setExpandedGoalId(goal.id);
                                        // Pre-fill default contribution if fixed
                                        if (goal.type === 'FIXED' && goal.contributionAmount) {
                                            setTransactionAmount(goal.contributionAmount.toString());
                                            // Also pre-select source account if available
                                            if (goal.sourceAccountId) setSelectedAccountId(goal.sourceAccountId.toString());
                                        } else {
                                            setTransactionAmount('');
                                        }
                                    }}
                                    className="w-full py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold text-sm transition-all flex items-center justify-center gap-2 group-hover:text-zinc-900 dark:group-hover:text-white border border-dashed border-zinc-200 dark:border-zinc-700"
                                >
                                    <Plus size={18} />
                                    <span>Agregar / Retirar</span>
                                </button>
                            )
                        }
                    </>
                )}
            </div >
        );
    };

    // --- RECLAIM LOGIC ---
    const [reclaimModal, setReclaimModal] = useState<{ isOpen: boolean; goal: Goal | null }>({ isOpen: false, goal: null });
    const [reclaimAccountId, setReclaimAccountId] = useState('');
    const [isReclaiming, setIsReclaiming] = useState(false);

    async function handleDelete(id: number) {
        if (await confirmDelete("¿Borrar meta?", "Esta acción no se puede deshacer")) {
            try {
                await deleteGoal(id);
                toast.success("Meta eliminada");
                onUpdate();
            } catch (error) {
                toast.error("Error al eliminar");
            }
        }
    }

    async function handleTransaction(goalId: number, currentAmount: number, type: 'DEPOSIT' | 'WITHDRAW') {
        const amount = parseFloat(transactionAmount);

        if (!amount || amount <= 0) {
            toast.error("Monto inválido");
            return;
        }

        if (type === 'WITHDRAW' && amount > currentAmount) {
            toast.error("Fondos insuficientes en la meta");
            return;
        }

        if (type === 'WITHDRAW' && !selectedAccountId) {
            toast.error("Selecciona cuenta destino");
            return;
        }

        try {
            await handleGoalTransaction(goalId, amount, type, selectedAccountId ? parseInt(selectedAccountId) : undefined);
            if (type === 'DEPOSIT') {
                toast.success("¡Excelente! Un paso más cerca de tu meta 🚀");
            } else {
                toast.success("Uff, qué mal... Ojalá vuelvas a depositar pronto 📉");
            }
            setTransactionAmount('');
            setExpandedGoalId(null);
            onUpdate();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error en transacción");
        }
    }

    async function handleSmartDelete(goal: Goal) {
        if (goal.currentAmount > 0) {
            // Open Reclaim Modal
            setReclaimModal({ isOpen: true, goal });
            setReclaimAccountId(''); // Reset selection
        } else {
            // Standard Delete
            handleDelete(goal.id);
        }
    }

    async function executeReclaim() {
        if (!reclaimModal.goal || !reclaimAccountId) {
            toast.error("Selecciona una cuenta de destino");
            return;
        }

        setIsReclaiming(true); // START LOADING

        try {
            await deleteGoalWithReclaim(reclaimModal.goal.id, parseInt(reclaimAccountId));

            // Celebration if goal was effectively reached (e.g., > 99%)
            const isSuccess = (reclaimModal.goal.currentAmount / reclaimModal.goal.targetAmount) >= 0.99;

            if (isSuccess) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10b981', '#34d399', '#fdf2f8', '#f472b6']
                });
                toast.success("¡Felicidades! Meta alcanzada y fondos reclamados 🎉");
            } else {
                toast.success("Fondos recuperados correctamente 💰");
            }

            onUpdate();
            setReclaimModal({ isOpen: false, goal: null });
        } catch (error) {
            toast.error("Error al reclamar fondos");
        } finally {
            setIsReclaiming(false); // END LOADING
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ACTION HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-linear-to-br from-pink-500 to-rose-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                <div className="relative z-10 text-center md:text-left">
                    <h2 className="text-3xl font-black mb-2">Tus Metas</h2>
                    <p className="text-pink-100 font-medium">Visualiza, planea y alcanza tus sueños.</p>
                </div>
                <button
                    onClick={openNewGoalModal}
                    className="relative z-10 mt-6 md:mt-0 bg-white text-pink-600 hover:bg-pink-50 px-6 py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                >
                    <Plus size={24} />
                    Nueva Meta
                </button>
                {/* Decoration */}
                <PiggyBank className="absolute -bottom-6 -right-6 w-48 h-48 text-white opacity-10 rotate-12" />
            </div>

            {/* GOALS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => (
                    <div key={goal.id} className="relative"> {/* Wrapper for positioning context if needed */}
                        <GoalCard goal={goal} />
                    </div>
                ))}

                {goals.length === 0 && (
                    <div className="col-span-full py-20 text-center text-zinc-400">
                        <PiggyBank size={64} className="mx-auto mb-4 opacity-20" />
                        <p className="text-xl font-bold">Sin metas activas</p>
                        <p>¡Crea tu primera alcancía virtual hoy!</p>
                    </div>
                )}
            </div>

            {/* RECLAIM MODAL */}
            {reclaimModal.isOpen && reclaimModal.goal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 text-center">
                        <div className="mb-6 flex justify-center">
                            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full animate-bounce">
                                <PiggyBank size={48} />
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
                            ¡Romper Alcancía!
                        </h3>
                        <p className="text-zinc-500 mb-6 font-medium">
                            Estás eliminando la meta <strong>{reclaimModal.goal.name}</strong> que tiene fondos acumulados.
                        </p>

                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl mb-6">
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Montos a Recuperar</p>
                            <p className="text-4xl font-black text-emerald-500">${reclaimModal.goal.currentAmount.toFixed(2)}</p>
                        </div>

                        <div className="mb-8 text-left">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-2 mb-2 block">¿A dónde enviamos el dinero?</label>
                            <select
                                value={reclaimAccountId}
                                onChange={e => setReclaimAccountId(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 outline-none"
                            >
                                <option value="">Seleccionar Cuenta...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setReclaimModal({ isOpen: false, goal: null })}
                                className="p-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeReclaim}
                                disabled={!reclaimAccountId || isReclaiming}
                                className="p-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isReclaiming ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <span>Reclamar</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FORM MODAL (Existing) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                {editingGoalId ? 'Editar Meta' : 'Nueva Meta'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full hover:bg-zinc-200 transition-colors"><X size={20} /></button>
                        </div>

                        <div className="space-y-6">
                            {/* Nombre y Monto */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Nombre</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent focus:border-pink-500 focus:bg-white dark:focus:bg-zinc-950 rounded-2xl px-5 py-4 font-bold text-lg outline-none transition-all" placeholder="Ej: Auto Nuevo" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Monto Objetivo</label>
                                    <input type="number" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent focus:border-pink-500 focus:bg-white dark:focus:bg-zinc-950 rounded-2xl px-5 py-4 font-bold text-lg outline-none transition-all" placeholder="0.00" />
                                </div>
                            </div>

                            {/* Priority & Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Prioridad</label>
                                    <div className="flex gap-2 mt-2">
                                        {['HIGH', 'MEDIUM', 'LOW'].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setForm({ ...form, priority: p })}
                                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${form.priority === p
                                                    ? (p === 'HIGH' ? 'bg-red-500 border-red-500 text-white' : p === 'MEDIUM' ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-blue-500 border-blue-500 text-white')
                                                    : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}
                                            >
                                                {p === 'HIGH' ? 'Alta 🔴' : p === 'MEDIUM' ? 'Media 🟡' : 'Baja 🔵'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Tipo</label>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setForm({ ...form, type: 'VARIABLE' })} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${form.type === 'VARIABLE' ? 'bg-zinc-800 text-white border-zinc-800' : 'text-zinc-400 border-zinc-100'}`}>Flexible</button>
                                        <button onClick={() => setForm({ ...form, type: 'FIXED' })} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${form.type === 'FIXED' ? 'bg-zinc-800 text-white border-zinc-800' : 'text-zinc-400 border-zinc-100'}`}>Fijo</button>
                                    </div>
                                </div>
                            </div>

                            {/* SMART CALCULATOR PREVIEW */}
                            {form.targetAmount && form.deadline && recommended && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800/30">
                                    <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                                        <Calculator size={20} />
                                        <span className="font-bold text-sm">Calculadora Inteligente</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl">
                                            <p className="text-[10px] uppercase font-bold text-zinc-400">Mensual</p>
                                            <p className="font-black text-indigo-600 dark:text-indigo-400">${recommended.monthly.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl">
                                            <p className="text-[10px] uppercase font-bold text-zinc-400">Quincenal</p>
                                            <p className="font-black text-indigo-600 dark:text-indigo-400">${recommended.biweekly.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl">
                                            <p className="text-[10px] uppercase font-bold text-zinc-400">Semanal</p>
                                            <p className="font-black text-indigo-600 dark:text-indigo-400">${recommended.weekly.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FIXED OPTIONS */}
                            {form.type === 'FIXED' && (
                                <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl space-y-4 animate-in fade-in">
                                    <p className="text-xs font-bold text-zinc-400 uppercase">Configuración de Ahorro Automático</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 ml-2">Frecuencia</label>
                                            <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full mt-2 bg-white dark:bg-zinc-900 border-none rounded-xl p-3 font-bold text-sm outline-none">
                                                <option value="WEEKLY">Semanal</option>
                                                <option value="BIWEEKLY">Quincenal</option>
                                                <option value="MONTHLY">Mensual</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 ml-2">Cuota ($)</label>
                                            <input type="number" value={form.contributionAmount} onChange={e => setForm({ ...form, contributionAmount: e.target.value })} className="w-full mt-2 bg-white dark:bg-zinc-900 border-none rounded-xl p-3 font-bold text-sm outline-none" placeholder="100" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 ml-2">Cuenta de Origen (Auto-Débito)</label>
                                        <select value={form.sourceAccountId} onChange={e => setForm({ ...form, sourceAccountId: e.target.value })} className="w-full mt-2 bg-white dark:bg-zinc-900 border-none rounded-xl p-3 font-bold text-sm outline-none">
                                            <option value="">Seleccionar Cuenta...</option>
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* DEADLINE (For everyone) */}
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Fecha Límite</label>
                                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent rounded-2xl px-5 py-4 font-bold text-lg outline-none mt-2" />
                            </div>

                            <button onClick={handleSave} className="w-full py-5 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">
                                {editingGoalId ? 'Guardar Cambios' : 'Crear Meta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
