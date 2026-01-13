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
                <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2rem] shadow-sm dark:shadow-none flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2">
                        <Plus className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Nuevo Ingreso</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto">Registra salarios, depósitos o dinero en efectivo fácilmente.</p>
                    </div>
                    <button
                        onClick={() => setShowIncomeWizard(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white dark:text-zinc-900 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 w-full max-w-xs"
                    >
                        Registrar Ahora
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2rem] shadow-sm dark:shadow-none">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Historial de Ingresos</h3>
                    </div>

                    {/* New Income Wizard Modal */}
                    {showIncomeWizard && (
                        <IncomeWizard
                            accounts={accounts}
                            profileId={profileId}
                            initialDeductions={customDeductions}
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
