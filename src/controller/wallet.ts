import { Context } from "koa";
import { request, summary, description, query, body, responsesAll, tagsAll } from "koa-swagger-decorator";

import { NetworkFactory, networkValidator, addressValidator, mnemonicValidator, privateKeyValidator } from "../entity/network";
import { success } from "../entity/result";
import { ResultError } from "../entity/error";

@tagsAll(["Wallet"])
@responsesAll({ 200: { description: "success" } })
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
    "code": 1002,
    "resultMsg": "please check whether the request parameters are correct"
  }
  {
    "code": 1003,
    "resultMsg": "invalid address"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  `)
  public static async getWalletAssets(ctx: Context): Promise<void> {
    const networkParam = (ctx.query.network as string);
    const addressParam = (ctx.query.address as string);

    const ok = networkValidator(networkParam) && addressValidator(addressParam);
    if (!ok) {
      throw new ResultError(1002, "please check whether the request parameters are correct");
    }

    const network = NetworkFactory.create(networkParam);
    const assets = await network.getAssets(addressParam);

    ctx.status = 200;
    ctx.body = success(assets);
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
    "code": 1001,
    "resultMsg": "network is invalid"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  `)
  public static async getWalletKKCAssets(ctx: Context): Promise<void> {
    const networkParam = (ctx.query.network as string);

    const ok = networkValidator(networkParam);
    if (!ok) {
      throw new ResultError(1001, "network is invalid");
    }

    const network = NetworkFactory.create(networkParam);
    const assets = await network.getKKCAssets();

    ctx.status = 200;
    ctx.body = success(assets);
  }

  @request("post", "/wallet/assets/usdtlist")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    addressList: { type: "array", required: true, items: { type: "string", description: "钱包地址(hex)" } },
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
        "address": "0x...",
        "usdt": "123.2"
      }
    ]
  }
  {
    "code": 1002,
    "resultMsg": "please check whether the request parameters are correct"
  }
  {
    "code": 1003,
    "resultMsg": "invalid address"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  `)
  public static async getWalletUSDTAssetsList(ctx: Context): Promise<void> {
    const networkParam = (ctx.request.body as any).network;
    const addressListParam = (ctx.request.body as any).addressList;

    const ok = networkValidator(networkParam) && Array.isArray(addressListParam);
    if (!ok) {
      throw new ResultError(1002, "please check whether the request parameters are correct");
    }

    const network = NetworkFactory.create(networkParam);
    const assetsList = await network.getUSDTAssetsList(addressListParam);

    ctx.status = 200;
    ctx.body = success(assetsList);
  }

  @request("post", "/wallet/transfer")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    fromPrivateKey: { type: "string", required: true, description: "发送方钱包私钥(hex)" },
    toAddress: { type: "string", required: true, description: "接受方钱包地址(hex)" },
    amount: { type: "string", required: true, description: "金额(kkc)" },
    type: { type: "string", required: true, description: "转账类型 0链上资产转入 1链上资产转出" },
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
    "code": 1002,
    "resultMsg": "please check whether the request parameters are correct"
  }
  {
    "code": 1003,
    "resultMsg": "invalid address"
  }
  {
    "code": 1004,
    "resultMsg": "invalid sign"
  }
  {
    "code": 1005,
    "resultMsg": "invalid number"
  }
  {
    "code": 4001,
    "resultMsg": "insufficient balance, unable to complete the transaction"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  `)
  public static async toTransfer(ctx: Context): Promise<void> {
    const networkParam = (ctx.request.body as any).network;
    const fromPrivateKeyParam = (ctx.request.body as any).fromPrivateKey;
    const toAddressParam = (ctx.request.body as any).toAddress;
    const amountParam = (ctx.request.body as any).amount;
    const txTypeParam = (ctx.request.body as any).type;

    const ok = networkValidator(networkParam) && privateKeyValidator(fromPrivateKeyParam) && addressValidator(toAddressParam) && amountParam;
    if (!ok) {
      throw new ResultError(1002, "please check whether the request parameters are correct");
    }

    const network = NetworkFactory.create(networkParam);
    const txHash = await network.toTransfer(fromPrivateKeyParam, toAddressParam, amountParam, txTypeParam);

    ctx.status = 200;
    ctx.body = success(txHash);
  }

  @request("post", "/wallet/transfer/kkc")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    fromPrivateKey: { type: "string", required: true, description: "发送方钱包私钥(hex)" },
    toAddress: { type: "string", required: true, description: "接受方钱包地址(hex)" },
    amount: { type: "string", required: true, description: "金额(kkc)" },
    type: { type: "string", required: true, description: "转账类型 0链上资产转入 1链上资产转出" },
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
    "code": 1002,
    "resultMsg": "please check whether the request parameters are correct"
  }
  {
    "code": 1003,
    "resultMsg": "invalid address"
  }
  {
    "code": 1004,
    "resultMsg": "invalid sign"
  }
  {
    "code": 1005,
    "resultMsg": "invalid number"
  }
  {
    "code": 4001,
    "resultMsg": "insufficient balance, unable to complete the transaction"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  `)
  public static async toTransferKKC(ctx: Context): Promise<void> {
    const networkParam = (ctx.request.body as any).network;
    const fromPrivateKeyParam = (ctx.request.body as any).fromPrivateKey;
    const toAddressParam = (ctx.request.body as any).toAddress;
    const amountParam = (ctx.request.body as any).amount;
    const txTypeParam = (ctx.request.body as any).type;

    const ok = networkValidator(networkParam) && privateKeyValidator(fromPrivateKeyParam) && addressValidator(toAddressParam) && amountParam;
    if (!ok) {
      throw new ResultError(1002, "please check whether the request parameters are correct");
    }

    const network = NetworkFactory.create(networkParam);
    const txHash = await network.toTransferKKC(fromPrivateKeyParam, toAddressParam, amountParam, txTypeParam);

    ctx.status = 200;
    ctx.body = success(txHash);
  }
}