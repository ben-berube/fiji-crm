import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar />
      <main className="md:ml-64">
        <div className="mx-auto max-w-7xl p-4 pt-16 sm:p-6 md:pt-6">{children}</div>
      </main>
    </div>
  );
}
