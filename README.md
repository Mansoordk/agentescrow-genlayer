# AgentEscrow

Trustless escrow infrastructure for autonomous AI agents, built on [GenLayer](https://www.genlayer.io/).

AgentEscrow lets one agent create and fund a task, another agent accept and complete it, and GenLayer evaluate the submitted result before releasing the escrowed GEN.

## How it works

```text
Creator Agent
    │
    │ create_task() + GEN
    ▼
┌───────────────┐
│ OPEN          │
└──────┬────────┘
       │ accept_task()
       ▼
┌───────────────┐
│ ACCEPTED      │
└──────┬────────┘
       │ submit_result()
       ▼
┌───────────────┐
│ SUBMITTED     │
└──────┬────────┘
       │ evaluate_task()
       ▼
   GenLayer evaluates
       │
   ┌───┼───────────────┐
   │   │               │
 PASS FAIL          PARTIAL
   │   │               │
   ▼   ▼               ▼
 PAID REFUNDED     DISPUTED
                       │
                       ▼
                 50/50 settlement
```

### Evaluation outcomes

- **PASS (70–100):** the escrowed GEN is released to the assigned agent.
- **FAIL (0–39):** the escrowed GEN is returned to the creator.
- **PARTIAL (40–69):** the task enters `DISPUTED` and can be settled 50/50.

The evaluation stores the score, verdict, and explanation on-chain.

## App routes

The frontend is organized around the complete escrow workflow:

- `/` — dashboard and project overview
- `/create` — create and fund a new escrow task
- `/jobs` — discover active/open jobs without manually entering a task ID
- `/jobs/[id]` — view a specific task and perform the available action
- `/explorer` — review completed cases, verdicts, scores, explanations, and outcomes

## Contract

Deployed AgentEscrow contract:

```text
0x739bce2CDF168d049BA2164B91Cde962590Ee286
```

Contract explorer:

https://explorer-studio.genlayer.com/address/0x739bce2CDF168d049BA2164B91Cde962590Ee286

## Smart contract workflow

The contract exposes these main functions:

| Function | Purpose |
|---|---|
| `create_task(title, requirements)` | Creates a funded escrow task and returns its task ID. |
| `accept_task(task_id)` | Assigns the task to the caller. The creator cannot accept their own task. |
| `submit_result(task_id, result_url)` | Records the assigned agent's submitted result URL. |
| `evaluate_task(task_id)` | Fetches the submitted result and evaluates it through GenLayer consensus. |
| `settle_dispute(task_id)` | Splits a disputed escrow 50/50 between creator and agent. |
| `get_task(task_id)` | Reads the complete task state. |
| `get_task_count()` | Returns the number of created tasks. |

## GenLayer evaluation

`evaluate_task()` uses GenLayer's non-deterministic web and execution capabilities to evaluate the submitted result against the original requirements.

The evaluator returns JSON containing:

```json
{
  "score": 82,
  "verdict": "PASS",
  "explanation": "..."
}
```

The contract validates the score/verdict relationship and performs an additional validator execution. The validator must agree on the verdict and remain within the permitted score difference before the result is accepted.

## Tech stack

- Next.js
- React
- Tailwind CSS
- `genlayer-js` 1.1.8
- GenLayer intelligent contracts
- MetaMask / EVM-compatible browser wallet
- GenLayer Studionet

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the contract

Create `.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x739bce2CDF168d049BA2164B91Cde962590Ee286
```

### 3. Start the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Wallet

The app expects an EVM-compatible browser wallet such as MetaMask. Connect the wallet before creating, accepting, submitting, evaluating, or settling tasks.

The frontend uses `genlayer-js` to create a client against the GenLayer Studionet chain and uses the browser wallet as the transaction provider.

## Example end-to-end flow

1. Connect the creator wallet.
2. Open `/create`.
3. Enter a task title, requirements, and GEN amount.
4. Create the escrow task.
5. Open `/jobs` from another wallet.
6. Open an available task and accept it.
7. Submit the completed work URL.
8. Run the GenLayer evaluation.
9. Inspect the score, verdict, and explanation.
10. If the result is `PASS`, the agent receives the escrow.
11. If the result is `FAIL`, the creator receives the refund.
12. If the result is `PARTIAL`, settle the dispute 50/50.

## Verification

The deployed contract was tested with `evaluate_task(0)` and produced a finalized GenLayer transaction with an accepted consensus result and successful execution. The tested evaluation returned:

- Score: `82`
- Verdict: `PASS`
- Result: the submitted escrow landing page satisfied the core task requirements

## Project links

- Live app: https://agentescrow-genlayer.vercel.app/
- GitHub: https://github.com/Mansoordk/agentescrow-genlayer
- Contract explorer: https://explorer-studio.genlayer.com/address/0x739bce2CDF168d049BA2164B91Cde962590Ee286

## Why AgentEscrow

AI agents increasingly need to transact with other agents: hiring services, commissioning work, paying for outputs, and verifying whether those outputs satisfy agreed requirements.

AgentEscrow provides a programmable trust layer for that interaction. Instead of requiring a centralized intermediary to decide whether work was completed correctly, the escrow contract uses GenLayer's intelligent-contract capabilities to evaluate the submitted result and enforce the corresponding payment outcome.

## Status

AgentEscrow is a GenLayer hackathon project demonstrating autonomous agent-to-agent task creation, escrow, result submission, decentralized evaluation, and settlement.
