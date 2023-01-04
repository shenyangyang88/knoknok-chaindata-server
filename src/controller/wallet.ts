import { Context } from "koa";
import { request, summary, description, query, body, responsesAll, tagsAll } from "koa-swagger-decorator";

import { NetworkFactory } from "../entity/network";
import { success, failure } from "../entity/result";
import { validateNetwork } from "../utils/validator";

@tagsAll(["Wallet"])
@responsesAll({ 200: { description: "success" }, 400: { description: "bad request" }, 404: { description: "not found" }, 500: { description: "internal server error" } })
export default class WalletController {
  @request("get", "/wallet/assets")
  @query({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    address: { type: "string", required: true, description: "钱包地址(hex)" },
  })
  @summary("获取钱包资产")
  @description(`
  用途：
  根据区块链网络，获取指定钱包地址的资产。
  数据：
  {
    "code": 0,
    "resultMsg": "success",
    "data": {
      "id": "账号地址", //0x...
      "kkc": "1.123456",
      "balance": "1.123456" //区块链网络的治理代币 (apt|bnb|matic)
    }
  }
  `)
  public static async getWalletAssets(ctx: Context): Promise<void> {
    const isOK = validateNetwork((ctx.query.network as string)) && (ctx.query.address as string);
    if (!isOK) {
      ctx.status = 400;
      ctx.body = "bad request";
      return;
    }

    const network = NetworkFactory.create((ctx.query.network as string));
    const assets = await network.getAssets((ctx.query.address as string));

    ctx.status = 200;
    ctx.body = success(assets);
  }

  @request("post", "/wallet/assets/usdtlist")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    addressList: { type: "array", required: true, items: { type: 'string', description: "钱包地址(hex)" } },
  })
  @summary("获取钱包的USDT资产列表")
  @description(`
  用途：
  根据区块链网络，获取指定钱包地址的USDT资产列表。
  数据：
  {
    "code": 0,
    "resultMsg": "success",
    "data": [
      {
        "id": "账号地址", //0x...
        "usdt": "123.2"
      }
    ]
  }
  `)
  public static async getWalletUSDTAssetsList(ctx: Context): Promise<void> {
    const isOK = validateNetwork((ctx.request.body as any).network) && Array.isArray((ctx.request.body as any).addressList);
    if (!isOK) {
      ctx.status = 400;
      ctx.body = "bad request";
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);
    const assetsList = await network.getUSDTAssetsList((ctx.request.body as any).addressList);

    ctx.status = 200;
    ctx.body = success(assetsList);
  }
}