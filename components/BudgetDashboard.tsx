'use client';

import { useState, useEffect } from 'react';
import { createProfile, getProfiles } from '@/app/actions/budget';
import CreditCardsTab from '@/components/dashboard/tabs/CreditCardsTab';
import ExpensesTab from '@/components/dashboard/tabs/ExpensesTab';
import GoalsTab from '@/components/dashboard/tabs/GoalsTab';
import IncomesTab from '@/components/dashboard/tabs/IncomesTab';
import InsightsTab from '@/components/dashboard/tabs/InsightsTab';
import AccountsTab from '@/components/dashboard/tabs/AccountsTab';
import DebtsTab from '@/components/dashboard/tabs/DebtsTab';
import { Profile, Expense, Goal, AdditionalIncome, Salary, CreditCard, Account, Category, Loan } from '@prisma/client';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, Wallet, Target, CreditCard as CardIcon, DollarSign, Calendar, Search, Sun, Moon, Briefcase, Eye, EyeOff, UserPlus, Landmark } from "lucide-react";
import { ThemeToggle } from './ThemeToggle';
import ProfileManager from './ProfileManager';
import WelcomeScreen from './WelcomeScreen';
import ProfileSelector from './ProfileSelector';

type ProfileWithData = Profile & {
    role: string; // Explicitly adding role to avoid type errors during regeneration
    expenses: Expense[];
    goals: Goal[];
    incomes: AdditionalIncome[];
    salaries: Salary[];
    creditCards: CreditCard[];
    loans: Loan[];
    accounts: Account[];
    categories: Category[];
};

