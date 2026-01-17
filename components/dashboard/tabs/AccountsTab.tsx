import { useState } from 'react';
import { Account } from '@prisma/client';
import { deleteAccount } from '@/app/actions/budget';
import { Plus, Trash2, Wallet, Landmark, PiggyBank, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import AccountWizard from '@/components/AccountWizard';
import TransferModal from '@/components/TransferModal';
import AccountHistoryModal from '@/components/AccountHistoryModal';
import { ArrowRightLeft } from 'lucide-react';

interface AccountsTabProps {
    accounts: Account[];
    profileId: number;
    onUpdate: () => void;
}

export default function AccountsTab({ accounts, profileId, onUpdate }: AccountsTabProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null); // Para el modal de historial
    const [loading, setLoading] = useState(false);
    const handleCreateSuccess = () => {
        setIsCreating(false);
        onUpdate();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar esta cuenta?')) return;
        try {
            await deleteAccount(id);
            toast.success('Cuenta eliminada');
            onUpdate();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'BANK': return <Landmark className="w-6 h-6 text-blue-500" />;
            case 'CASH': return <Banknote className="w-6 h-6 text-green-500" />;
            case 'SAVINGS': return <PiggyBank className="w-6 h-6 text-pink-500" />;
            case 'WALLET': return <Wallet className="w-6 h-6 text-purple-500" />;
            default: return <Wallet className="w-6 h-6 text-zinc-500" />;
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'BANK': return 'Banco';
            case 'CASH': return 'Efectivo';
            case 'SAVINGS': return 'Ahorro';
            case 'WALLET': return 'Billetera';
            default: return type;
        }
    };

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Encabezado / Resumen */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Cuentas y Efectivo</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Total Disponible:
                        <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400 text-xl">
                            ${totalBalance.toFixed(2)}
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsTransferring(true)}
                        className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700"
                        title="Transferir entre cuentas"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Transferir</span>
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-bold hover:opacity-80 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nueva Cuenta</span>
                        <span className="sm:hidden">Nueva</span>
                    </button>
                </div>
            </div>

            {/* Asistente de Creación */}
            {isCreating && (
                <AccountWizard
                    profileId={profileId}
                    onClose={() => setIsCreating(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {isTransferring && (
                <TransferModal
                    accounts={accounts}
                    onClose={() => setIsTransferring(false)}
                    onSuccess={onUpdate}
                />
            )}

            {/* Modal de Historial */}
            {selectedAccount && (
                <AccountHistoryModal
                    account={selectedAccount}
                    onClose={() => setSelectedAccount(null)}
                    onUpdate={onUpdate}
                />
            )}

            {/* Lista */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {accounts.map(acc => {
                    const isPositive = acc.balance >= 0;
                    return (
                        <div
                            key={acc.id}
                            onClick={() => setSelectedAccount(acc)}
                            className={`
                                relative group overflow-hidden rounded-[2.5rem] p-8 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-2
                                ${acc.type === 'BANK' ? 'bg-linear-to-br from-zinc-900 to-zinc-800 text-white' : ''}
                                ${acc.type === 'CASH' ? 'bg-linear-to-br from-emerald-500 to-teal-700 text-white' : ''}
                                ${acc.type === 'WALLET' ? 'bg-linear-to-br from-purple-600 to-indigo-800 text-white' : ''}
                                ${acc.type === 'SAVINGS' ? 'bg-linear-to-br from-pink-500 to-rose-700 text-white' : ''}
                                ${!['BANK', 'CASH', 'WALLET', 'SAVINGS'].includes(acc.type) ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800' : ''}
                            `}
                        >
                            {/* Decoraciones de Fondo */}
                            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-black/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                                {/* Encabezado */}
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-2xl backdrop-blur-md ${['BANK', 'CASH', 'WALLET', 'SAVINGS'].includes(acc.type) ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'}`}>
                                        {getIcon(acc.type)}
                                    </div>
                                    {acc.name !== 'Efectivo' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }}
                                            className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${['BANK', 'CASH', 'WALLET', 'SAVINGS'].includes(acc.type) ? 'hover:bg-white/20 text-white' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50'}`}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Contenido */}
                                <div className="mt-8">
                                    <div className="flex items-center gap-2 mb-2 opacity-80">
                                        <span className="text-xs font-bold uppercase tracking-widest">
                                            {getTypeName(acc.type)}
                                        </span>
                                    </div>
                                    <h3 className={`text-xl font-bold truncate mb-1 ${['BANK', 'CASH', 'WALLET', 'SAVINGS'].includes(acc.type) ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                                        {acc.name}
                                    </h3>
                                    <p className={`text-3xl md:text-3xl lg:text-3xl font-black tracking-tight ${['BANK', 'CASH', 'WALLET', 'SAVINGS'].includes(acc.type) ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {accounts.length === 0 && !isCreating && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Landmark className="w-10 h-10 text-zinc-300" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Sin cuentas activas</h3>
                        <p className="text-zinc-500 max-w-sm mx-auto">
                            {/* Lógica para Reversión (Si es necesario, lógica futura) */}Comienza agregando tu primera cuenta bancaria o efectivo para llevar el control.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="mt-6 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform"
                        >
                            Crear Cuenta
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
