import BudgetDashboard from "@/components/BudgetDashboard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center py-6 md:py-12 px-2 md:px-4 bg-zinc-50 dark:bg-zinc-950">
      <BudgetDashboard />
    </main>
  );
}
