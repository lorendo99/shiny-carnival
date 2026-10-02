import { getStripeSync } from "./stripeClient";

export async function processStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  await (await getStripeSync()).processWebhook(payload, signature);
}