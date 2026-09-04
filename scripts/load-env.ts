import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

/** Load repo-root .env for CLI scripts. */
loadEnv({ path: resolve(process.cwd(), ".env") });
