import BudgetDashboard from "@/components/BudgetDashboard";
import { getSession } from "./actions/auth";
import { getProfileById, createAccount } from "./actions/budget";
import { redirect } from "next/navigation";
import { ProfileWithData } from "@/types";

export default async function Home() {
  const profileId = await getSession();

  if (!profileId) {
    redirect('/login');
  }

  let profile = await getProfileById(profileId);

  if (!profile) {
    // Si existe sesión pero el perfil fue eliminado
    redirect('/login');
  }

  // Auto-Reparación: Asegurar que la cuenta 'Efectivo' siempre exista
  const hasCashAccount = profile.accounts.some((a: { name: string }) => a.name === 'Efectivo');
  if (!hasCashAccount) {
    await createAccount("Efectivo", "CASH", 0, profile.id);
    // Re-fetch profile safely
    profile = await getProfileById(profileId);
  }

  if (!profile) return null; // Should not happen

  return (
    <main className="flex min-h-screen flex-col items-center py-6 md:py-12 px-2 md:px-4 bg-zinc-50 dark:bg-zinc-950">
      <BudgetDashboard initialProfile={profile as unknown as ProfileWithData} />
    </main>
  );
}
