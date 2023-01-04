import Koa from "koa";
import bodyParser from "koa-bodyparser";
import helmet from "koa-helmet";
import cors from "@koa/cors";
import winston from "winston";
import "reflect-metadata";

import { logger } from "./logger";
import { config } from "./config";
import { unprotectedRouter } from "./unprotectedRoutes";
import { protectedRouter } from "./protectedRoutes";


const app = new Koa();

// Provides important security headers to make your app more secure
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "online.swagger.io", "validator.swagger.io"]
    }
}));

// Enable cors with default options
app.use(cors());

// Logger middleware -> use winston as logger (logging.ts with config)
app.use(logger(winston));

// Enable bodyParser with default options
app.use(bodyParser());

// these routes are NOT protected by the JWT middleware, also include middleware to respond with "Method Not Allowed - 405".
app.use(unprotectedRouter.routes()).use(unprotectedRouter.allowedMethods());

// These routes are protected by the JWT middleware, also include middleware to respond with "Method Not Allowed - 405".
app.use(protectedRouter.routes()).use(protectedRouter.allowedMethods());

app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});