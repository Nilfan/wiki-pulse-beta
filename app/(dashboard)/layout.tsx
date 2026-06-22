export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <aside>Sidebar</aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
