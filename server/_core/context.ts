import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // On ne vérifie plus le sdk.authenticateRequest
  return {
    req: opts.req,
    res: opts.res,
    user: null, // On renvoie toujours null, c'est public
  };
}
