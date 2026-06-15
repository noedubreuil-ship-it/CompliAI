import "dotenv/config";
import { stripe } from "../lib/stripe/client";
import { fulfillCreditPackFromSession } from "../lib/stripe/fulfill-credit-pack";

const sessionId =
  process.argv[2] ??
  "cs_live_a1EHlU83Yy4cxDsMXGkt5swnoVcQ4Wa2nJF2VNxa758bTXMfQImefQMASB";

async function main() {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  console.log("payment_status:", session.payment_status);
  const result = await fulfillCreditPackFromSession(session);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
