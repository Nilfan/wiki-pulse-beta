import { IntervalDbCleaner } from "./intervalDbCleaner.ts";
import { WikiSourceService } from "./wikiSourceService.ts";

const wikiSourceService = new WikiSourceService();
await wikiSourceService.init();
wikiSourceService.openEventChannel();
const intervalDbCleaner = new IntervalDbCleaner(wikiSourceService.prismaClient);
intervalDbCleaner.scheduleIntervalCleaning();
