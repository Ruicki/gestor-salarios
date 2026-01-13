'use client';

import React, { useState } from 'react';
import { CreditCard, Loan, Account } from "@prisma/client";
import { Plus, CreditCard as CardIcon, DollarSign, Wallet, X, Calendar, TrendingDown, Percent, Building } from 'lucide-react';
import { toast } from 'sonner';
import { createLoan, deleteLoan, payLoan, CreateLoanInput } from '@/app/actions/debts';
import { createCreditCard, deleteCreditCard, payCreditCard } from '@/app/actions/budget';
import { confirmDelete } from '@/components/DeleteConfirmation';

type DebtsTabProps = {
    creditCards: CreditCard[];
    loans: Loan[];
    accounts: Account[];
    profileId: number;
    onUpdate: () => void;
};

export default function DebtsTab({ creditCards, loans, accounts, profileId, onUpdate }: DebtsTabProps) {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardType, setWizardType] = useState<'CARD' | 'LOAN'>('CARD');

    // Payment Modal
    const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; type: 'CARD' | 'LOAN'; id: number; name: string; maxAmount: number } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentAccountId, setPaymentAccountId] = useState('');

    // Wizard Form State
    const [loanForm, setLoanForm] = useState<CreateLoanInput>({
        name: '', lender: '', type: 'PERSONAL', totalAmount: 0, currentBalance: 0,
        interestRate: 0, termMonths: 12, monthlyPayment: 0, paymentDay: 15, isAutomatic: false, profileId
    });
    const [cardForm, setCardForm] = useState({
        name: '', limit: '', cutoffDay: '', paymentDay: '', interestRate: '', annualFee: '', minPaymentPercentage: '3.0', insuranceRate: '0.25'
    });
    const [submitting, setSubmitting] = useState(false);

    // --- HANDLERS: CREATE ---
    async function handleCreate() {
        if (!profileId) return;
        setSubmitting(true);
        try {
            if (wizardType === 'CARD') {
                if (!cardForm.name || !cardForm.limit) { toast.error("Nombre y Límite requeridos"); return; }
                await createCreditCard({
                    name: cardForm.name,
                    limit: parseFloat(cardForm.limit),
                    cutoffDay: parseInt(cardForm.cutoffDay || '1'),
                    paymentDay: parseInt(cardForm.paymentDay || '1'),
                    interestRate: cardForm.interestRate ? parseFloat(cardForm.interestRate) : undefined,
                    annualFee: cardForm.annualFee ? parseFloat(cardForm.annualFee) : undefined,
                    minPaymentPercentage: cardForm.minPaymentPercentage ? parseFloat(cardForm.minPaymentPercentage) : 3.0,
                    insuranceRate: cardForm.insuranceRate ? parseFloat(cardForm.insuranceRate) : 0.0,
                    profileId
                });
            } else {
                if (!loanForm.name || !loanForm.totalAmount) { toast.error("Nombre y Monto requeridos"); return; }
                await createLoan({
                    ...loanForm,
                    totalAmount: parseFloat(loanForm.totalAmount.toString()), // Ensure number
                    currentBalance: parseFloat(loanForm.totalAmount.toString()), // Initial balance = total
                    profileId
                });
            }
            onUpdate();
            setIsWizardOpen(false);
            toast.success(wizardType === 'CARD' ? "Tarjeta creada" : "Préstamo registrado");
            // Reset forms... (omitted for brevity, ideally reset)
        } catch (error) {
            toast.error("Error creando registro");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    }

    // --- HANDLERS: DELETE ---
    async function handleDelete(id: number, type: 'CARD' | 'LOAN') {
        confirmDelete(async () => {
            try {
                if (type === 'CARD') await deleteCreditCard(id);
                else await deleteLoan(id);
                onUpdate();
                toast.success("Eliminado correctamente");
            } catch (error) { toast.error("Error al eliminar"); }
        });
    }

    // --- HANDLERS: PAY ---
    async function handlePay() {
        if (!paymentModal || !paymentAmount || !paymentAccountId) {
            toast.warning("Completa los campos de pago");
            return;
        }
        setSubmitting(true);
        try {
            const amount = parseFloat(paymentAmount);
            if (amount > paymentModal.maxAmount + 1) { // Small buffer for rounding
                // Optional warning, but let's allow paying full debt
            }

            if (paymentModal.type === 'CARD') {
                await payCreditCard(paymentModal.id, amount, parseInt(paymentAccountId));
            } else {
                await payLoan(paymentModal.id, amount, parseInt(paymentAccountId));
            }
            onUpdate();
            setPaymentModal(null);
            setPaymentAmount('');
            toast.success("Pago registrado exitosamente");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error en el pago");
        } finally {
            setSubmitting(false);
        }
    }

    // --- UI HELPERS ---
    const totalDebt = loans.reduce((acc, l) => acc + l.currentBalance, 0) + creditCards.reduce((acc, c) => acc + c.balance, 0);

    // --- STRATEGY ENGINE ---
    const allDebts = [
        ...loans.map(l => ({ id: l.id, type: 'LOAN', name: l.name, balance: l.currentBalance, rate: l.interestRate || 0 })),
        ...creditCards.map(c => ({ id: c.id, type: 'CARD', name: c.name, balance: c.balance, rate: c.interestRate || 0 }))
    ];
    // Strategy: Avalanche (Highest Rate)
    const avalancheTarget = [...allDebts].sort((a, b) => b.rate - a.rate)[0];
    // Strategy: Snowball (Lowest Balance)
    const snowballTarget = [...allDebts].sort((a, b) => a.balance - b.balance)[0];

    const useAvalanche = avalancheTarget && snowballTarget && (avalancheTarget.rate - snowballTarget.rate > 5);
    const recommended = useAvalanche ? avalancheTarget : snowballTarget;
    const strategyReason = useAvalanche ? "Método Avalancha (Ahorro Interés)" : "Método Bola de Nieve (Motivación)";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* HEADER & KPI */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                        Pasivos <span className="text-lg font-medium text-zinc-400">/ Deudómetro</span>
                    </h2>
                    <p className="text-zinc-500 font-medium">Visualiza y aniquila tus deudas.</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Deuda Total</p>
                    <p className="text-4xl font-black text-red-500">${totalDebt.toLocaleString()}</p>
                </div>
            </div>


            {/* STRATEGY CALCULATION (Hidden Logic) */}
            {(() => {
                // We calculate best strategy here to pass down to cards
                // But since we are mapping, we'll do it inline or repeating is cheap enough for now
                return null;
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- LOANS SECTION --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                            <Wallet className="text-purple-500" /> Préstamos Personales
                        </h3>
                        <button
                            onClick={() => { setWizardType('LOAN'); setIsWizardOpen(true); }}
                            className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {loans.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center text-zinc-400">
                            <Wallet className="mx-auto mb-2 opacity-50" size={32} />
                            No tienes préstamos activos
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {loans.map(loan => {
                                const progress = Math.min(((loan.totalAmount - loan.currentBalance) / loan.totalAmount) * 100, 100);
                                const isRecommended = recommended?.id === loan.id && recommended?.type === 'LOAN';

                                return (
                                    <div key={loan.id} className={`bg-white dark:bg-zinc-900 border ${isRecommended ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-zinc-100 dark:border-zinc-800'} p-5 rounded-3xl shadow-sm hover:shadow-md transition-all group relative`}>
                                        {isRecommended && (
                                            <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-500 text-white text-[10px] uppercase font-bold rounded-full shadow-lg flex items-center gap-1">
                                                <TrendingDown size={12} />
                                                Recomendado por IA
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">{loan.name}</h4>
                                                <p className="text-xs text-zinc-500">{loan.lender} • {loan.type}</p>
                                            </div>
                                            <button onClick={() => handleDelete(loan.id, 'LOAN')} className="opacity-0 group-hover:opacity-100 p-2 text-red-300 hover:text-red-500 transition-opacity">
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <p className="text-sm text-zinc-500">Saldo Restante</p>
                                                <p className="text-2xl font-black text-zinc-900 dark:text-white">${loan.currentBalance.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-zinc-400">Progreso</p>
                                                <p className="text-sm font-bold text-emerald-500">{progress.toFixed(0)}% Pagado</p>
                                            </div>
                                        </div>

                                        {/* Progress Bar (Inverse goal logic: 100% pagado = empty balance) */}
                                        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
                                            <div className="h-full bg-linear-to-r from-purple-500 to-indigo-500" style={{ width: `${progress}%` }}></div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPaymentModal({ isOpen: true, type: 'LOAN', id: loan.id, name: loan.name, maxAmount: loan.currentBalance })}
                                                className="flex-1 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                                            >
                                                <TrendingDown size={16} /> Abonar Capital
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* --- CREDIT CARDS SECTION --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                            <CardIcon className="text-pink-500" /> Tarjetas de Crédito
                        </h3>
                        <button
                            onClick={() => { setWizardType('CARD'); setIsWizardOpen(true); }}
                            className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {creditCards.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center text-zinc-400">
                            <CardIcon className="mx-auto mb-2 opacity-50" size={32} />
                            No tienes tarjetas registradas
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {creditCards.map(card => {
                                const utilization = (card.balance / card.limit) * 100;
                                const available = card.limit - card.balance;
                                const isRecommended = recommended?.id === card.id && recommended?.type === 'CARD';

                                return (
                                    <div key={card.id} className={`relative overflow-hidden ${isRecommended ? 'bg-linear-to-br from-indigo-900 to-zinc-900 ring-4 ring-indigo-500/30' : 'bg-linear-to-br from-zinc-800 to-zinc-950'} text-white p-6 rounded-[2rem] shadow-lg group transition-all`}>
                                        {isRecommended && (
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-[10px] uppercase font-bold rounded-full shadow-lg z-20 flex items-center gap-1 border border-white/20">
                                                <TrendingDown size={12} />
                                                Prioridad Estratégica
                                            </div>
                                        )}
                                        {/* Card Design Elements */}
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <CardIcon className="w-32 h-32" />
                                        </div>

                                        <div className="relative z-10 flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">CREDIT CARD</p>
                                                <h4 className="text-xl font-bold tracking-wide">{card.name}</h4>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDelete(card.id, 'CARD')} className="text-zinc-500 hover:text-white transition-colors p-1"><X size={18} /></button>
                                            </div>
                                        </div>

                                        <div className="relative z-10 grid grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <p className="text-[10px] uppercase text-zinc-400">Deuda Actual</p>
                                                <p className="text-2xl font-mono text-pink-400">${card.balance.toLocaleString()}</p>
                                                {/* Risk Badge */}
                                                {utilization > 30 && (
                                                    <div className={`mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${utilization > 80 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                        {utilization > 80 ? '⚠️ Crítico' : '⚠️ Atención'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase text-zinc-400">Disponible</p>
                                                <p className="text-2xl font-mono text-emerald-400">${available.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex items-center gap-3">
                                            <button
                                                onClick={() => setPaymentModal({ isOpen: true, type: 'CARD', id: card.id, name: card.name, maxAmount: card.balance })}
                                                className="flex-1 py-2 bg-white text-black rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                                            >
                                                Pagar Tarjeta
                                            </button>
                                            <div className="flex flex-col items-end gap-1">
                                                {(() => {
                                                    const today = new Date();
                                                    const currentDay = today.getDate();

                                                    // Logic for Cutoff Status
                                                    let cutoffStatus = { text: '', color: '' };
                                                    const daysToCutoff = card.cutoffDay - currentDay;

                                                    if (daysToCutoff > 5) {
                                                        cutoffStatus = { text: `Corte en ${daysToCutoff} días`, color: 'bg-emerald-500/20 text-emerald-300' };
                                                    } else if (daysToCutoff >= 0) {
                                                        cutoffStatus = { text: `Corte en ${daysToCutoff === 0 ? 'HOY' : daysToCutoff + ' días'}`, color: 'bg-amber-500/20 text-amber-300' };
                                                    } else {
                                                        cutoffStatus = { text: 'Corte Pasado', color: 'bg-zinc-700 text-zinc-400' };
                                                    }

                                                    // Logic for Interest Projection (NEW)
                                                    let interestProjection = null;
                                                    if (card.balance > 0 && card.interestRate) {
                                                        // Simple Interest Est: Balance * (APR/100) / 12
                                                        const estimatedInterest = (card.balance * (card.interestRate / 100)) / 12;
                                                        if (estimatedInterest > 0) {
                                                            interestProjection = (
                                                                <div className="flex items-center gap-1 text-[10px] text-red-300 bg-red-900/30 px-2 py-0.5 rounded-full mt-1 animate-pulse" title="Interés aproximado si no pagas el total">
                                                                    <TrendingDown size={10} />
                                                                    <span>~${estimatedInterest.toFixed(2)} interés/mes</span>
                                                                </div>
                                                            );
                                                        }
                                                    }

                                                    return (
                                                        <>
                                                            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${cutoffStatus.color}`}>
                                                                {cutoffStatus.text}
                                                            </div>
                                                            <span className="text-[10px] text-zinc-400 font-medium">Pago: Día {card.paymentDay}</span>
                                                            {interestProjection}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Usage Bar */}
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-700">
                                            <div className={`h-full ${utilization > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${utilization}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* --- WIZARD MODAL --- */}
            {isWizardOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black">Nuevo Pasivo</h3>
                            <button onClick={() => setIsWizardOpen(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full"><X size={20} /></button>
                        </div>

                        {/* Type Selector */}
                        <div className="grid grid-cols-2 gap-4 mb-8 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-2xl">
                            <button
                                onClick={() => setWizardType('CARD')}
                                className={`py-3 rounded-xl font-bold transition-all ${wizardType === 'CARD' ? 'bg-white dark:bg-black shadow-sm' : 'text-zinc-500'}`}
                            >
                                Tarjeta de Crédito
                            </button>
                            <button
                                onClick={() => setWizardType('LOAN')}
                                className={`py-3 rounded-xl font-bold transition-all ${wizardType === 'LOAN' ? 'bg-white dark:bg-black shadow-sm' : 'text-zinc-500'}`}
                            >
                                Préstamo Personal
                            </button>
                        </div>

                        <div className="space-y-4">
                            {wizardType === 'CARD' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-sm font-bold text-zinc-500">Nombre de la Tarjeta</label>
                                            <input type="text" placeholder="Ej: Visa Infinite" value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-zinc-500">Límite</label>
                                            <input type="number" placeholder="0.00" value={cardForm.limit} onChange={e => setCardForm({ ...cardForm, limit: e.target.value })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-zinc-500">Día de Corte</label>
                                            <input type="number" placeholder="Ej: 15" value={cardForm.cutoffDay} onChange={e => setCardForm({ ...cardForm, cutoffDay: e.target.value })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold" />
                                        </div>
                                    </div>
                                    {/* Advanced fields collapsed or simplified */}
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-sm font-bold text-zinc-500">Nombre del Préstamo</label>
                                            <input type="text" placeholder="Ej: Préstamo Auto" value={loanForm.name} onChange={e => setLoanForm({ ...loanForm, name: e.target.value })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-zinc-500">Acreedor (Banco/Persona)</label>
                                            <input type="text" placeholder="Ej: Banco General" value={loanForm.lender} onChange={e => setLoanForm({ ...loanForm, lender: e.target.value })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-zinc-500">Monto Original</label>
                                            <input type="number" placeholder="0.00" value={loanForm.totalAmount} onChange={e => setLoanForm({ ...loanForm, totalAmount: parseFloat(e.target.value) })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-zinc-500">Tipo</label>
                                            <select
                                                value={loanForm.type}
                                                onChange={e => setLoanForm({ ...loanForm, type: e.target.value })}
                                                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold appearance-none"
                                            >
                                                <option value="PERSONAL">Personal</option>
                                                <option value="AUTO">Auto</option>
                                                <option value="MORTGAGE">Hipoteca</option>
                                                <option value="OTHER">Otro</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            <button
                                onClick={handleCreate} disabled={submitting}
                                className="w-full py-4 mt-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                            >
                                {submitting ? "Guardando..." : "Guardar Pasivo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PAYMENT MODAL --- */}
            {paymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black">Abonar a {paymentModal.name}</h3>
                            <button onClick={() => setPaymentModal(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl mb-4">
                                <p className="text-xs text-zinc-400 uppercase text-center mb-1">Deuda Actual</p>
                                <p className="text-3xl font-black text-center">${paymentModal.maxAmount.toLocaleString()}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-500">Cuenta de Origen</label>
                                <select
                                    value={paymentAccountId}
                                    onChange={e => setPaymentAccountId(e.target.value)}
                                    className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold"
                                >
                                    <option value="">Seleccionar Cuenta...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-500">Monto a Pagar</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-black text-2xl text-center"
                                />
                            </div>

                            <button
                                onClick={handlePay} disabled={submitting}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg transition-transform flex items-center justify-center gap-2"
                            >
                                {submitting ? "Procesando..." : "Confirmar Pago"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
