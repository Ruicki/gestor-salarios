import Link from 'next/link';
import { ArrowRight, Lock, TrendingUp, PiggyBank, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col">
            {/* Navbar */}
            <nav className="flex justify-between items-center p-6 md:px-12 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center">
                        <span className="text-white dark:text-black font-black text-lg">M</span>
                    </div>
                    <span className="font-bold text-xl tracking-tight">Finanzas Maestras</span>
                </div>
                <div className="flex gap-4">
                    <Link href="/login" className="px-5 py-2.5 rounded-full font-bold text-sm bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-colors">
                        Iniciar Sesión
                    </Link>
                    <Link href="/register" className="px-5 py-2.5 rounded-full font-bold text-sm bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity">
                        Registrarse
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6">
                    <ShieldCheck size={14} /> 100% Privado y Seguro
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight max-w-4xl mb-6 bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">
                    Domina tu dinero,<br /> sin complicaciones.
                </h1>
                <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed">
                    Un sistema de gestión financiera personal diseñado para darte claridad total.
                    Controla tus gastos, elimina deudas y alcanza tus objetivos de ahorro con nuestra herramienta inteligente.
                </p>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Link href="/register" className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
                        Comenzar Gratis <ArrowRight size={20} />
                    </Link>
                    <Link href="/login" className="px-8 py-4 bg-transparent border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                        Ya tengo cuenta
                    </Link>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl w-full px-4">
                    <div className="p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-left hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/20 text-pink-500 rounded-2xl flex items-center justify-center mb-6">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Control de Gastos</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">Categoriza automáticamente tus movimientos y visualiza a dónde va cada centavo con gráficos intuitivos.</p>
                    </div>
                    <div className="p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-left hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-500 rounded-2xl flex items-center justify-center mb-6">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Gestión de Deudas</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">Estrategias Bola de Nieve y Avalancha integradas para ayudarte a salir de deudas más rápido.</p>
                    </div>
                    <div className="p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-left hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                            <PiggyBank size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Metas de Ahorro</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">Crea objetivos financieros y bloquea tus ahorros para evitar tentaciones hasta alcanzar la meta.</p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-zinc-400 text-sm border-t border-zinc-200 dark:border-zinc-900 mt-12 bg-zinc-50 dark:bg-zinc-950">
                <p>© {new Date().getFullYear()} Finanzas Maestras. Desarrollado por Ricardo Pinzón.</p>
            </footer>
        </div>
    );
}
