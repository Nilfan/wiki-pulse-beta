"use client";
import { Provider } from "react-redux";
import { store } from "./store";
import { ReactNode } from "react";

export default function RtkTestLayout({ children }: { children: ReactNode[] }) {
  return (
    <div className="m-8">
      <Provider store={store}>{children}</Provider>
    </div>
  );
}
