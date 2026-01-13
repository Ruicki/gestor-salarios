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
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null); // For history modal
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
            {/* Header / Summary */}
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

            {/* Create Wizard */}
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

            {/* History Modal */}
            {selectedAccount && (
                <AccountHistoryModal
                    account={selectedAccount}
                    onClose={() => setSelectedAccount(null)}
                    onUpdate={onUpdate}
                />
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => (
                    <div
                        key={acc.id}
                        onClick={() => setSelectedAccount(acc)}
                        className="relative group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl">
                                {getIcon(acc.type)}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }}
                                className="text-zinc-400 hover:text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                title="Eliminar"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    {getTypeName(acc.type)}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 truncate" title={acc.name}>{acc.name}</h3>
                            <div className="mt-4">
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Disponible</p>
                                <p className={`text-3xl font-black ${acc.balance >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
                                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {accounts.length === 0 && !isCreating && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Landmark className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="text-zinc-400 font-medium text-lg">No has añadido ninguna cuenta aún.</p>
                        <p className="text-zinc-500 text-sm">Registra tus cuentas bancarias o efectivo para controlar tu liquidez.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
