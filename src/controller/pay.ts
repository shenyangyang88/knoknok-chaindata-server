import { Context } from "koa";
import { request, summary, description, query, body, responsesAll, tagsAll } from "koa-swagger-decorator";

import { NetworkFactory } from "../entity/network";
import { success, failure } from "../entity/result";
import { validateNetwork } from "../utils/validator";

@tagsAll(["Pay"])
@responsesAll({ 200: { description: "success" }, 400: { description: "bad request" }, 404: { description: "not found" }, 500: { description: "internal server error" } })
export default class PayController {
  @request("post", "/pay/kkc/deposit")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    fromAddress: { type: "string", required: true, description: "钱包地址(hex)" },
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
    "data": true
  }
  {
    "code": 1 //,
    "resultMsg": ""
  }
  `)
  public static async toDepositKKC(ctx: Context): Promise<void> {
    const isOK = validateNetwork((ctx.request.body as any).network) && (ctx.request.body as any).fromAddress && (ctx.request.body as any).amount;
    if (!isOK) {
      ctx.status = 400;
      ctx.body = "bad request";
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);
    const result = await network.toDepositKKC((ctx.request.body as any).fromAddress, (ctx.request.body as any).amount);

    if (result.code == "0") {
      ctx.status = 200;
      ctx.body = success(true);
    } else {
      ctx.status = 200;
      ctx.body = failure(Number(result.code), result.resultMsg);
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
    "data": true
  }
  {
    "code": 1 //,
    "resultMsg": ""
  }
  `)
  public static async toWithdrawKKC(ctx: Context): Promise<void> {
    const isOK = validateNetwork((ctx.request.body as any).network) && (ctx.request.body as any).toAddress && (ctx.request.body as any).amount;
    if (!isOK) {
      ctx.status = 400;
      ctx.body = "bad request";
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);
    const result = await network.toWithdrawKKC((ctx.request.body as any).toAddress, (ctx.request.body as any).amount);

    if (result.code == "0") {
      ctx.status = 200;
      ctx.body = success(true);
    } else {
      ctx.status = 200;
      ctx.body = failure(Number(result.code), result.resultMsg);
    }
  }
}