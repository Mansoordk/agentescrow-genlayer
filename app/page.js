"use client";

import { useEffect, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export default function Home() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Create task
  const [title, setTitle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [amount, setAmount] = useState("1");

  // Task
  const [taskId, setTaskId] = useState("");
  const [task, setTask] = useState(null);

  // Result
  const [resultUrl, setResultUrl] = useState("");

  // ---------------------------------------------------------
  // READ CLIENT
  // ---------------------------------------------------------

  function getReadClient() {
    if (!CONTRACT) {
      throw new Error(
        "Missing NEXT_PUBLIC_CONTRACT_ADDRESS."
      );
    }

    return createClient({
      chain: studionet,
    });
  }

  // ---------------------------------------------------------
  // WRITE CLIENT
  // ---------------------------------------------------------

  function getWriteClient() {
    if (!account) {
      throw new Error("Connect your wallet first.");
    }

    if (!window.ethereum) {
      throw new Error(
        "MetaMask or another Web3 wallet is required."
      );
    }

    if (!CONTRACT) {
      throw new Error(
        "Missing NEXT_PUBLIC_CONTRACT_ADDRESS."
      );
    }

    return createClient({
      chain: studionet,
      account,
      provider: window.ethereum,
    });
  }

  // ---------------------------------------------------------
  // CONNECT WALLET
  // ---------------------------------------------------------

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error(
          "Please install MetaMask or another Web3 wallet."
        );
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts?.length) {
        throw new Error("No wallet account found.");
      }

      const connectedAccount = accounts[0];

      setAccount(connectedAccount);
      setStatus("Wallet connected.");

      try {
        const client = createClient({
          chain: studionet,
          account: connectedAccount,
          provider: window.ethereum,
        });

        await client.connect("studionet");
      } catch {
        // Wallet may already be connected to Studionet.
      }
    } catch (error) {
      setStatus(
        error?.message || "Wallet connection failed."
      );
    }
  }

  // ---------------------------------------------------------
  // WAIT FOR CONTRACT STATE
  // ---------------------------------------------------------

  async function waitForTaskState(
    id,
    expectedStatuses = [],
    timeoutMs = 120000
  ) {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      try {
        const result = await readTask(id);

        if (
          expectedStatuses.length === 0 ||
          expectedStatuses.includes(String(result.status))
        ) {
          return result;
        }
      } catch {
        // The transaction may still be processing.
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 4000)
      );
    }

    throw new Error(
      "Transaction was submitted, but the contract state did not update within the expected time. Try loading the task again."
    );
  }

  // ---------------------------------------------------------
  // WRITE CONTRACT
  // ---------------------------------------------------------

  async function writeContract(
    functionName,
    args = [],
    value
  ) {
    const client = getWriteClient();

    const txHash = await client.writeContract({
      address: CONTRACT,
      functionName,
      args,
      ...(value !== undefined ? { value } : {}),
    });

    return txHash;
  }

  // ---------------------------------------------------------
  // READ TASK COUNT
  // ---------------------------------------------------------

  async function getTaskCount() {
    const client = getReadClient();

    const count = await client.readContract({
      address: CONTRACT,
      functionName: "get_task_count",
      args: [],
    });

    return Number(count);
  }

  // ---------------------------------------------------------
  // READ TASK
  // ---------------------------------------------------------

  async function readTask(id) {
    if (id === "" || id === null || id === undefined) {
      throw new Error("Enter a task ID.");
    }

    const client = getReadClient();

    const result = await client.readContract({
      address: CONTRACT,
      functionName: "get_task",
      args: [Number(id)],
    });

    return result;
  }

  // ---------------------------------------------------------
  // LOAD TASK
  // ---------------------------------------------------------

  async function loadTask(id = taskId) {
    try {
      if (id === "" || id === null || id === undefined) {
        throw new Error("Enter a task ID.");
      }

      const result = await readTask(id);

      setTask(result);
      setTaskId(String(id));

      return result;
    } catch (error) {
      throw new Error(
        error?.message || "Failed to load task."
      );
    }
  }

  // ---------------------------------------------------------
  // CREATE TASK
  // ---------------------------------------------------------

  async function createTask() {
    try {
      if (!account) {
        throw new Error("Connect your wallet first.");
      }

      if (!title.trim()) {
        throw new Error("Task title is required.");
      }

      if (!requirements.trim()) {
        throw new Error(
          "Task requirements are required."
        );
      }

      const parsedAmount = Number(amount);

      if (
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      ) {
        throw new Error("Enter a valid GEN amount.");
      }

      setLoading(true);

      // IMPORTANT:
      // Read count BEFORE creating the task.
      const previousCount = await getTaskCount();

      // Contract uses len(task_titles) as the new ID.
      const newTaskId = previousCount;

      setStatus(
        `Creating task #${newTaskId}...`
      );

      const value =
        BigInt(Math.floor(parsedAmount)) *
        10n ** 18n;

      await writeContract(
        "create_task",
        [
          title.trim(),
          requirements.trim(),
        ],
        value
      );

      setTaskId(String(newTaskId));

      setTitle("");
      setRequirements("");
      setAmount("1");

      setStatus(
        `Transaction submitted. Waiting for task #${newTaskId}...`
      );

      const createdTask =
        await waitForTaskState(
          newTaskId,
          ["OPEN"]
        );

      setTask(createdTask);

      setStatus(
        `Task #${newTaskId} created with ${parsedAmount} GEN in escrow.`
      );
    } catch (error) {
      setStatus(
        error?.message || "Failed to create task."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // ACCEPT TASK
  // ---------------------------------------------------------

  async function acceptTask() {
    try {
      if (!account) {
        throw new Error("Connect your wallet first.");
      }

      if (taskId === "") {
        throw new Error("Enter a task ID first.");
      }

      setLoading(true);

      setStatus(
        `Accepting task #${taskId}...`
      );

      await writeContract(
        "accept_task",
        [Number(taskId)]
      );

      setStatus(
        `Transaction submitted. Waiting for task #${taskId}...`
      );

      const updatedTask =
        await waitForTaskState(
          Number(taskId),
          ["ACCEPTED"]
        );

      setTask(updatedTask);

      setStatus(
        `Task #${taskId} accepted by ${account}.`
      );
    } catch (error) {
      setStatus(
        error?.message || "Failed to accept task."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // SUBMIT RESULT
  // ---------------------------------------------------------

  async function submitResult() {
    try {
      if (!account) {
        throw new Error("Connect your wallet first.");
      }

      if (taskId === "") {
        throw new Error("Enter a task ID first.");
      }

      if (!resultUrl.trim()) {
        throw new Error("Result URL is required.");
      }

      setLoading(true);

      setStatus(
        `Submitting result for task #${taskId}...`
      );

      await writeContract(
        "submit_result",
        [
          Number(taskId),
          resultUrl.trim(),
        ]
      );

      setResultUrl("");

      setStatus(
        `Transaction submitted. Waiting for task #${taskId}...`
      );

      const updatedTask =
        await waitForTaskState(
          Number(taskId),
          ["SUBMITTED"]
        );

      setTask(updatedTask);

      setStatus(
        `Result submitted for task #${taskId}.`
      );
    } catch (error) {
      setStatus(
        error?.message || "Failed to submit result."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // EVALUATE TASK
  // ---------------------------------------------------------

  async function evaluateTask() {
    try {
      if (!account) {
        throw new Error("Connect your wallet first.");
      }

      if (taskId === "") {
        throw new Error("Enter a task ID first.");
      }

      setLoading(true);

      setStatus(
        `Running GenLayer evaluation for task #${taskId}...`
      );

      await writeContract(
        "evaluate_task",
        [Number(taskId)]
      );

      setStatus(
        `Evaluation transaction submitted. Waiting for GenLayer...`
      );

      const updatedTask =
        await waitForTaskState(
          Number(taskId),
          [
            "PAID",
            "REFUNDED",
            "DISPUTED",
          ],
          300000
        );

      setTask(updatedTask);

      setStatus(
        `Task #${taskId} evaluation completed.`
      );
    } catch (error) {
      setStatus(
        error?.message || "Evaluation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // SETTLE DISPUTE
  // ---------------------------------------------------------

  async function settleDispute() {
    try {
      if (!account) {
        throw new Error("Connect your wallet first.");
      }

      if (taskId === "") {
        throw new Error("Enter a task ID first.");
      }

      setLoading(true);

      setStatus(
        `Settling dispute for task #${taskId}...`
      );

      await writeContract(
        "settle_dispute",
        [Number(taskId)]
      );

      setStatus(
        `Transaction submitted. Waiting for settlement...`
      );

      const updatedTask =
        await waitForTaskState(
          Number(taskId),
          ["DISPUTE_SETTLED"]
        );

      setTask(updatedTask);

      setStatus(
        `Task #${taskId} dispute settled. Escrow split 50/50.`
      );
    } catch (error) {
      setStatus(
        error?.message || "Failed to settle dispute."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // WALLET ACCOUNT LISTENER
  // ---------------------------------------------------------

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts?.length) {
        setAccount(accounts[0]);
      } else {
        setAccount("");
        setTask(null);
      }
    };

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
    };
  }, []);

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Header */}

        <header className="mb-12 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              GenLayer
            </div>

            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              AgentEscrow
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-slate-400">
              Trustless escrow for AI agents.
              Agents can hire, complete, evaluate,
              and pay each other without requiring
              mutual trust.
            </p>
          </div>

          <button
            onClick={connectWallet}
            disabled={loading}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </header>

        {/* Status */}

        {status && (
          <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            {status}
          </div>
        )}

        {/* Create */}

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              01
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Create a task
            </h2>

            <p className="mt-2 text-slate-400">
              Deposit GEN into escrow and let an AI
              agent complete the task.
            </p>
          </div>

          <div className="grid gap-4">
            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Task title"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />

            <textarea
              value={requirements}
              onChange={(e) =>
                setRequirements(e.target.value)
              }
              placeholder="Describe exactly what the agent must accomplish..."
              rows={5}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />

            <div className="flex flex-col gap-4 md:flex-row">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="GEN"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400 md:w-40"
              />

              <button
                onClick={createTask}
                disabled={loading}
                className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : "Create & Lock GEN"}
              </button>
            </div>
          </div>
        </section>

        {/* Task lookup */}

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              02
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Find a task
            </h2>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="number"
              min="0"
              value={taskId}
              onChange={(e) =>
                setTaskId(e.target.value)
              }
              placeholder="Task ID"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400 md:w-48"
            />

            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  setStatus("Loading task...");
                  await loadTask(taskId);
                  setStatus(
                    `Task #${taskId} loaded.`
                  );
                } catch (error) {
                  setStatus(
                    error?.message ||
                      "Failed to load task."
                  );
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              Load Task
            </button>
          </div>
        </section>

        {/* Task */}

        {task && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  TASK #{String(task.id)}
                </p>

                <h2 className="mt-1 text-3xl font-bold">
                  {task.title}
                </h2>
              </div>

              <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300">
                {task.status}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div className="rounded-xl bg-slate-950 p-5">
                <p className="text-sm text-slate-500">
                  ESCROW
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {String(task.amount)}
                </p>

                <p className="text-sm text-slate-500">
                  GEN
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-5">
                <p className="text-sm text-slate-500">
                  SCORE
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {String(task.score)} / 100
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-5 md:col-span-2">
                <p className="text-sm text-slate-500">
                  REQUIREMENTS
                </p>

                <p className="mt-2 whitespace-pre-wrap text-slate-300">
                  {task.requirements}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-5">
                <p className="text-sm text-slate-500">
                  CREATOR
                </p>

                <p className="mt-2 break-all text-sm">
                  {String(task.creator)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-5">
                <p className="text-sm text-slate-500">
                  ASSIGNED AGENT
                </p>

                <p className="mt-2 break-all text-sm">
                  {String(task.agent)}
                </p>
              </div>

            </div>
          </section>
        )}

        {/* Agent actions */}

        {task && task.status === "OPEN" && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              03
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Accept task
            </h2>

            <p className="mt-2 text-slate-400">
              Your wallet becomes the assigned agent.
            </p>

            <button
              onClick={acceptTask}
              disabled={loading}
              className="mt-6 rounded-xl bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-200 disabled:opacity-50"
            >
              Accept Task
            </button>
          </section>
        )}

        {task &&
          task.status === "ACCEPTED" &&
          String(task.agent).toLowerCase() ===
            account.toLowerCase() && (
            <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                04
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Submit result
              </h2>

              <p className="mt-2 text-slate-400">
                Submit the URL containing the completed
                work.
              </p>

              <div className="mt-6 flex flex-col gap-3 md:flex-row">
                <input
                  value={resultUrl}
                  onChange={(e) =>
                    setResultUrl(e.target.value)
                  }
                  placeholder="https://your-result-url.com"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
                />

                <button
                  onClick={submitResult}
                  disabled={loading}
                  className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  Submit Result
                </button>
              </div>
            </section>
          )}

        {/* Evaluation */}

        {task && task.status === "SUBMITTED" && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              05
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Evaluate with GenLayer
            </h2>

            <p className="mt-2 text-slate-400">
              Validators evaluate the submitted result
              against the task requirements.
            </p>

            {task.result_url && (
              <a
                href={String(task.result_url)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block break-all rounded-xl bg-slate-950 p-4 text-cyan-400 underline"
              >
                {String(task.result_url)}
              </a>
            )}

            <button
              onClick={evaluateTask}
              disabled={loading}
              className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading
                ? "Evaluating..."
                : "Run AI Evaluation"}
            </button>
          </section>
        )}

        {/* Result */}

        {task &&
          [
            "PAID",
            "REFUNDED",
            "DISPUTED",
            "DISPUTE_SETTLED",
          ].includes(String(task.status)) && (
            <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                06
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Evaluation result
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-3">

                <div className="rounded-xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-500">
                    VERDICT
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {String(task.verdict)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-500">
                    SCORE
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {String(task.score)} / 100
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-500">
                    STATUS
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {String(task.status)}
                  </p>
                </div>

              </div>

              <div className="mt-4 rounded-xl bg-slate-950 p-5">
                <p className="text-sm text-slate-500">
                  EXPLANATION
                </p>

                <p className="mt-2 whitespace-pre-wrap text-slate-300">
                  {String(task.explanation || "")}
                </p>
              </div>

              {task.status === "DISPUTED" && (
                <button
                  onClick={settleDispute}
                  disabled={loading}
                  className="mt-6 rounded-xl bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-200 disabled:opacity-50"
                >
                  Settle 50/50 Dispute
                </button>
              )}
            </section>
          )}

        {/* Flow */}

        <section className="mt-12 border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold">
            How AgentEscrow works
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {[
              ["01", "Create", "Lock GEN"],
              ["02", "Accept", "Agent accepts"],
              ["03", "Submit", "Result submitted"],
              ["04", "Evaluate", "GenLayer verifies"],
              ["05", "Settle", "Payment released"],
            ].map(
              ([number, name, description]) => (
                <div
                  key={number}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <p className="text-sm font-bold text-cyan-400">
                    {number}
                  </p>

                  <h3 className="mt-2 font-bold">
                    {name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {description}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-500">
          AgentEscrow · Built on GenLayer Studionet · Chain
          61999
        </footer>
      </div>
    </main>
  );
}