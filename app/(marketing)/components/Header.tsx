import ControlTab from "./ControlTab";
import styles from "./header.module.css";
import Logo from "./Logo";

const TABS: { title: string; link: string; prefetch?: boolean }[] = [
  { title: "Product", link: "/", prefetch: true },
  { title: "Pricing", link: "/pricing", prefetch: true },
  { title: "Dashboard", link: "/dashboard" },
];

export default function Header() {
  return (
    <div
      className={
        "sticky top-0 z-20 bg-header-bg backdrop-blur-sm border-b border-solid border-b-rule"
      }
    >
      <div
        className={
          "max-w-maxw my-0 mx-auto py-3.5 px-gut flex items-center gap-7 justify-between"
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
