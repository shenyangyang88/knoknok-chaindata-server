import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export interface Config {
  port: number;
  debugLogging: boolean;
  isDevMode: boolean;
}

const isDevMode = process.env.NODE_ENV == "development";

const config: Config = {
  port: +(process.env.PORT || 3000),
  debugLogging: isDevMode,
  isDevMode,
};

export { config };