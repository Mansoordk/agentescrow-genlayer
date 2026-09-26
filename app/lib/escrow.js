import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export function getReadClient() {
  if (!CONTRACT) throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS.");
  return createClient({ chain: studionet });
}

export function getWriteClient(account) {
  if (!account) throw new Error("Connect your wallet first.");
  if (!window.ethereum) throw new Error("MetaMask or another Web3 wallet is required.");
  if (!CONTRACT) throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS.");
  return createClient({ chain: studionet, account, provider: window.ethereum });
}

export async function getTaskCount() {
  const client = getReadClient();
  const count = await client.readContract({
    address: CONTRACT,
    functionName: "get_task_count",
    args: [],
  });
  return Number(count);
}

export async function getTask(id) {
  const client = getReadClient();
  return client.readContract({
    address: CONTRACT,
    functionName: "get_task",
    args: [Number(id)],
  });
}

export async function getAllTasks() {
  const count = await getTaskCount();
  if (count === 0) return [];
  const results = await Promise.all(
    Array.from({ length: count }, (_, id) =>
      getTask(id).catch(() => null)
    )
  );
  return results.filter(Boolean);
}

export async function writeContract(account, functionName, args = [], value) {
  const client = getWriteClient(account);
  return client.writeContract({
    address: CONTRACT,
    functionName,
    args,
    ...(value !== undefined ? { value } : {}),
  });
}

export async function waitForTaskState(id, expectedStatuses = [], timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await getTask(id);
      if (!expectedStatuses.length || expectedStatuses.includes(String(result.status))) {
        return result;
      }
    } catch {
      // Transaction may still be processing.
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  throw new Error("The transaction was submitted, but the task state did not update in time. Refresh and try again.");
}

export function shortAddress(address) {
  const value = String(address || "");
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";
}

export function formatAmount(value) {
  try {
    const n = BigInt(value);
    const whole = n / 10n ** 18n;
    const fraction = n % 10n ** 18n;
    if (fraction === 0n) return `${whole}`;
    return `${whole}.${fraction.toString().padStart(18, "0").replace(/0+$/, "")}`;
  } catch {
    return String(value ?? "0");
  }
}

export function isCompleted(status) {
  return ["PAID", "REFUNDED", "DISPUTE_SETTLED"].includes(String(status));
}
