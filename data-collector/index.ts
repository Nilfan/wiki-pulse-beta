import { intervalDbCleaner } from "./intervalDbCleaner.ts";
import { WikiSourceService } from "./wikiSourceService.ts";

const wikiSourceService = new WikiSourceService();
await wikiSourceService.init();
wikiSourceService.openEventChannel();
intervalDbCleaner.scheduleIntervalCleaning();
