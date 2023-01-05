import { Context } from "koa";
import { request, summary, description, query, body, responsesAll, tagsAll } from "koa-swagger-decorator";

import { NetworkFactory, networkValidator, addressValidator, mnemonicValidator, privateKeyValidator } from "../entity/network";
import { success, failure } from "../entity/result";

@tagsAll(["Pay"])
@responsesAll({ 200: { description: "success" }, 500: { description: "internal server error" } })
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
  public static async toDepositKKC(ctx: Context): Promise<void> {
    const isOK = networkValidator((ctx.request.body as any).network) && privateKeyValidator((ctx.request.body as any).fromPrivateKey) && (ctx.request.body as any).amount;
    if (!isOK) {
      ctx.status = 200;
      ctx.body = failure(400, "bad request");
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);
    try {
      const txHash = await network.toDepositKKC((ctx.request.body as any).fromPrivateKey, (ctx.request.body as any).amount);
      ctx.status = 200;
      ctx.body = success(txHash);
    } catch (error) {
      ctx.status = 200;
      ctx.body = failure(500, error.message);
    }
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
  public static async toWithdrawKKC(ctx: Context): Promise<void> {
    const isOK = networkValidator((ctx.request.body as any).network) && addressValidator((ctx.request.body as any).toAddress) && (ctx.request.body as any).amount;
    if (!isOK) {
      ctx.status = 200;
      ctx.body = failure(400, "bad request");
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);

    try {
      const txHash = await network.toWithdrawKKC((ctx.request.body as any).toAddress, (ctx.request.body as any).amount);
      ctx.status = 200;
      ctx.body = success(txHash);
    } catch (error) {
      ctx.status = 200;
      ctx.body = failure(500, error.message);
    }
  }
}