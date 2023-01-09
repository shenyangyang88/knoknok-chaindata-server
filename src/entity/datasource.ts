import axios, { AxiosInstance } from "axios";
import BigNumber from "bignumber.js";

import { config } from "../config";
import { ResultError } from "./error";
import { KKCAssets, USDTAssets } from "./wallet";

export class DataSource {
  api: AxiosInstance;

  kkcAssetsCacheTime: number = 0;
  kkcAssets: KKCAssets;

  usdtAssetsMap: any;

  constructor() {
    this.api = axios.create({
      baseURL: config.datasourceRpcURL,
    });
  }

  expireCacheTime(time: number, cached: number): boolean {
    if ((Date.now() - time) > cached) {
      return true;
    }

    return false;
  }

  checkData(response: any): void {
    if (response && response.status == 200 && response.data) {
      if (response.data.result) {
      } else if (response.data.error) {
        throw new ResultError(response.data.error.code, response.data.error.message);
      } else {
        throw new ResultError(-1, "unknown error");
      }
    } else {
      throw new ResultError(response.status, response.statusText);
    }
  }

  async getKKCAssets(chainId: string, contractAddress: string): Promise<KKCAssets> {
    if (!this.expireCacheTime(this.kkcAssetsCacheTime, (15 * 60 * 1000))) {
      return this.kkcAssets;
    }

    const response = await this.api.post("/evm-chain", {
      chainId: Number(chainId),
      jsonrpc: "2.0",
      id: 1,
      method: "particle_getPrice",
      params: [
        [
          // contractAddress,
          "native"
        ],
        [
          "usd",
        ],
      ],
    }, {
      auth: {
        username: config.datasourceApiKey,
        password: config.datasourceApiSKey,
      },
    });

    this.checkData(response);

    const kkcAssets = new KKCAssets();
    kkcAssets.price = response.data.result[0].currencies[0].price;
    kkcAssets.tendency = response.data.result[0].currencies[0]["24hChange"];
    this.kkcAssets = kkcAssets;
    this.kkcAssetsCacheTime = Date.now();
    return this.kkcAssets;
  }

  async getTokenAssetsList(chainId: string, address: string): Promise<any[]> {
    const tokenAssetsList: any[] = [];

    try {
      const response = await this.api.post("/evm-chain", {
        chainId: Number(chainId),
        jsonrpc: "2.0",
        id: 1,
        method: "particle_getTokens",
        params: [
          address,
        ],
      }, {
        auth: {
          username: config.datasourceApiKey,
          password: config.datasourceApiSKey,
        },
      });

      this.checkData(response);

      tokenAssetsList.push({
        address: "native",
        amount: response.data.result.native,
        decimals: "18",
      });

      const list = response.data.result.tokens || [];
      for (let i = 0; i < list.length; i++) {
        if (list[i].address) {
          tokenAssetsList.push({
            address: list[i].address,
            amount: list[i].amount,
            decimals: list[i].decimals,
          });
        }
      }
    } catch (_) {
      //
    }

    return tokenAssetsList;
  }

  fillZero(decimals: string): string {
    if (Number(decimals)) {
      let a = "1";
      for (let i = 0; i < Number(decimals); i++) {
        a += "0";
      }
      return a;
    }

    return "0";
  }

  calculationUSDT(tokenAssetsList: any[], priceList: any[]): string {
    let usdt = BigNumber("0");

    for (let i = 0; i < tokenAssetsList.length; i++) {
      const priceArr = priceList.filter(price => price.address == tokenAssetsList[i].address);
      if (priceArr.length && priceArr[0] && priceArr[0].price) {
        const decimals = tokenAssetsList[i].decimals;
        const amount = tokenAssetsList[i].amount;
        const balance = BigNumber(amount).div(this.fillZero(decimals));
        usdt = usdt.plus(balance.multipliedBy(priceArr[0].price));
      }
    }

    if (usdt.isNaN()) {
      return "0";
    }

    return usdt.toFixed();
  }

  async getTokenPriceList(chainId: string, contractAddressList: string[]): Promise<any[]> {
    const usdtList: any[] = [];

    try {
      const response = await this.api.post("/evm-chain", {
        chainId: Number(chainId),
        jsonrpc: "2.0",
        id: 1,
        method: "particle_getPrice",
        params: [
          contractAddressList,
          [
            "usd",
          ],
        ],
      }, {
        auth: {
          username: config.datasourceApiKey,
          password: config.datasourceApiSKey,
        },
      });

      this.checkData(response);

      const list = response.data.result || [];
      for (let i = 0; i < list.length; i++) {
        if (list[i].currencies && list[i].currencies[0] && list[i].currencies[0].price) {
          usdtList.push({
            address: list[i].address,
            price: String(list[i].currencies[0].price),
          });
        }
      }
    } catch (_) {
      //
    }

    return usdtList;
  }

  async getUSDTAssetsList(chainId: string, addressList: string[]): Promise<USDTAssets[]> {
    if (!this.usdtAssetsMap) {
      this.usdtAssetsMap = {};
    }

    const list: USDTAssets[] = [];

    for (let i = 0; i < addressList.length; i++) {
      const address = addressList[i];

      if (this.usdtAssetsMap[address]) {
        if (!this.expireCacheTime(this.usdtAssetsMap[address].time, (15 * 60 * 1000))) {
          list.push(this.usdtAssetsMap[address].assets);
          continue;
        }
      }

      const usdtAssets = new USDTAssets();
      usdtAssets.address = address;
      usdtAssets.usdt = "0";

      const tokenAssetsList = await this.getTokenAssetsList(chainId, address);
      if (tokenAssetsList.length) {
        const tokenList: string[] = [];
        tokenAssetsList.forEach(assets => {
          tokenList.push(assets.address);
        });
        const tokenPriceList = await this.getTokenPriceList(chainId, tokenList);
        if (tokenPriceList.length) {
          usdtAssets.usdt = this.calculationUSDT(tokenAssetsList, tokenPriceList);
        }
      }

      this.usdtAssetsMap[address] = {
        time: Date.now(),
        assets: usdtAssets,
      };
      list.push(usdtAssets);
    }

    return list;
  }
}