'use client';

import { useState, useEffect } from 'react';
import { Account } from '@prisma/client';
import { getAccountTransactions, adjustAccountBalance } from '@/app/actions/budget';
import { X, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, DollarSign, Calendar, RefreshCw, Edit2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AccountHistoryModalProps {
    account: Account;
    onClose: () => void;
    onUpdate: () => void;
}

export default function AccountHistoryModal({ account, onClose, onUpdate }: AccountHistoryModalProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Balance Adjustment State
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [newBalance, setNewBalance] = useState(account.balance.toString());
    const [adjustmentReason, setAdjustmentReason] = useState('');

    useEffect(() => {
        loadHistory();
    }, [account.id]);

    async function loadHistory() {
        try {
            const data = await getAccountTransactions(account.id);
            setTransactions(data);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando historial");
        } finally {
            setLoading(false);
        }
    }

    async function handleAdjustBalance() {
        const val = parseFloat(newBalance);
        if (isNaN(val)) {
            toast.error("Monto inválido");
            return;
        }
        if (!adjustmentReason.trim()) {
            toast.error("Debes indicar una razón para el ajuste");
            return;
        }

        try {
            await adjustAccountBalance(account.id, val, adjustmentReason);
            toast.success("Saldo ajustado correctamente");
            setIsAdjusting(false);
            onUpdate(); // Update parent dashboard
            onClose(); // Close modal to reflect changes fully (or reload history/account locally)
        } catch (error) {
            toast.error("Error ajustando saldo");
        }
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'INCOME': return <ArrowDownLeft className="w-5 h-5 text-emerald-500" />;
            case 'EXPENSE': return <ArrowUpRight className="w-5 h-5 text-red-500" />;
            case 'TRANSFER_IN': return <ArrowRightLeft className="w-5 h-5 text-emerald-500" />;
            case 'TRANSFER_OUT': return <ArrowRightLeft className="w-5 h-5 text-red-500" />;
            case 'SALARY': return <DollarSign className="w-5 h-5 text-emerald-500" />;
            default: return <RefreshCw className="w-5 h-5 text-zinc-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{account.name}</h2>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase">{account.type}</span>
                        </div>

                        {!isAdjusting ? (
                            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsAdjusting(true)} title="Clic para ajustar saldo manual">
                                <p className={`text-3xl font-black ${account.balance >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
                                    ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                                <Edit2 className="w-4 h-4 text-zinc-400 group-hover:text-purple-500 transition-colors opacity-0 group-hover:opacity-100" />
                            </div>
                        ) : (
                            <div className="mt-2 bg-white dark:bg-black border border-purple-500/30 rounded-xl p-3 shadow-lg animate-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-purple-600 mb-2 uppercase">Ajuste Manual</p>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="number"
                                        value={newBalance}
                                        onChange={e => setNewBalance(e.target.value)}
                                        className="w-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1 font-bold text-lg outline-none focus:ring-2 ring-purple-500"
                                        placeholder="Nuevo Saldo"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={adjustmentReason}
                                    onChange={e => setAdjustmentReason(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 ring-purple-500 mb-2"
                                    placeholder="Razón (ej: Corrección Banco)"
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsAdjusting(false)} className="text-xs font-bold text-zinc-500 hover:text-zinc-700 px-2 py-1">Cancelar</button>
                                    <button onClick={handleAdjustBalance} className="text-xs font-bold bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 flex items-center gap-1">
                                        <Save size={12} /> Guardar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body - Transaction List */}
                <div className="flex-1 overflow-y-auto p-0 bg-zinc-50 dark:bg-black/20">
                    {loading ? (
                        <div className="flex justify-center p-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500"></div>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                            <Calendar className="w-12 h-12 mb-2 opacity-20" />
                            <p>No hay movimientos registrados</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {transactions.map((tx, idx) => (
                                <div key={`${tx.type}-${tx.id}-${idx}`} className="flex items-center justify-between p-4 hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'INCOME' || tx.type === 'SALARY' || tx.type === 'TRANSFER_IN'
                                                ? 'bg-emerald-100 dark:bg-emerald-900/20'
                                                : 'bg-red-100 dark:bg-red-900/20'
                                            }`}>
                                            {getIcon(tx.type)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{tx.name || tx.description || 'Movimiento'}</p>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <span>{formatDate(tx.date)}</span>
                                                {tx.relatedAccountName && (
                                                    <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">
                                                        {tx.type === 'TRANSFER_IN' ? 'Desde: ' : 'Hacia: '}{tx.relatedAccountName}
                                                    </span>
                                                )}
                                                {tx.category && <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{tx.category}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`font-bold tabular-nums ${tx.type === 'INCOME' || tx.type === 'SALARY' || tx.type === 'TRANSFER_IN'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        {tx.type === 'INCOME' || tx.type === 'SALARY' || tx.type === 'TRANSFER_IN' ? '+' : '-'}${tx.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
