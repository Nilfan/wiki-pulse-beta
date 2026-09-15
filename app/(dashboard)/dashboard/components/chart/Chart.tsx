"use client";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function Chart({ searchParams }: Props) {
  console.log("Chart searchParams :>> ", searchParams);

  const content = JSON.stringify(searchParams);

  return <div> Chart Component: {content}</div>;
}
