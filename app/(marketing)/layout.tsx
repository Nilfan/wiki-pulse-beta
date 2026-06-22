export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <header>WikiPulse</header>
      <main>{children}</main>
      <footer>© Pulse 2026</footer>
    </div>
  );
}
