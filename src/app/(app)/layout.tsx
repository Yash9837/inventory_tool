import { Sidebar } from "@/components/navigation/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="md:hidden h-[60px]" /> {/* Mobile nav spacer */}
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
