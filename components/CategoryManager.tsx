'use client';

import { useState } from 'react';
import { Category } from '@prisma/client';
import { createCategory, deleteCategory, updateCategoryLimit } from '@/app/actions/categories';
import { toast } from 'sonner';
import { X, Plus, Trash2, Pencil } from 'lucide-react';

interface CategoryManagerProps {
    categories: Category[];
    profileId: number;
    onClose: () => void;
    onUpdate: () => void;
}

const ICONS = ['Home', 'ShoppingBag', 'Car', 'Coffee', 'Zap', 'HeartPulse', 'GraduationCap', 'Smartphone', 'Plane', 'Dumbbell', 'Gamepad', 'Gift', 'Scissors', 'Shirt', 'Watch', 'Music', 'Wifi', 'CreditCard', 'Briefcase', 'Baby'];
const COLORS = [
    'text-blue-500', 'text-orange-500', 'text-zinc-500', 'text-pink-500',
    'text-yellow-500', 'text-red-500', 'text-indigo-500', 'text-cyan-500',
    'text-emerald-500', 'text-purple-500', 'text-lime-500', 'text-fuchsia-500'
];

export default function CategoryManager({ categories, profileId, onClose, onUpdate }: CategoryManagerProps) {
    const [view, setView] = useState<'list' | 'create'>('list');

    // Create Form State
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('Home');
    const [newColor, setNewColor] = useState('text-blue-500');
    const [newType, setNewType] = useState('VARIABLE'); // FIXED, VARIABLE, LUXURY

    async function handleCreate() {
        if (!newName) return toast.error("El nombre es requerido");

        try {
            await createCategory(profileId, newName, newIcon, newColor, newType);
            toast.success("Categoría creada");
            onUpdate();
            setView('list');
            setNewName('');
        } catch (e) {
            toast.error("Error creando categoría");
        }
    }

    async function handleDelete(id: number) {
        if (confirm('¿Seguro? Los gastos asociados perderán su categoría.')) {
            await deleteCategory(id);
            onUpdate();
            toast.success("Categoría eliminada");
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900">
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                        {view === 'list' ? 'Gestionar Categorías' : 'Nueva Categoría'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X size={20} className="text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">

                    {view === 'list' ? (
                        <div className="space-y-4">
                            <button
                                onClick={() => setView('create')}
                                className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 font-bold hover:border-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={20} /> Crear Nueva Categoría
                            </button>

                            <div className="grid gap-3">
                                {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cat.color.replace('text-', 'bg-').replace('500', '100')} ${cat.color}`}>
                                                {/* Simple char fallback for now, using icon mapping would be better but keeping simple */}
                                                {cat.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-900 dark:text-white">{cat.name}</p>
                                                <p className="text-xs font-bold text-zinc-400 uppercase">{cat.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nombre</label>
                                    <input
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                                        placeholder="Ej: Gimnasio"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Tipo</label>
                                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                                        {['FIXED', 'VARIABLE', 'LUXURY'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setNewType(t)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newType === t ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}
                                            >
                                                {t === 'FIXED' ? 'Fijo' : t === 'VARIABLE' ? 'Variable' : 'Lujo'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Color</label>
                                    <div className="flex flex-wrap gap-3">
                                        {COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setNewColor(c)}
                                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${c.replace('text-', 'bg-')} ${newColor === c ? 'ring-2 ring-offset-2 ring-zinc-400 scale-110' : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setView('list')}
                                    className="flex-1 py-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="flex-1 py-4 rounded-xl font-bold bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    Guardar Categoría
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
