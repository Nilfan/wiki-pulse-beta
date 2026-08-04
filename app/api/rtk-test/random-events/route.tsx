import { getPrismaClient } from "../../getPrismaClient";

const HEADERS_OBJ = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const getRandomN = function <T>(arr: T[], n = 5): T[] {
  const result: T[] = [];

  for (let i = 0; i < n; i++) {
    let option: undefined | T;

    while (option === undefined || result.includes(option)) {
      const randomIndex = Math.floor(Date.now() * Math.random()) % arr.length;

      console.log(`Random index :>> ${randomIndex}/${arr.length}`);
      option = arr[randomIndex];
    }

    result.push(option);
  }

  console.log("Random ids :>>", result);

  return result;
};

export async function GET() {
  const prismaClient = getPrismaClient();

  const eventIds = await prismaClient.event.findMany({
    select: {
      id: true,
    },
  });

  const randomIds = getRandomN(eventIds).map(({ id }) => id);

  const res = await prismaClient.event.findMany({
    where: {
      id: {
        in: randomIds,
      },
    },
    select: {
      id: true,
      timestamp: true,
      type: true,
      path: true,
      country: true,
    },
  });

  const events = res.map(({ id, ...rest }) => ({ id: Number(id), ...rest }));

  await new Promise((res) => {
    setTimeout(() => {
      res(null);
    }, 5000);
  });

  return Response.json(
    {
      events,
    },
    { status: 200, headers: HEADERS_OBJ },
  );
}
