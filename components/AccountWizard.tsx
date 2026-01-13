'use client';

import { useState } from 'react';
import { createAccount } from '@/app/actions/budget';
import { toast } from 'sonner';
import { Landmark, Wallet, Banknote, PiggyBank, ArrowRight, X } from "lucide-react";

interface AccountWizardProps {
    profileId: number;
    onClose: () => void;
    onSuccess: () => void;
}

type AccountType = 'BANK' | 'CASH' | 'WALLET' | 'SAVINGS';

export default function AccountWizard({ profileId, onClose, onSuccess }: AccountWizardProps) {
    const [step, setStep] = useState(1);
    const [type, setType] = useState<AccountType | null>(null);
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTypeSelect = (selectedType: AccountType) => {
        setType(selectedType);
        if (selectedType === 'CASH') {
            setName('Efectivo');
        } else {
            setName('');
        }
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!type || !name || !balance) return;

        setLoading(true);
        try {
            await createAccount(name, type, parseFloat(balance), profileId);
            toast.success("¡Cuenta creada!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear cuenta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Nueva Cuenta</h2>
                        <p className="text-zinc-500 text-sm">Paso {step} de 2</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto">
                    {step === 1 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <OptionCard
                                icon={<Landmark className="w-8 h-8 text-blue-500" />}
                                title="Cuenta Bancaria"
                                description="Corriente o Ahorros básicos"
                                onClick={() => handleTypeSelect('BANK')}
                            />
                            <OptionCard
                                icon={<Banknote className="w-8 h-8 text-emerald-500" />}
                                title="Efectivo"
                                description="Dinero físico en mano"
                                onClick={() => handleTypeSelect('CASH')}
                            />
                            <OptionCard
                                icon={<Wallet className="w-8 h-8 text-purple-500" />}
                                title="Billetera Digital"
                                description="PayPal, Yappy, Binance..."
                                onClick={() => handleTypeSelect('WALLET')}
                            />
                            <OptionCard
                                icon={<PiggyBank className="w-8 h-8 text-pink-500" />}
                                title="Ahorros"
                                description="Cuenta separada para ahorrar"
                                onClick={() => handleTypeSelect('SAVINGS')}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Nombre de la cuenta</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={type === 'CASH'}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-4 text-lg font-bold outline-none focus:border-indigo-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                                    placeholder={type === 'BANK' ? 'Ej: Banco General' : 'Nombre...'}
                                    autoFocus
                                />
                                {type === 'CASH' && <p className="text-xs text-amber-500">El nombre es fijo para cuentas de efectivo.</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Saldo Inicial</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={balance}
                                        onChange={(e) => setBalance(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-4 pl-8 text-lg font-bold outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Atrás
                        </button>
                    )}
                    {step === 2 && (
                        <button
                            onClick={handleSubmit}
                            disabled={!name || !balance || loading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? 'Creando...' : 'Crear Cuenta'}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function OptionCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all group"
        >
            <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300 bg-white dark:bg-zinc-800 p-4 rounded-full shadow-sm">
                {icon}
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{description}</p>
        </button>
    );
}
