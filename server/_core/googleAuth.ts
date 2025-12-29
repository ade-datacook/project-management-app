import axios from "axios";
import { ENV } from "./env";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Request, Response } from "express";
import * as db from "../db";
import { webcrypto } from "node:crypto";

// Jose needs globalThis.crypto which is not global in older Node.js versions (e.g. Node 18)
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
import { getSessionCookieOptions } from "./cookies";
import { logStartup } from "./index";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getRootUrl(req: Request) {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const proto = protocol.includes(",") ? protocol.split(",")[0].trim() : protocol;
    return `${proto}://${req.get("host")}`;
}

export function getGoogleAuthUrl(req: Request) {
    const rootUrl = getRootUrl(req);
    const redirectUri = `${rootUrl}/api/auth/google/callback`;

    const options = {
        redirect_uri: redirectUri,
        client_id: ENV.googleClientId,
        access_type: "offline",
        response_type: "code",
        prompt: "select_account",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
    };

    const qs = new URLSearchParams(options);
    return `${GOOGLE_AUTH_URL}?${qs.toString()}`;
}

async function getGoogleTokens(code: string, redirectUri: string) {
    const values = {
        code,
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
    };

    const { data } = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams(values), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return data;
}

async function getGoogleUser(accessToken: string) {
    const { data } = await axios.get(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
}

export async function handleGoogleCallback(req: Request, res: Response) {
    const code = req.query.code as string;
    const rootUrl = getRootUrl(req);
    const redirectUri = `${rootUrl}/api/auth/google/callback`;

    try {
        const { access_token } = await getGoogleTokens(code, redirectUri);
        const googleUser = await getGoogleUser(access_token);

        // Google uses email_verified (usually)
        const isVerified = googleUser.email_verified === true || googleUser.verified_email === true;

        if (!isVerified) {
            logStartup(`[Auth] Email not verified for ${googleUser.email}. Payload: ${JSON.stringify(googleUser)}`);
            return res.status(403).send("Email not verified by Google");
        }

        const email = googleUser.email.toLowerCase();
        const domain = (googleUser.hd || email.split("@")[1] || "").toLowerCase();

        // Check if authorized (either by specific email or by domain)
        const isEmailAllowed = ENV.allowedEmails.length === 0 || ENV.allowedEmails.includes(email);
        const isDomainAllowed = ENV.allowedDomains.length === 0 || ENV.allowedDomains.includes(domain);

        // If both lists are provided, we check if user matches at least one (OR logic)
        // If only domains are provided, we check domain.
        // If only emails are provided, we check email.
        // However, if the user explicitly wants "all people from organization", domain check is key.

        let isAuthorized = false;
        if (ENV.allowedDomains.length > 0 && ENV.allowedEmails.length > 0) {
            isAuthorized = isEmailAllowed || isDomainAllowed;
        } else if (ENV.allowedDomains.length > 0) {
            isAuthorized = isDomainAllowed;
        } else if (ENV.allowedEmails.length > 0) {
            isAuthorized = isEmailAllowed;
        } else {
            // If no restrictions defined, allow all Google users (not recommended but follows logic)
            isAuthorized = true;
        }

        if (!isAuthorized) {
            logStartup(`[Auth] Rejected unauthorized user: ${email} (domain: ${domain})`);
            return res.status(403).send("Accès restreint : votre compte ou domaine n'est pas autorisé.");
        }

        // Upsert user in DB
        await db.upsertUser({
            openId: `google_${googleUser.sub}`,
            name: googleUser.name,
            email: email,
            loginMethod: "google",
            lastSignedIn: new Date(),
        });

        // Create Session JWT
        const secretKey = new TextEncoder().encode(ENV.cookieSecret);
        const sessionToken = await new SignJWT({
            openId: `google_${googleUser.sub}`,
            appId: "google-auth",
            name: googleUser.name,
        })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setExpirationTime("365d")
            .sign(secretKey);

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        res.redirect("/");
    } catch (err: any) {
        let errorMessage = err.message;
        if (err.response?.data) {
            errorMessage += ` - Details: ${JSON.stringify(err.response.data)}`;
        }
        logStartup(`[Auth] Google Callback Error: ${errorMessage}\n${err.stack}`);

        // Show detailed error if we are on localhost (even if NODE_ENV=production) or in dev mode
        const host = req.get("host") || "";
        if (host.includes("localhost") || host.includes("127.0.0.1") || process.env.NODE_ENV === "development") {
            return res.status(500).send(`Authentication failed: ${errorMessage}`);
        }
        res.status(500).send("Authentication failed");
    }
}
