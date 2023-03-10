import { SwaggerRouter } from "koa-swagger-decorator";

import { account, wallet, pay } from "./controller";

const protectedRouter = new SwaggerRouter();

protectedRouter.post("/accounts/new", account.createAccount);
protectedRouter.post("/accounts/fromprivatekey", account.fromPrivateKey);
protectedRouter.post("/accounts/frommnemonic", account.fromMnemonic);

protectedRouter.get("/wallet/assets", wallet.getWalletAssets);
protectedRouter.get("/wallet/assets/kkc", wallet.getWalletKKCAssets);
protectedRouter.post("/wallet/assets/usdtlist", wallet.getWalletUSDTAssetsList);
protectedRouter.post("/wallet/transfer", wallet.toTransfer);
protectedRouter.post("/wallet/transfer/kkc", wallet.toTransferKKC);

protectedRouter.post("/pay/kkc/deposit", pay.toDepositKKC);
protectedRouter.post("/pay/kkc/withdraw", pay.toWithdrawKKC);

// Swagger endpoint
protectedRouter.swagger({
    title: "knoknok chaindata server",
    description: "a chaindata interactive system.",
    version: "1.0.0"
});

// mapDir will scan the input dir, and automatically call router.map to all Router Class
protectedRouter.mapDir(__dirname);

export { protectedRouter };