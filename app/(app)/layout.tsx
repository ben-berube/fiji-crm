import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-64">
        <div className="mx-auto max-w-7xl p-6 pt-16 md:pt-6">{children}</div>
      </main>
    </div>
  );
}
