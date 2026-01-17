'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getProfiles } from '@/app/actions/budget';
import CreditCardsTab from '@/components/dashboard/tabs/CreditCardsTab';
import ExpensesTab from '@/components/dashboard/tabs/ExpensesTab';
import GoalsTab from '@/components/dashboard/tabs/GoalsTab';
import IncomesTab from '@/components/dashboard/tabs/IncomesTab';
import InsightsTab from '@/components/dashboard/tabs/InsightsTab';
import AccountsTab from '@/components/dashboard/tabs/AccountsTab';
import DebtsTab from '@/components/dashboard/tabs/DebtsTab';
import { Profile, Expense, Goal, AdditionalIncome, Salary, CreditCard, Account, Category, Loan } from '@prisma/client';
import { toast } from 'sonner';
import { User, Plus, Wallet, Target, CreditCard as CardIcon, DollarSign, Calendar, Search, Sun, Moon, Briefcase, Eye, EyeOff, UserPlus, Landmark, LogOut, TrendingUp, Settings } from "lucide-react";
import { ThemeToggle } from './ThemeToggle';
import ProfileManager from './ProfileManager';
import { logout } from '@/app/actions/auth';
import { ProfileWithData } from '@/types';
import UserSettings from '@/components/UserSettings';

interface BudgetDashboardProps {
    initialProfile: ProfileWithData;
}