export default function BudgetDashboard() {
    const [profiles, setProfiles] = useState<ProfileWithData[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'incomes' | 'expenses' | 'goals' | 'debts' | 'insights' | 'accounts'>('incomes');
    const [isPrivateMode, setIsPrivateMode] = useState(false);
    const [showProfileManager, setShowProfileManager] = useState(false);

    useEffect(() => {
        loadProfiles();
    }, []);

    async function loadProfiles() {
        try {
            // @ts-ignore
            const data = await getProfiles();
            setProfiles(data as any);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando perfiles");
        } finally {
            setLoading(false);
        }
    }

    // --- HANDLERS ---
    const handleProfileSelect = (profileId: number) => {
        setSelectedProfileId(profileId);
        const profile = profiles.find(p => p.id === profileId);

        // SMART REDIRECT: Si no tiene cuentas, mandar directo a setup de cuentas
        if (profile && profile.accounts.length === 0) {
            setActiveTab('accounts');
            toast.info("👋 ¡Hola! Primero configuremos tus cuentas para empezar.");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;

    // 1. WELCOME SCREEN (No profiles exist)
    if (profiles.length === 0) {
        return <WelcomeScreen onProfileCreated={loadProfiles} />;
    }

    // 2. PROFILE SELECTOR (Profiles exist, but none selected)
    if (!selectedProfileId) {
        return (
            <>
                <ProfileSelector
                    profiles={profiles}
                    onSelect={handleProfileSelect}
                    onManage={() => setShowProfileManager(true)}
                />
                {showProfileManager && (
                    <ProfileManager
                        profiles={profiles}
                        currentProfileId={null} // No active profile yet
                        onUpdate={loadProfiles}
                        onClose={() => setShowProfileManager(false)}
                    />
                )}
            </>
        );
    }

    const activeProfile = profiles.find(p => p.id === selectedProfileId);

    // --- CALCULATIONS ---
    // --- CALCULATIONS ---
    const expensesList = activeProfile?.expenses?.filter((e: Expense) => e.category !== 'Deuda') || [];
    const debtsList = activeProfile?.expenses?.filter((e: Expense) => e.category === 'Deuda') || [];

    const totalExpenses = expensesList.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
    const totalDebtPayments = debtsList.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
    const totalGoalsSaved = activeProfile?.goals?.reduce((sum: number, g: Goal) => sum + g.currentAmount, 0) || 0;

    // Calcular Salario Base (Neto) - Suma de todos los salarios del mes actual
    const currentMonthForSalary = new Date().getMonth();
    const currentYearForSalary = new Date().getFullYear();

    const currentMonthSalaries = activeProfile?.salaries?.filter((s: Salary) => {
        const d = new Date(s.createdAt);
        return d.getMonth() === currentMonthForSalary && d.getFullYear() === currentYearForSalary;
    }) || [];

    const latestSalary = activeProfile?.salaries && activeProfile.salaries.length > 0
        ? activeProfile.salaries[activeProfile.salaries.length - 1]
        : null;

    const baseIncome = currentMonthSalaries.reduce((sum: number, s: Salary) => sum + s.netVal, 0);

    // Calcular Otros Ingresos (Mensualizados para la vista actual)
    const additionalIncomes = activeProfile?.incomes || [];
    const monthlyAdditionalIncome = additionalIncomes.reduce((acc: number, inc: AdditionalIncome) => {
        if (inc.type === 'ONE_TIME') return acc + inc.amount; // Asumimos impacto total en el mes actual
        // Si es eventual
        if (inc.frequency === 'MONTHLY') return acc + inc.amount;
        if (inc.frequency === 'BIWEEKLY') return acc + (inc.amount * 2);
        if (inc.frequency === 'WEEKLY') return acc + (inc.amount * 4);
        return acc;
    }, 0);

    const totalMonthlyIncome = baseIncome + monthlyAdditionalIncome;

    // REVERSION: Dado que el usuario quiere controlar manualmente el pago de las cuotas fijas (botón "Pagar Cuota"),
    // no podemos restar automáticamente la proyección mensual del disponible, porque cuando el usuario pague,
    // se creará un gasto real, y se restaría dos veces (Proyección + Gasto Real).
    // Por lo tanto, el "Disponible" reflejará el dinero libre REAL hasta que el usuario decida ejecutar el pago de la meta.

    // NEW LOGIC (ACCOUNTS PHASE):
    // El "Disponible" ya no es una resta teórica de Ingresos - Gastos.
    // Ahora es la SUMA REAL de los saldos de las Cuentas (Banco + Efectivo + Ahorros).
    const balance = activeProfile?.accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

    // NET WORTH CALCULATION
    const totalSavings = activeProfile?.goals?.reduce((sum, goal) => sum + goal.currentAmount, 0) || 0;
    const totalLoans = activeProfile?.loans?.reduce((sum, loan) => sum + loan.currentBalance, 0) || 0;
    const totalCreditDebt = (activeProfile?.creditCards?.reduce((sum, card) => sum + card.balance, 0) || 0) + totalLoans;
    const netWorth = balance + totalSavings - totalCreditDebt;

    // --- LOGIC: REMINDERS ---
    const today = new Date().getDate();
    const reminders = expensesList.filter((exp: Expense) => {
        if (!exp.dueDate) return false;
        const diff = exp.dueDate - today;
        return diff >= 0 && diff <= 5;
    }).sort((a: Expense, b: Expense) => (a.dueDate || 0) - (b.dueDate || 0));

    return (
        <div className={`w-full max-w-[1400px] mx-auto space-y-12 pb-24 ${isPrivateMode ? 'private-mode' : ''}`}>

            {/* Global Styles for Private Mode Blur */}
            <style jsx global>{`
                .private-mode .blur-sensitive {
                    filter: blur(8px);
                    transition: filter 0.3s ease;
                    cursor: pointer;
                }
                .private-mode .blur-sensitive:hover {
                    filter: blur(0);
                }
            `}</style>

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-10">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-400 dark:to-zinc-600 mb-4">
                        Finanzas Maestras
                    </h1>
                    <p className="text-zinc-500 dark:text-white/70 font-bold text-lg">Control total de tu flujo de dinero.</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <button
                        onClick={() => setIsPrivateMode(!isPrivateMode)}
                        className={`p-3 rounded-2xl border transition-all relative group overflow-hidden ${isPrivateMode ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-400'}`}
                        title="Modo Privado (Blur)"
                    >
                        {isPrivateMode ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                    {/* Profile switcher removed from header since we have a dedicated selector screen. 
                        We keep ThemeToggle and PrivateMode. 
                        We add a "Logout/Switch User" button.
                    */}
                    <ThemeToggle />

                    <button
                        onClick={() => setSelectedProfileId(null)}
                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2"
                        title="Cambiar Usuario"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span className="hidden md:inline">Cambiar</span>
                    </button>

                    {activeProfile?.role === 'ADMIN' && (
                        <button
                            onClick={() => setShowProfileManager(true)}
                            className="bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                            title="Gestionar Perfiles"
                        >
                            <Briefcase className="w-5 h-5" />
                            <span className="hidden md:inline">Gestionar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* PROFILE MANAGER MODAL */}
            {
                showProfileManager && (
                    <ProfileManager
                        profiles={profiles}
                        currentProfileId={selectedProfileId}
                        onUpdate={loadProfiles}
                        onClose={() => setShowProfileManager(false)}
                    />
                )
            }

            {
                activeProfile ? (
                    <>
                        {/* KPI CARDS GLOBALES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* 1. DISPONIBLE (LIQUIDEZ) */}
                            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-green-500 p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Wallet className="w-20 h-20 text-emerald-500" />
                                </div>
                                <p className="text-zinc-500 font-bold mb-1 uppercase text-xs tracking-wider">Dinero disponible</p>
                                <p className={`text-3xl md:text-4xl font-black relative z-10 blur-sensitive ${balance >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
                                    ${balance.toFixed(2)}
                                </p>
                            </div>

                            {/* 2. PATRIMONIO NETO (HERO) */}
                            <div className="bg-zinc-900 dark:bg-linear-to-br dark:from-indigo-600 dark:to-violet-600 border border-zinc-900 dark:border-indigo-500/50 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group text-white">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Landmark className="w-20 h-20 text-white" />
                                </div>
                                <p className="text-zinc-400 dark:text-indigo-200 font-bold mb-1 uppercase text-xs tracking-wider">Patrimonio Neto</p>
                                <p className="text-3xl md:text-4xl font-black relative z-10 blur-sensitive">
                                    ${netWorth.toFixed(2)}
                                </p>
                            </div>



                            {/* 4. DEUDA (TARJETAS) */}
                            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <TrendingUp className="w-20 h-20 text-red-500" />
                                </div>
                                <p className="text-zinc-500 font-bold mb-1 uppercase text-xs tracking-wider">Deuda Total</p>
                                <p className="text-3xl md:text-4xl font-black text-red-500 relative z-10 blur-sensitive">
                                    -${totalCreditDebt.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* TABS DE NAVEGACIÓN (RESPONSIVE: GRID MÓVIL / FLEX DESKTOP) */}
                        <div className="bg-zinc-100 dark:bg-zinc-900/50 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm relative md:sticky md:top-4 z-40 mb-6 md:mb-0 shadow-sm dark:shadow-none">
                            <div className="grid grid-cols-3 gap-2 md:flex md:overflow-x-auto md:no-scrollbar">
                                <button onClick={() => setActiveTab('accounts')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 md:py-4 px-2 md:px-6 rounded-xl transition-all ${activeTab === 'accounts' ? 'bg-white dark:bg-zinc-800 text-blue-500 dark:text-blue-400 shadow-sm md:shadow-md' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                                    <Landmark size={18} className="md:hidden" />
                                    <span className="text-[10px] md:text-lg font-black uppercase md:normal-case tracking-wide">Cuentas</span>
                                </button>
                                <button onClick={() => setActiveTab('incomes')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 md:py-4 px-2 md:px-6 rounded-xl transition-all ${activeTab === 'incomes' ? 'bg-white dark:bg-zinc-800 text-emerald-500 dark:text-emerald-400 shadow-sm md:shadow-md' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                                    <DollarSign size={18} className="md:hidden" />
                                    <span className="text-[10px] md:text-lg font-black uppercase md:normal-case tracking-wide">Ingresos</span>
                                </button>
                                <button onClick={() => setActiveTab('expenses')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 md:py-4 px-2 md:px-6 rounded-xl transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm md:shadow-md' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                                    <TrendingUp size={18} className="md:hidden" />
                                    <span className="text-[10px] md:text-lg font-black uppercase md:normal-case tracking-wide">Gastos</span>
                                </button>
                                <button onClick={() => setActiveTab('goals')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 md:py-4 px-2 md:px-6 rounded-xl transition-all ${activeTab === 'goals' ? 'bg-white dark:bg-zinc-800 text-cyan-500 dark:text-cyan-400 shadow-sm md:shadow-md' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                                    <Target size={18} className="md:hidden" />
                                    <span className="text-[10px] md:text-lg font-black uppercase md:normal-case tracking-wide">Metas</span>
                                </button>
                                <button onClick={() => setActiveTab('debts')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 md:py-4 px-2 md:px-6 rounded-xl transition-all ${activeTab === 'debts' ? 'bg-white dark:bg-zinc-800 text-red-500 dark:text-red-400 shadow-sm md:shadow-md' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                                    <CardIcon size={18} className="md:hidden" />
                                    <span className="text-[10px] md:text-lg font-black uppercase md:normal-case tracking-wide">Deudas</span>
                                </button>
                                <button onClick={() => setActiveTab('insights')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 md:py-4 px-2 md:px-6 rounded-xl transition-all ${activeTab === 'insights' ? 'bg-white dark:bg-zinc-800 text-purple-500 dark:text-purple-400 shadow-sm md:shadow-md' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                                    <Search size={18} className="md:hidden" />
                                    <span className="text-[10px] md:text-lg font-black uppercase md:normal-case tracking-wide">Tabla</span>
                                </button>
                            </div>
                        </div>

                        {/* CONTENIDO DE TABS */}
                        <div className="min-h-[500px]">
                            {/* --- TAB: CUENTAS --- */}
                            {activeTab === 'accounts' && activeProfile && (
                                <AccountsTab
                                    accounts={activeProfile.accounts || []}
                                    profileId={activeProfile.id}
                                    onUpdate={loadProfiles}
                                />
                            )}

                            {/* --- TAB: INGRESOS --- */}
                            {activeTab === 'incomes' && activeProfile && (
                                <IncomesTab
                                    incomes={activeProfile.incomes || []}
                                    salaries={activeProfile.salaries || []}
                                    accounts={activeProfile.accounts || []}
                                    profileId={activeProfile.id}
                                    onUpdate={loadProfiles}
                                />
                            )}

                            {/* --- TAB: GASTOS --- */}
                            {activeTab === 'expenses' && activeProfile && (
                                <ExpensesTab
                                    expenses={activeProfile.expenses || []}
                                    creditCards={activeProfile.creditCards || []}
                                    accounts={activeProfile.accounts || []}
                                    categories={activeProfile.categories || []}
                                    profileId={activeProfile.id}
                                    onUpdate={loadProfiles}
                                />
                            )}

                            {/* --- TAB: METAS --- */}
                            {activeTab === 'goals' && activeProfile && (
                                <GoalsTab
                                    goals={activeProfile.goals || []}
                                    accounts={activeProfile.accounts || []} // Pass accounts
                                    profileId={activeProfile.id}
                                    onUpdate={loadProfiles}
                                />
                            )}

                            {/* --- TAB: DEUDAS/TARJETAS --- */}
                            {activeTab === 'debts' && activeProfile && (
                                <DebtsTab
                                    creditCards={activeProfile.creditCards || []}
                                    loans={activeProfile.loans || []}
                                    accounts={activeProfile.accounts || []} // Pass accounts for payment source
                                    profileId={activeProfile.id}
                                    onUpdate={loadProfiles}
                                />
                            )}

                            {/* --- TAB: INSIGHTS --- */}
                            {activeTab === 'insights' && activeProfile && (
                                <InsightsTab
                                    expenses={activeProfile.expenses || []}
                                    categories={activeProfile.categories || []}
                                    incomes={activeProfile.incomes || []}
                                    salaries={activeProfile.salaries || []}
                                />
                            )}
                        </div>

                        {showProfileManager && (
                            <ProfileManager
                                profiles={profiles}
                                currentProfileId={selectedProfileId}
                                onUpdate={loadProfiles}
                                onClose={() => setShowProfileManager(false)}
                            />
                        )}
                    </>
                ) : (
                    // Fallback (should not be reached due to ProfileSelector logic above, but kept clean)
                    <div className="flex items-center justify-center h-[50vh]">
                        <p className="text-zinc-400">Seleccionando perfil...</p>
                    </div>
                )
            }
        </div >
    );
}
