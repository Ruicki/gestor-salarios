'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProfileWithData } from '@/types';
import { toast } from 'sonner';

interface ProfileManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: ProfileWithData;
}

import { useScrollLock } from '@/hooks/useScrollLock';

export default function ProfileManagerModal({ isOpen, onClose, currentUser }: ProfileManagerModalProps) {
    useScrollLock(isOpen);

    if (currentUser.role !== 'ADMIN') return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Gestión de Perfiles (Admin)</DialogTitle>
                </DialogHeader>
                <div className="py-8 text-center text-muted-foreground">
                    Funcionalidad de gestión de usuarios en desarrollo.
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
