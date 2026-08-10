import { wikiSourceService } from "./wikiSourceService.ts";

await wikiSourceService.init();
wikiSourceService.openEventChannel();