export default function BudgetDashboard({ initialProfile }: BudgetDashboardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Obtener pestaña de URL o por defecto 'incomes'
    const currentTab = searchParams.get('tab') || 'incomes';
    const [activeTab, setActiveTab] = useState(currentTab);

    // Sincronizar estado con cambios de URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const updateTab = (tab: string) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams);
        params.set('tab', tab);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const [activeProfile, setActiveProfile] = useState<ProfileWithData>(initialProfile);
    // Se eliminó el estado de lista de perfiles ya que nos enfocamos en vista de usuario único (Admin puede obtener lista en Gestor)
    const [profiles, setProfiles] = useState<ProfileWithData[]>([initialProfile]);

    // ... estado existente ...
    const [isPrivateMode, setIsPrivateMode] = useState(false);
    const [isImpersonating, setIsImpersonating] = useState(false);

    const handleImpersonate = (profile: ProfileWithData) => {
        setIsImpersonating(true);
        setActiveProfile(profile);
        setShowProfileManager(false);
        toast.info(`Viendo el perfil de ${profile.name}`, { duration: 4000 });
    };

    const exitImpersonation = () => {
        setIsImpersonating(false);
        setActiveProfile(initialProfile);
        window.location.reload();
    };
    const [showProfileManager, setShowProfileManager] = useState(false);
    const [showUserSettings, setShowUserSettings] = useState(false);

    // Manejador de actualización de datos
    async function refreshData() {
        // En un caso real haríamos un server action para refetchear SOLO el perfil actual
        // Por simplicidad, recargamos la página o usamos router.refresh()
        // O re-implementamos getProfile(id)
        window.location.reload();
    }

    const activeProfileData = activeProfile; // Alias para diffs más limpios abajo si es necesario, pero usamos activeProfile en otros lugares

    // --- MANEJADORES ---
    const handleLogout = async () => {
        await logout();
    }



    // --- CÁLCULOS ---
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

    // NUEVA LÓGICA (FASE CUENTAS):
    // El "Disponible" ya no es una resta teórica de Ingresos - Gastos.
    // Ahora es la SUMA REAL de los saldos de las Cuentas (Banco + Efectivo + Ahorros).
    const balance = activeProfile?.accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

    // CÁLCULO DE PATRIMONIO NETO
    const totalSavings = activeProfile?.goals?.reduce((sum, goal) => sum + goal.currentAmount, 0) || 0;
    const totalLoans = activeProfile?.loans?.reduce((sum, loan) => sum + loan.currentBalance, 0) || 0;
    const totalCreditDebt = (activeProfile?.creditCards?.reduce((sum, card) => sum + card.balance, 0) || 0) + totalLoans;
    const netWorth = balance + totalSavings - totalCreditDebt;

    // --- LÓGICA: RECORDATORIOS ---
    const today = new Date().getDate();
    const reminders = expensesList.filter((exp: Expense) => {
        if (!exp.dueDate) return false;
        const diff = exp.dueDate - today;
        return diff >= 0 && diff <= 5;
    }).sort((a: Expense, b: Expense) => (a.dueDate || 0) - (b.dueDate || 0));

    return (
        <div className={`w-full max-w-[1400px] mx-auto space-y-12 pb-24 ${isPrivateMode ? 'private-mode' : ''}`}>

            {/* Estilos Globales para Desenfoque en Modo Privado */}
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

            {/* BANNER DE SUPLANTACIÓN */}
            {isImpersonating && (
                <div className="fixed top-0 left-0 right-0 bg-indigo-600 text-white z-[100] px-4 py-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top">
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <Eye className="w-5 h-5" />
                        <span>Estás viendo el perfil de: {activeProfile.name}</span>
                    </div>
                    <button
                        onClick={exitImpersonation}
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/30"
                    >
                        Salir del Modo "Ver Como"
                    </button>
                </div>
            )}

            {/* ENCABEZADO */}
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
                    {/* Selector de perfil eliminado de encabezado ya que tenemos una pantalla de selector dedicada.
                        Mantenemos ThemeToggle y PrivateMode.
                        Añadimos botón de "Cerrar Sesión/Cambiar Usuario".
                    */}
                    <ThemeToggle />

                    <button
                        onClick={() => setShowUserSettings(true)}
                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2"
                        title="Ajustes de Usuario"
                    >
                        <Settings className="w-5 h-5" />
                        <span className="hidden md:inline">Ajustes</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="hidden md:inline">Salir</span>
                    </button>

                    {activeProfile?.role === 'ADMIN' && (
                        <button
                            onClick={() => setShowProfileManager(true)}
                            className="bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                            title="Gestionar Usuarios"
                        >
                            <Briefcase className="w-5 h-5" />
                            <span className="hidden md:inline">Gestionar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* MODAL DE GESTOR DE PERFILES */}
            {
                showProfileManager && (
                    <ProfileManager
                        profiles={profiles}
                        currentProfileId={activeProfile.id}
                        onUpdate={refreshData}
                        onClose={() => setShowProfileManager(false)}
                        onImpersonate={handleImpersonate}
                    />
                )
            }

            {/* MODAL DE AJUSTES DE USUARIO */}
            {
                showUserSettings && (
                    <UserSettings
                        profile={activeProfile}
                        onClose={() => setShowUserSettings(false)}
                        onUpdate={refreshData}
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
                        <div className="bg-white dark:bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-xl relative md:sticky md:top-6 z-40 mb-8 md:mb-0 shadow-xl shadow-zinc-200/50 dark:shadow-none mx-auto max-w-5xl">
                            <div className="grid grid-cols-3 md:flex md:justify-between gap-1">
                                <button onClick={() => updateTab('accounts')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'accounts' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                    <Landmark size={18} />
                                    <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Cuentas</span>
                                </button>
                                <button onClick={() => updateTab('incomes')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'incomes' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                    <DollarSign size={18} />
                                    <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Ingresos</span>
                                </button>
                                <button onClick={() => updateTab('expenses')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'expenses' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                    <TrendingUp size={18} />
                                    <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Gastos</span>
                                </button>
                                <button onClick={() => updateTab('goals')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'goals' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                    <Target size={18} />
                                    <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Metas</span>
                                </button>
                                <button onClick={() => updateTab('debts')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'debts' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                    <CardIcon size={18} />
                                    <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Deudas</span>
                                </button>
                                <button onClick={() => updateTab('insights')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'insights' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                    <Search size={18} />
                                    <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Tabla</span>
                                </button>
                            </div>
                        </div>

                        {/* CONTENIDO DE TABS */}
                        <div className="min-h-[500px]">
                            {/* --- TAB: CUENTAS --- */}
                            {activeTab === 'accounts' && (
                                <AccountsTab
                                    accounts={activeProfile.accounts || []}
                                    profileId={activeProfile.id}
                                    onUpdate={refreshData}
                                />
                            )}

                            {/* --- TAB: INGRESOS --- */}
                            {activeTab === 'incomes' && (
                                <IncomesTab
                                    incomes={activeProfile.incomes || []}
                                    salaries={activeProfile.salaries || []}
                                    accounts={activeProfile.accounts || []}
                                    profileId={activeProfile.id}
                                    onUpdate={refreshData}
                                />
                            )}

                            {/* --- TAB: GASTOS --- */}
                            {activeTab === 'expenses' && (
                                <ExpensesTab
                                    expenses={activeProfile.expenses || []}
                                    creditCards={activeProfile.creditCards || []}
                                    accounts={activeProfile.accounts || []}
                                    categories={activeProfile.categories || []}
                                    profileId={activeProfile.id}
                                    onUpdate={refreshData}
                                />
                            )}

                            {/* --- TAB: METAS --- */}
                            {activeTab === 'goals' && (
                                <GoalsTab
                                    goals={activeProfile.goals || []}
                                    accounts={activeProfile.accounts || []} // Pasar cuentas
                                    profileId={activeProfile.id}
                                    onUpdate={refreshData}
                                />
                            )}

                            {/* --- TAB: DEUDAS/TARJETAS --- */}
                            {activeTab === 'debts' && (
                                <DebtsTab
                                    creditCards={activeProfile.creditCards || []}
                                    loans={activeProfile.loans || []}
                                    accounts={activeProfile.accounts || []} // Pasar cuentas para fuente de pago
                                    profileId={activeProfile.id}
                                    onUpdate={refreshData}
                                />
                            )}

                            {/* --- TAB: INSIGHTS --- */}
                            {activeTab === 'insights' && (
                                <InsightsTab
                                    expenses={activeProfile.expenses || []}
                                    categories={activeProfile.categories || []}
                                    incomes={activeProfile.incomes || []}
                                    salaries={activeProfile.salaries || []}
                                />
                            )}
                        </div>

                        {/* ProfileManager duplicado eliminado */}
                    </>
                ) : (
                    // Fallback (no debería alcanzarse debido a lógica de ProfileSelector arriba, pero se mantiene limpio)
                    <div className="flex items-center justify-center h-[50vh]">
                        <p className="text-zinc-400">Seleccionando perfil...</p>
                    </div>
                )
            }
        </div >
    );
}
