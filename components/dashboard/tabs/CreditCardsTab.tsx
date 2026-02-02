'use client';

import { useState } from 'react';
import { ProfileWithData } from '@/types';
import { createCreditCard, deleteCreditCard, updateCreditCardBalance, payCreditCard } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/DeleteConfirmation';
import { TrendingDown } from 'lucide-react';
import UltimateCreditCard from '@/components/cards/UltimateCreditCard';

type CreditCard = ProfileWithData['creditCards'][number];
type Account = ProfileWithData['accounts'][number];

interface CreditCardsTabProps {
    creditCards: CreditCard[];
    accounts: Account[];
    profileId: number;
    profileName: string;
    onUpdate: () => void;
}

export default function CreditCardsTab({ creditCards, accounts, profileId, profileName, onUpdate }: CreditCardsTabProps) {
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

    // Estado del Modal de Pago
    const [payingCardId, setPayingCardId] = useState<number | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentAccountId, setPaymentAccountId] = useState('');

    // Estado de Estrategia
    const [strategy, setStrategy] = useState<'SNOWBALL' | 'AVALANCHE'>('SNOWBALL');

    // Lógica de Ordenamiento
    const activeCards = creditCards.filter(c => Number(c.balance) > 0);
    const inactiveCards = creditCards.filter(c => Number(c.balance) <= 0);

    const sortedActiveCards = [...activeCards].sort((a, b) => {
        if (strategy === 'SNOWBALL') return Number(a.balance) - Number(b.balance); // Menor saldo primero
        return Number(b.interestRate || 0) - Number(a.interestRate || 0); // Mayor interés primero
    });

    const finalSortedCards = [...sortedActiveCards, ...inactiveCards];
    const topPriorityId = sortedActiveCards.length > 0 ? sortedActiveCards[0].id : null;

    async function handleCreate() {
        if (!profileId) {
            toast.error("Error: Perfil no identificado");
            return;
        }
        if (!form.name.trim()) {
            toast.error("El nombre es requerido");
            return;
        }

        const limit = parseFloat(form.limit);
        if (isNaN(limit) || limit <= 0) {
            toast.error("El límite debe ser un número válido mayor a 0");
            return;
        }

        const safeParseFloat = (val: string, defaultVal?: number) => {
            if (!val) return defaultVal;
            const parsed = parseFloat(val);
            return isNaN(parsed) ? defaultVal : parsed;
        };

        try {
            await createCreditCard({
                name: form.name,
                limit: limit,
                cutoffDay: parseInt(form.cutoffDay || '1') || 1,
                paymentDay: parseInt(form.paymentDay || '1') || 1,
                interestRate: safeParseFloat(form.interestRate),
                annualFee: safeParseFloat(form.annualFee),
                minPaymentPercentage: safeParseFloat(form.minPaymentPercentage, 3.0),
                insuranceRate: safeParseFloat(form.insuranceRate, 0.0),
                profileId
            });
            onUpdate();
            // Resetear formulario
            setForm({ name: '', limit: '', cutoffDay: '', paymentDay: '', interestRate: '', annualFee: '', minPaymentPercentage: '3.0', insuranceRate: '0.25' });
            toast.success("Tarjeta creada exitosamente");
        } catch (error) {
            console.error("Error creating card:", error);
            const msg = error instanceof Error ? error.message : "Error desconocido";
            toast.error(`Error al crear la tarjeta: ${msg}`);
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

    // Manejar Cargo Manual (Aumentar Deuda)
    async function handleAddCharge(card: CreditCard, amount: number) {
        if ((Number(card.balance) + amount) > Number(card.limit)) {
            toast.error(`¡Operación rechazada! Excede el límite de crédito.`);
            return;
        }

        try {
            await updateCreditCardBalance(card.id, Number(card.balance) + amount);
            onUpdate();
            toast.success(`Cargo de $${amount} agregado`);
        } catch (error) {
            toast.error("Error actualizando tarjeta");
        }
    }

    // Manejar Pago (Disminuir Deuda y Disminuir Cuenta Bancaria)
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
            {/* Encabezado con Alternador de Estrategia */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-1">Tus Tarjetas</h3>
                    <p className="text-zinc-500 text-sm">Gestiona tus límites y fechas de corte.</p>
                </div>

                {/* --- ESTADOS DEL FORMULARIO --- */}
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl">
                    <button
                        onClick={() => setStrategy('SNOWBALL')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${strategy === 'SNOWBALL' ? 'bg-white dark:bg-black shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                        ❄️ Bola de Nieve
                    </button>
                    <button
                        onClick={() => setStrategy('AVALANCHE')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${strategy === 'AVALANCHE' ? 'bg-white dark:bg-black shadow-sm text-orange-600 dark:text-orange-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                        🏔️ Avalancha
                    </button>
                </div>
            </div>

            {/* Explicación de Estrategia */}
            <div className={`p-4 rounded-2xl border mb-6 flex items-start gap-3 ${strategy === 'SNOWBALL' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-200' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 text-orange-800 dark:text-orange-200'}`}>
                <div className="text-2xl">{strategy === 'SNOWBALL' ? '❄️' : '🏔️'}</div>
                <div>
                    <h4 className="font-bold">Estrategia Activa: {strategy === 'SNOWBALL' ? 'Bola de Nieve' : 'Avalancha'}</h4>
                    <p className="text-sm opacity-80 mt-1">
                        {strategy === 'SNOWBALL'
                            ? "Ataca primero la tarjeta con menor saldo para eliminar deudas rápidamente."
                            : "Ataca primero la tarjeta con mayor tasa de interés para pagar menos a largo plazo."}
                    </p>
                </div>
            </div>


            {/* Formulario de Creación de Tarjeta */}
            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 rounded-4xl shadow-sm dark:shadow-none">
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
                    <div className="w-full md:w-32"><label className="text-zinc-500 uppercase tracking-wider text-xs">Pago Mín %</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.minPaymentPercentage} onChange={e => setForm({ ...form, minPaymentPercentage: e.target.value })} placeholder="3.0" /></div>
                    <div className="w-full md:w-32"><label className="text-zinc-500 uppercase tracking-wider text-xs">Seguro % Mes</label><input type="number" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 mt-2 focus:ring-2 focus:ring-red-500/50 outline-none text-lg text-zinc-900 dark:text-white" value={form.insuranceRate} onChange={e => setForm({ ...form, insuranceRate: e.target.value })} placeholder="0.25" /></div>

                    <button onClick={handleCreate} className="w-full md:w-auto ml-auto px-8 py-4 bg-red-500 hover:bg-red-400 text-white dark:text-zinc-900 font-black text-lg rounded-2xl transition-all shadow-lg hover:shadow-red-500/20">Agregar</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 perspectives-container">
                {finalSortedCards.map((card) => (
                    <UltimateCreditCard
                        key={card.id}
                        card={card}
                        cardholderName={profileName}
                        onPay={(c) => startPayment(c)}
                        onDelete={(id) => handleDelete(id)}
                        onAddCharge={(c) => handleAddCharge(c, 50)}
                    />
                ))}

                {/* Empty State */}
                {finalSortedCards.length === 0 && (
                    <div className="col-span-1 md:col-span-2 text-center py-20 text-zinc-600 bg-zinc-100 dark:bg-zinc-900/20 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                        <p className="text-4xl mb-4">💳</p>
                        <p className="text-xl font-bold text-zinc-900 dark:text-white">Sin tarjetas registradas</p>
                        <p className="text-sm mt-2 text-zinc-500">Agrega tus tarjetas para visualizar deudas y fechas de corte.</p>
                    </div>
                )}
            </div>

            {/* Modal de Pago */}
            {payingCardId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-black mb-6">Pagar Tarjeta</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-zinc-500">Cuenta de Origen</label>
                                <select value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold">
                                    <option value="">Seleccionar...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-zinc-500">Monto</label>
                                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-black text-2xl" placeholder="0.00" />
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setPayingCardId(null)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-bold">Cancelar</button>
                                <button onClick={confirmPayment} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold">Pagar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
