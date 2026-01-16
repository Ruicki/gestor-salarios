import BudgetDashboard from "@/components/BudgetDashboard";
import { getSession } from "./actions/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileWithData } from "@/types";

export default async function Home() {
  const profileId = await getSession();

  if (!profileId) {
    redirect('/login');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      expenses: true,
      goals: true,
      incomes: true,
      salaries: true,
      creditCards: true,
      loans: true,
      accounts: true,
      categories: true
    }
  });

  if (!profile) {
    // If session exists but profile deleted
    redirect('/login');
  }

  // Serializar fechas si es necesario se hace automático en Server Components -> Client Components en versiones recientes,
  // pero si falla, tendremos que convertir a string/JSON. Probemos directo.

  return (
    <main className="flex min-h-screen flex-col items-center py-6 md:py-12 px-2 md:px-4 bg-zinc-50 dark:bg-zinc-950">
      <BudgetDashboard initialProfile={profile as unknown as ProfileWithData} />
    </main>
  );
}
