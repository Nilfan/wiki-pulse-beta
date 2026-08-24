import { intervalDbCleaner } from "./intervalDbCleaner.ts";
import { wikiSourceService } from "./wikiSourceService.ts";

wikiSourceService.openEventChannel();
intervalDbCleaner.scheduleIntervalCleaning();
