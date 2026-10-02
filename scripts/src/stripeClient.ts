import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

async function getCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;
  if (!hostname || !token) throw new Error("Stripe integration is not available.");
  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: token }, signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new Error(`Stripe credentials could not be loaded (${response.status}).`);
  const data = (await response.json()) as { items?: Array<{ settings?: { secret?: string; webhook_secret?: string } }> };
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret) throw new Error("Stripe integration is missing its secret key.");
  return { secretKey: settings.secret, webhookSecret: settings.webhook_secret };
}

export async function getStripeClient(): Promise<Stripe> {
  return new Stripe((await getCredentials()).secretKey);
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const credentials = await getCredentials();
  return new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL },
    stripeSecretKey: credentials.secretKey,
    stripeWebhookSecret: credentials.webhookSecret ?? "",
  });
}