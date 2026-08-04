import Footer from "./components/Footer";
import Header from "./components/Header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`font-body m-0
        bg-paper
        bg-[linear-gradient(to_right,rgba(22,24,27,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(22,24,27,0.045)_1px,transparent_1px)]
        bg-size-[28px_28px]
        text-ink
        text-[16px]
        leading-[1.55]
        h-full
        overflow-auto
        `}
    >
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
