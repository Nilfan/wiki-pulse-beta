export default function DashboardPageLayout({
  children,
  kpi,
  chart,
  table,
}: {
  children: React.ReactNode;
  kpi: React.ReactNode;
  chart: React.ReactNode;
  table: React.ReactNode;
}) {
  return (
    <div>
      <section>{kpi}</section>
      <section>{chart}</section>
      <section>{table}</section>
      {children}
    </div>
  );
}
