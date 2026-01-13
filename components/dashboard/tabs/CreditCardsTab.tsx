'use client';

import { useState } from 'react';
import { CreditCard, Account } from '@prisma/client';
import { createCreditCard, deleteCreditCard, updateCreditCardBalance, payCreditCard } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/DeleteConfirmation';

interface CreditCardsTabProps {
    creditCards: CreditCard[];
    accounts: Account[];
    profileId: number;
    onUpdate: () => void;
}

export default function CreditCardsTab({ creditCards, accounts, profileId, onUpdate }: CreditCardsTabProps) {
    const [form, setForm] = useState({
        name: '',
        limit: '',
        cutoffDay: '',
        paymentDay: '',
        interestRate: '',
        annualFee: '',
        minPaymentPercentage: '3.0',
        insuranceRate: '0.25'
    });

    // Payment Modal State
    const [payingCardId, setPayingCardId] = useState<number | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentAccountId, setPaymentAccountId] = useState('');

    async function handleCreate() {
        if (!profileId || !form.name || !form.limit) return;
        try {
            await createCreditCard({
                name: form.name,
                limit: parseFloat(form.limit),
                cutoffDay: parseInt(form.cutoffDay || '1'),
                paymentDay: parseInt(form.paymentDay || '1'),
                interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
                annualFee: form.annualFee ? parseFloat(form.annualFee) : undefined,
                minPaymentPercentage: form.minPaymentPercentage ? parseFloat(form.minPaymentPercentage) : 3.0,
                insuranceRate: form.insuranceRate ? parseFloat(form.insuranceRate) : 0.0,
                profileId
            });
            onUpdate();
            setForm({ name: '', limit: '', cutoffDay: '', paymentDay: '', interestRate: '', annualFee: '', minPaymentPercentage: '3.0', insuranceRate: '0.25' });
            toast.success("Tarjeta creada");
        } catch (error) {
            toast.error("Error creando tarjeta");
        }
    }

    async function handleDelete(id: number) {
        confirmDelete(async () => {
            try {
                await deleteCreditCard(id);
                onUpdate();
                toast.success("Tarjeta eliminada");
            } catch (error) {
                toast.error("Error eliminando tarjeta");
            }
        });
    }

    // Handle Manual Charge (Increase Debt)
    async function handleAddCharge(card: CreditCard, amount: number) {
        if ((card.balance + amount) > card.limit) {
            toast.error(`¡Operación rechazada! Excede el límite de crédito.`);
            return;
        }

        try {
            await updateCreditCardBalance(card.id, card.balance + amount);
            onUpdate();
            toast.success(`Cargo de $${amount} agregado`);
        } catch (error) {
            toast.error("Error actualizando tarjeta");
        }
    }

    // Handle Payment (Decrease Debt & Decrease Bank Account)
    function startPayment(card: CreditCard) {
        setPayingCardId(card.id);
        setPaymentAmount(card.balance.toString());
        setPaymentAccountId('');
    }

    async function confirmPayment() {
        if (!payingCardId || !paymentAmount || !paymentAccountId) {
            toast.warning("Debes seleccionar cuenta y monto");
            return;
        }

        try {
            await payCreditCard(payingCardId, parseFloat(paymentAmount), parseInt(paymentAccountId));
            onUpdate();
            toast.success("Pago realizado con éxito");
            setPayingCardId(null);
            setPaymentAmount('');
            setPaymentAccountId('');
        } catch (error) {
            toast.error("Error procesando el pago. Verifique fondos.");
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            {/* Create Card Form */}
            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 rounded-[2rem] shadow-sm dark:shadow-none">
                <h3 className="text-xl md:text-2xl font-bold text-red-500 dark:text-red-400 mb-6 flex items-center gap-3"><span>💳</span> Nueva Tarjeta de Crédito</h3>
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 w-full"><label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Nombre Tarjeta</label><input className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Visa Infinite" /></div>
                    <div className="w-full md:w-32"><label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Límite</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} placeholder="0.00" /></div>
                    <div className="w-full md:w-24"><label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Día Corte</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.cutoffDay} onChange={e => setForm({ ...form, cutoffDay: e.target.value })} placeholder="1" min="1" max="31" /></div>
                    <div className="w-full md:w-24"><label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Día Pago</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.paymentDay} onChange={e => setForm({ ...form, paymentDay: e.target.value })} placeholder="20" min="1" max="31" /></div>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-end mt-4">
                    <div className="w-full md:w-32"><label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Tasa % Anual</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} placeholder="0.0" /></div>
                    <div className="w-full md:w-32"><label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Anualidad</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.annualFee} onChange={e => setForm({ ...form, annualFee: e.target.value })} placeholder="$0.00" /></div>
                    <div className="w-full md:w-32"><label className="text-sm font-bold text-zinc-500 uppercase tracking-wider text-xs">Pago Mín %</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.minPaymentPercentage} onChange={e => setForm({ ...form, minPaymentPercentage: e.target.value })} placeholder="3.0" /></div>
                    <div className="w-full md:w-32"><label className="text-sm font-bold text-zinc-500 uppercase tracking-wider text-xs">Seguro % Mes</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.insuranceRate} onChange={e => setForm({ ...form, insuranceRate: e.target.value })} placeholder="0.25" /></div>

                    <button onClick={handleCreate} className="w-full md:w-auto ml-auto px-8 py-4 bg-red-500 hover:bg-red-400 text-white dark:text-zinc-900 font-black text-lg rounded-2xl transition-all shadow-lg hover:shadow-red-500/20">Agregar</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creditCards.map((card) => {
                    const utilization = (card.balance / card.limit) * 100;
                    const available = card.limit - card.balance;

                    // Fechas
                    const today = new Date();
                    const currentDay = today.getDate();
                    const daysToCutoff = card.cutoffDay - currentDay;
                    const daysToPayment = card.paymentDay - currentDay;

                    let statusMessage = "Consumo Normal";
                    let statusColor = "text-zinc-500";

                    if (utilization > 80) { statusMessage = "¡Cuidado! Límite cerca"; statusColor = "text-red-400"; }
                    else if (daysToPayment >= 0 && daysToPayment <= 3) { statusMessage = `¡Paga en ${daysToPayment} días!`; statusColor = "text-yellow-400 font-black animate-pulse"; }
                    else if (daysToCutoff >= 0 && daysToCutoff <= 3) { statusMessage = `Corte en ${daysToCutoff} días`; statusColor = "text-cyan-400"; }

                    const isPayingThisCard = payingCardId === card.id;

                    return (
                        <div key={card.id} className="relative overflow-hidden bg-linear-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 rounded-[2rem] group transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-2xl hover:shadow-red-500/5">
                            {/* Background decoration */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h4 className="font-black text-xl md:text-2xl text-zinc-900 dark:text-white tracking-tight">{card.name}</h4>
                                        <div className="flex gap-3 text-xs font-bold text-zinc-500 mt-1 uppercase tracking-wider">
                                            <span>✂ Corte: {card.cutoffDay}</span>
                                            <span>📅 Pago: {card.paymentDay}</span>
                                            {card.interestRate && <span>📈 {card.interestRate}%</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(card.id)} className="text-zinc-600 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-xl">✕</button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white/50 dark:bg-black/20 p-4 rounded-2xl border border-zinc-200 dark:border-white/5">
                                        <span className="text-xs font-bold text-zinc-500 uppercase block mb-1">Deuda Actual</span>
                                        <span className="text-2xl font-black text-zinc-900 dark:text-white blur-sensitive">${card.balance.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-4 rounded-2xl border border-zinc-200 dark:border-white/5">
                                        <span className="text-xs font-bold text-zinc-500 uppercase block mb-1">Disponible</span>
                                        <span className="text-2xl font-black text-zinc-400 blur-sensitive">${available.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className={statusColor}>{statusMessage}</span>
                                        <span className="text-zinc-500">{utilization.toFixed(1)}% Usado</span>
                                    </div>
                                    <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out ${utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(utilization, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Payment Interface (Inline) */}
                                {isPayingThisCard ? (
                                    <div className="mt-4 bg-zinc-50 dark:bg-black/40 p-4 rounded-2xl border border-emerald-500/30 animate-in zoom-in-95">
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3 text-center">💸 Realizar Pago</p>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Monto a Pagar ($)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white mt-1"
                                                    value={paymentAmount}
                                                    onChange={e => setPaymentAmount(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Cuenta de Origen</label>
                                                <select
                                                    className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white mt-1"
                                                    value={paymentAccountId}
                                                    onChange={e => setPaymentAccountId(e.target.value)}
                                                >
                                                    <option value="">Seleccionar Cuenta...</option>
                                                    {accounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toFixed(2)})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <button onClick={() => setPayingCardId(null)} className="flex-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 py-2 rounded-xl text-xs font-bold">Cancelar</button>
                                                <button onClick={confirmPayment} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2 rounded-xl text-xs font-bold">Confirmar Pago</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* AUTOMATIC ESTIMATIONS SECTIONS */}
                                        <div className="bg-zinc-50 dark:bg-black/20 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800/50 space-y-3">
                                            {/* ...estimations content kept same... */}
                                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest text-center mb-2">Estimaciones al Corte</p>

                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-500">Pago para no generar intereses</span>
                                                <span className="font-bold text-zinc-900 dark:text-white">${card.balance.toFixed(2)}</span>
                                            </div>

                                            {(card.interestRate && card.balance > 0) && (
                                                <div className="space-y-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                                    {/* ...details... */}
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-zinc-500">Pago Mínimo Sugerido</span>
                                                        <span className="font-bold text-orange-500">
                                                            {(() => {
                                                                const monthlyRate = (card.interestRate || 0) / 100 / 12;
                                                                const insuranceRate = (card.insuranceRate || 0) / 100;
                                                                const capitalRate = (card.minPaymentPercentage || 3) / 100;

                                                                const interestCharge = card.balance * monthlyRate;
                                                                const insuranceCharge = card.balance * insuranceRate;
                                                                const capitalCharge = card.balance * capitalRate;

                                                                const minPayment = interestCharge + insuranceCharge + capitalCharge;
                                                                return `$${Math.max(0, minPayment).toFixed(2)}`;
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                            <button onClick={() => handleAddCharge(card, 50)} className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider">+ $50 Cargo</button>
                                            <button onClick={() => startPayment(card)} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider">Realizar Pago</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
                {creditCards.length === 0 && (
                    <div className="col-span-1 md:col-span-2 text-center py-20 text-zinc-600 bg-zinc-100 dark:bg-zinc-900/20 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                        <p className="text-4xl mb-4">💳</p>
                        <p className="text-xl font-bold text-zinc-900 dark:text-white">Sin tarjetas registradas</p>
                        <p className="text-sm mt-2 text-zinc-500">Agrega tus tarjetas para visualizar deudas y fechas de corte.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
