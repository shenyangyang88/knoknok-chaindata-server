import { Context } from "koa";
import { request, summary, description, query, body, responsesAll, tagsAll } from "koa-swagger-decorator";

import { NetworkFactory, networkValidator, addressValidator, mnemonicValidator, privateKeyValidator } from "../entity/network";
import { success, failure } from "../entity/result";

@tagsAll(["Wallet"])
@responsesAll({ 200: { description: "success" }, 500: { description: "internal server error" } })
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
      "kkc": "1.123456",
      "governanceToken": "1.123456" //区块链网络的治理代币 (apt|bnb|matic)
    }
  }
  {
    "code": 400,
    "resultMsg": "bad request"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  错误：
  http status 500 internal server error
  `)
  public static async getWalletAssets(ctx: Context): Promise<void> {
    const isOK = networkValidator((ctx.query.network as string)) && addressValidator((ctx.query.address as string));
    if (!isOK) {
      ctx.status = 200;
      ctx.body = failure(400, "bad request");
      return;
    }

    const network = NetworkFactory.create((ctx.query.network as string));

    try {
      const assets = await network.getAssets((ctx.query.address as string));
      ctx.status = 200;
      ctx.body = success(assets);
    } catch (error) {
      ctx.status = 200;
      ctx.body = failure(500, error.message);
    }
  }

  @request("get", "/wallet/assets/kkc")
  @query({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" }
  })
  @summary("获取KKC链上信息")
  @description(`
  用途：
  根据区块链网络，获取KKC区块链价格信息。
  数据：
  {
    "code": 0,
    "resultMsg": "success",
    "data": {
      "price": "1.123456", //USDT
      "tendency": "0" //价格趋势百分比
    }
  }
  {
    "code": 400,
    "resultMsg": "bad request"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  错误：
  http status 500 internal server error
  `)
  public static async getWalletKKCAssets(ctx: Context): Promise<void> {
    const isOK = networkValidator((ctx.query.network as string));
    if (!isOK) {
      ctx.status = 200;
      ctx.body = failure(400, "bad request");
      return;
    }

    const network = NetworkFactory.create((ctx.query.network as string));
    const assets = await network.getKKCAssets();

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
        "usdt": "123.2"
      }
    ]
  }
  {
    "code": 400,
    "resultMsg": "bad request"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  错误：
  http status 500 internal server error
  `)
  public static async getWalletUSDTAssetsList(ctx: Context): Promise<void> {
    const isOK = networkValidator((ctx.request.body as any).network) && Array.isArray((ctx.request.body as any).addressList);
    if (!isOK) {
      ctx.status = 200;
      ctx.body = failure(400, "bad request");
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);
    const assetsList = await network.getUSDTAssetsList((ctx.request.body as any).addressList);

    ctx.status = 200;
    ctx.body = success(assetsList);
  }

  @request("post", "/wallet/transfer")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    fromPrivateKey: { type: "string", required: true, description: "发送方钱包私钥(hex)" },
    toAddress: { type: "string", required: true, description: "接受方钱包地址(hex)" },
    amount: { type: "string", required: true, description: "金额(kkc)" },
  })
  @summary("区块链治理代币交易")
  @description(`
  用途：
  根据区块链网络，将当前钱包的资产交易到指定钱包账号的资产里面。
  用于Knoknok钱包页面的APT|BNB|MATIC发送功能。
  数据：
  {
    "code": 0,
    "resultMsg": "success",
    "data": "" //hash
  }
  {
    "code": 400,
    "resultMsg": "bad request"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  错误：
  http status 500 internal server error
  `)
  public static async toTransfer(ctx: Context): Promise<void> {
    const isOK = networkValidator((ctx.request.body as any).network) && privateKeyValidator((ctx.request.body as any).fromPrivateKey) && addressValidator((ctx.request.body as any).toAddress) && (ctx.request.body as any).amount;
    if (!isOK) {
      ctx.status = 200;
      ctx.body = failure(400, "bad request");
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);

    try {
      const txHash = await network.toTransfer((ctx.request.body as any).fromPrivateKey, (ctx.request.body as any).toAddress, (ctx.request.body as any).amount);
      ctx.status = 200;
      ctx.body = success(txHash);
    } catch (error) {
      ctx.status = 200;
      ctx.body = failure(500, error.message);
    }
  }

  @request("post", "/wallet/transfer/kkc")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    fromPrivateKey: { type: "string", required: true, description: "发送方钱包私钥(hex)" },
    toAddress: { type: "string", required: true, description: "接受方钱包地址(hex)" },
    amount: { type: "string", required: true, description: "金额(kkc)" },
  })
  @summary("区块链KKC代币交易")
  @description(`
  用途：
  根据区块链网络，将当前钱包的KKC代币资产交易到指定钱包账号的资产里面。
  用于Knoknok钱包页面的KKC发送功能。
  数据：
  {
    "code": 0,
    "resultMsg": "success",
    "data": "" //hash
  }
  {
    "code": 400,
    "resultMsg": "bad request"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  错误：
  http status 500 internal server error
  `)
  public static async toTransferKKC(ctx: Context): Promise<void> {
    const isOK = networkValidator((ctx.request.body as any).network) && privateKeyValidator((ctx.request.body as any).fromPrivateKey) && addressValidator((ctx.request.body as any).toAddress) && (ctx.request.body as any).amount;
    if (!isOK) {
      ctx.status = 200;
      ctx.body = failure(400, "bad request");
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);

    try {
      const txHash = await network.toTransferKKC((ctx.request.body as any).fromPrivateKey, (ctx.request.body as any).toAddress, (ctx.request.body as any).amount);
      ctx.status = 200;
      ctx.body = success(txHash);
    } catch (error) {
      ctx.status = 200;
      ctx.body = failure(500, error.message);
    }
  }
}