import { useEffect, useState } from "react";
import { accountRequest } from "../api/restaurantProfile";

export const squareStateKey = "menurithm.square.state";
type Result = { severity: "success" | "error"; message: string };

const query = new URLSearchParams(location.search);
const isReturn = location.pathname === "/account" && query.has("state") &&
  (query.has("code") || query.has("error"));
if (isReturn) history.replaceState(history.state, "", "/account");

let result: Promise<Result> | undefined;
async function finish(): Promise<Result> {
  const expected = sessionStorage.getItem(squareStateKey);
  const state = query.get("state");
  if (!expected || expected !== state) {
    return { severity: "error", message: "Square authorization could not be verified. Start again from Sales." };
  }
  sessionStorage.removeItem(squareStateKey);
  if (!query.get("code")) return { severity: "error", message: "Square authorization was not completed." };
  await accountRequest("square/connect", "POST", { code: query.get("code"), state });
  return { severity: "success", message: "Square connected. You can now preview sales." };
}

export function useSquareReturn() {
  const [message, setMessage] = useState<Result>();
  useEffect(() => {
    if (!isReturn) return;
    let active = true;
    result ??= finish().catch((error: unknown) => ({
      severity: "error", message: error instanceof Error ? error.message : "Square could not be connected.",
    }));
    void result.then(value => { if (active) setMessage(value); });
    return () => { active = false; };
  }, []);
  return message;
}
