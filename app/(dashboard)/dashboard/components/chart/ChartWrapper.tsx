import Chart from "./Chart";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChartWrapper(props: Props) {
  const searchParams = await props.searchParams;

  console.log("searchParams :>> ", searchParams);

  return <Chart searchParams={searchParams} />;
}
