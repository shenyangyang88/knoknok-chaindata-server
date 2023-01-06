import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export interface Config {
  port: number;
  debugLogging: boolean;
  isDevMode: boolean;

  aptosRPCUrl: string;
  bscRPCUrl: string;
  polygonRPCUrl: string;
  bscChainID: string;
  polygonChainID: string;

  aptosContractAddress: string;
  bscContractAddress: string;
  polygonContractAddress: string;

  aptosPlatformAddress: string;
  aptosPlatformPrivateKey: string;
  bscPlatformAddress: string;
  bscPlatformPrivateKey: string;
  polygonPlatformAddress: string;
  polygonPlatformPrivateKey: string;

  datasourceRpcURL: string;
}

const isDevMode = process.env.NODE_ENV == "development";

const config: Config = {
  port: +(process.env.PORT || 3000),
  debugLogging: isDevMode,
  isDevMode,

  // rpc
  aptosRPCUrl: process.env.APTOS_RPC_URL || "",
  bscRPCUrl: process.env.BSC_RPC_URL || "",
  polygonRPCUrl: process.env.POLYGON_RPC_URL || "",
  bscChainID: process.env.BSC_CHAINID || "",
  polygonChainID: process.env.POLYGON_CHAINID || "",

  // contract
  aptosContractAddress: process.env.APTOS_CONTRACT_ADDRESS || "",
  bscContractAddress: process.env.BSC_CONTRACT_ADDRESS || "",
  polygonContractAddress: process.env.POLYGON_CONTRACT_ADDRESS || "",

  // platform
  aptosPlatformAddress: process.env.APTOS_PLATFORM_ADDRESS || "",
  aptosPlatformPrivateKey: process.env.APTOS_PLATFORM_PRIVATEKEY || "",
  bscPlatformAddress: process.env.BSC_PLATFORM_ADDRESS || "",
  bscPlatformPrivateKey: process.env.BSC_PLATFORM_PRIVATEKEY || "",
  polygonPlatformAddress: process.env.POLYGON_PLATFORM_ADDRESS || "",
  polygonPlatformPrivateKey: process.env.POLYGON_PLATFORM_PRIVATEKEY || "",

  datasourceRpcURL: process.env.DATASOURCE_RPC_URL || "",
};

export { config };