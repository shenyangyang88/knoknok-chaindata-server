import { Context } from "koa";
import { request, summary, description, query, body, responsesAll, tagsAll } from "koa-swagger-decorator";

import { NetworkFactory, networkValidator, addressValidator, mnemonicValidator, privateKeyValidator } from "../entity/network";
import { success, failure } from "../entity/result";
import { ResultError } from "../entity/error";

@tagsAll(["Pay"])
@responsesAll({ 200: { description: "success" } })
export default class PayController {
  @request("post", "/pay/kkc/deposit")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    fromPrivateKey: { type: "string", required: true, description: "钱包私钥(hex)" },
    amount: { type: "string", required: true, description: "金额(kkc)" },
  })
  @summary("kkc充值")
  @description(`
  用途：
  根据区块链网络，链上用户资产充值到平台的账号里面。
  用于Knoknok支付页面的KKC充值功能。
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
  public static async toDepositKKC(ctx: Context): Promise<void> {
    const networkParam = (ctx.request.body as any).network;
    const fromPrivateKeyParam = (ctx.request.body as any).fromPrivateKey;
    const amountParam = (ctx.request.body as any).amount;

    const ok = networkValidator(networkParam) && privateKeyValidator(fromPrivateKeyParam) && amountParam;
    if (!ok) {
      throw new ResultError(1002, "please check whether the request parameters are correct");
    }

    const network = NetworkFactory.create(networkParam);
    const txHash = await network.toDepositKKC(fromPrivateKeyParam, amountParam);

    ctx.status = 200;
    ctx.body = success(txHash);
  }

  @request("post", "/pay/kkc/withdraw")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    toAddress: { type: "string", required: true, description: "钱包地址(hex)" },
    amount: { type: "string", required: true, description: "金额(kkc)" },
  })
  @summary("kkc提现")
  @description(`
  用途：
  根据区块链网络，链上平台资产提现到用户的账号里面。
  用于Knoknok支付页面的KKC提现功能。
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
  public static async toWithdrawKKC(ctx: Context): Promise<void> {
    const networkParam = (ctx.request.body as any).network;
    const toAddressParam = (ctx.request.body as any).toAddress;
    const amountParam = (ctx.request.body as any).amount;

    const ok = networkValidator(networkParam) && addressValidator(toAddressParam) && amountParam;
    if (!ok) {
      throw new ResultError(1002, "please check whether the request parameters are correct");
    }

    const network = NetworkFactory.create(networkParam);
    const txHash = await network.toWithdrawKKC(toAddressParam, amountParam);

    ctx.status = 200;
    ctx.body = success(txHash);
  }
}