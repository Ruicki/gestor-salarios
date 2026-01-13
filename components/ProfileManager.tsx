'use client';

import { useState } from 'react';
import { Profile } from '@prisma/client';
import { createProfile, deleteProfile } from '@/app/actions/budget';
import { toast } from 'sonner';
import { Trash2, UserPlus, AlertTriangle, ShieldAlert } from 'lucide-react';
import { confirmDelete } from '@/components/DeleteConfirmation';

interface ProfileManagerProps {
    profiles: (Profile & { role: string })[];
    currentProfileId: number | null;
    onUpdate: () => void;
    onClose: () => void;
}

export default function ProfileManager({ profiles, currentProfileId, onUpdate, onClose }: ProfileManagerProps) {
    const [newProfileName, setNewProfileName] = useState('');
    const MAX_PROFILES = 5;

    async function handleCreate() {
        if (!newProfileName.trim()) return;
        if (profiles.length >= MAX_PROFILES) {
            toast.error(`Límite de ${MAX_PROFILES} perfiles alcanzado.`);
            return;
        }

        try {
            await createProfile(newProfileName);
            onUpdate();
            setNewProfileName('');
            toast.success("Perfil creado exitosamente");
        } catch (error) {
            toast.error("Error creando perfil");
        }
    }

    async function handleDelete(id: number) {
        if (id === currentProfileId) {
            toast.warning("No puedes eliminar el perfil activo. Cambia de perfil primero.");
            return;
        }

        confirmDelete(async () => {
            try {
                await deleteProfile(id);
                onUpdate();
                toast.success("Perfil y todos sus datos eliminados");
            } catch (error) {
                toast.error("Error eliminando perfil");
            }
        });
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-lg text-purple-600 dark:text-purple-400">👤</span>
                        Gestionar Perfiles
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">✕</button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto">
                    {/* Create New Profile Section */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Crear Nuevo Perfil</label>
                        <div className="flex flex-col md:flex-row gap-2">
                            <input
                                placeholder="Ej: Negocio, Casa"
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20"
                                value={newProfileName}
                                onChange={e => setNewProfileName(e.target.value)}
                                disabled={profiles.length >= MAX_PROFILES}
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!newProfileName.trim() || profiles.length >= MAX_PROFILES}
                                className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18} />
                                <span className="md:hidden text-sm font-bold">Crear</span>
                            </button>
                        </div>
                    </div>

                    {/* Profiles List */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Mis Perfiles ({profiles.length}/{MAX_PROFILES})</label>
                        {profiles.map(profile => (
                            <div key={profile.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${profile.id === currentProfileId ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/20' : 'bg-white dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${profile.id === currentProfileId ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}`}>
                                        {profile.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1">
                                            {profile.name}
                                            {profile.role === 'ADMIN' && (
                                                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                    Admin
                                                </span>
                                            )}
                                        </p>
                                        {profile.id === currentProfileId && <span className="text-[9px] font-bold bg-purple-200 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full ml-auto md:ml-0 inline-block mt-1">ACTIVO</span>}
                                    </div>
                                </div>
                                {profile.id !== currentProfileId && (
                                    <button
                                        onClick={() => handleDelete(profile.id)}
                                        className="text-zinc-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        title="Eliminar perfil"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl flex gap-2 items-center">
                        <ShieldAlert className="text-blue-500 shrink-0" size={14} />
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-tight">
                            Al eliminar un perfil se borrarán permanentemente todos sus datos asociados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
