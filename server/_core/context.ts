import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

import { COOKIE_NAME } from "@shared/const";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import * as db from "../db";
import { parse as parseCookie } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const { req, res } = opts;
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookie(cookieHeader);
  const sessionToken = cookies[COOKIE_NAME];

  let user: User | null = null;

  if (sessionToken) {
    try {
      const secretKey = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(sessionToken, secretKey, {
        algorithms: ["HS256"],
      });

      if (payload && typeof payload.openId === "string") {
        const dbUser = await db.getUserByOpenId(payload.openId);
        user = dbUser || null;
      }
    } catch (err) {
      // Invalid token, ignore
    }
  }

  return {
    req,
    res,
    user,
  };
}
