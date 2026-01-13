import { useState } from 'react';
import { AdditionalIncome, Salary, Account } from '@prisma/client';
import { deleteIncome } from '@/app/actions/budget'; // Removed createIncome import as it's handled by Wizard
import { toast } from 'sonner';
import { confirmDelete } from '@/components/DeleteConfirmation';
import SalaryCalculator from '@/components/SalaryCalculator';
import IncomeHistory from '@/components/SalaryHistory';
import IncomeWizard from '@/components/IncomeWizard'; // Import Wizard
import { Plus } from 'lucide-react';

interface IncomesTabProps {
    incomes: AdditionalIncome[];
    salaries: Salary[];
    accounts: Account[];
    profileId: number;
    customDeductions?: string | null;
    onUpdate: () => void;
}

export default function IncomesTab({ incomes, salaries, accounts, profileId, customDeductions, onUpdate }: IncomesTabProps) {
    const [showIncomeWizard, setShowIncomeWizard] = useState(false);

    const latestSalary = salaries && salaries.length > 0 ? salaries[0] : null;

    async function handleDelete(id: number) {
        confirmDelete(async () => {
            try {
                await deleteIncome(id);
                onUpdate();
                toast.success("Ingreso eliminado");
            } catch (error) {
                toast.error("Error eliminando ingreso");
            }
        });
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-8">
                {/* Hero / Action Section */}
                <div className="relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-black p-10 rounded-[2.5rem] shadow-xl text-center space-y-6">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white/10 dark:bg-black/5 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
                            <Plus className="w-8 h-8 text-white dark:text-black" />
                        </div>
                        <h3 className="text-3xl font-black mb-2 tracking-tight">Nuevo Ingreso</h3>
                        <p className="text-white/70 dark:text-black/60 max-w-sm mx-auto text-lg leading-relaxed">
                            Registra salarios, bonos o dinero extra para mantener tus cuentas claras.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowIncomeWizard(true)}
                        className="relative z-10 bg-white dark:bg-black text-black dark:text-white px-10 py-4 rounded-2xl font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg"
                    >
                        Registrar Ahora
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
                    <div className="flex justify-between items-center mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                        <div>
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Historial</h3>
                            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide mt-1">Últimos movimientos</p>
                        </div>
                    </div>

                    {/* New Income Wizard Modal */}
                    {showIncomeWizard && (
                        <IncomeWizard
                            accounts={accounts}
                            profileId={profileId}
                            onClose={() => setShowIncomeWizard(false)}
                            onSuccess={() => {
                                setShowIncomeWizard(false);
                                onUpdate();
                            }}
                        />
                    )}

                    <div className="space-y-4">
                        <IncomeHistory
                            salaries={salaries}
                            incomes={incomes}
                            onDataChange={onUpdate}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
