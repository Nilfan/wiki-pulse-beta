import { Logo } from "@/lib/components";
import { ControlTab } from "@/lib/components/ControlTab";

const TABS: { title: string; link: string; prefetch?: boolean }[] = [
  { title: "Overview", link: "/dashboard" },
  { title: "Alerts", link: "/alerts" },
];

export function Header() {
  return (
    <div className={"top-0 z-20"}>
      <div
        className={
          "max-w-full my-0 mx-auto py-3.5 px-gut flex items-center gap-7"
        }
      >
        <Logo />

        <div>
          {TABS.map(({ link, title, prefetch }) => (
            <ControlTab
              key={link}
              title={title}
              link={link}
              prefetch={prefetch}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
