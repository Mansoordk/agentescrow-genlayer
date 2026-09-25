# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class AgentEscrow(gl.Contract):
    creators: DynArray[Address]
    agents: DynArray[Address]
    task_titles: DynArray[str]
    requirements: DynArray[str]
    result_urls: DynArray[str]
    amounts: DynArray[u256]
    statuses: DynArray[str]
    scores: DynArray[u32]
    verdicts: DynArray[str]
    explanations: DynArray[str]

    def __init__(self):
        pass

    # =========================================================
    # CREATE TASK
    # =========================================================

    @gl.public.write.payable
    def create_task(
        self,
        title: str,
        requirements: str,
    ) -> u32:
        amount = gl.message.value

        if amount == u256(0):
            raise gl.vm.UserError(
                "Task must contain GEN"
            )

        if title == "":
            raise gl.vm.UserError(
                "Task title is required"
            )

        if requirements == "":
            raise gl.vm.UserError(
                "Task requirements are required"
            )

        task_id = u32(
            len(self.task_titles)
        )

        self.creators.append(
            gl.message.sender_address
        )

        self.agents.append(
            Address(
                "0x0000000000000000000000000000000000000000"
            )
        )

        self.task_titles.append(title)
        self.requirements.append(requirements)
        self.result_urls.append("")
        self.amounts.append(amount)
        self.statuses.append("OPEN")
        self.scores.append(u32(0))
        self.verdicts.append("")
        self.explanations.append("")

        return task_id

    # =========================================================
    # ACCEPT TASK
    # =========================================================

    @gl.public.write
    def accept_task(
        self,
        task_id: u32,
    ) -> None:
        if task_id >= u32(
            len(self.task_titles)
        ):
            raise gl.vm.UserError(
                "Task does not exist"
            )

        if self.statuses[task_id] != "OPEN":
            raise gl.vm.UserError(
                "Task is not open"
            )

        if (
            gl.message.sender_address
            == self.creators[task_id]
        ):
            raise gl.vm.UserError(
                "Creator cannot accept own task"
            )

        self.agents[task_id] = (
            gl.message.sender_address
        )

        self.statuses[task_id] = "ACCEPTED"

    # =========================================================
    # SUBMIT RESULT
    # =========================================================

    @gl.public.write
    def submit_result(
        self,
        task_id: u32,
        result_url: str,
    ) -> None:
        if task_id >= u32(
            len(self.task_titles)
        ):
            raise gl.vm.UserError(
                "Task does not exist"
            )

        if self.statuses[task_id] != "ACCEPTED":
            raise gl.vm.UserError(
                "Task is not accepted"
            )

        if (
            gl.message.sender_address
            != self.agents[task_id]
        ):
            raise gl.vm.UserError(
                "Only the assigned agent can submit"
            )

        if result_url == "":
            raise gl.vm.UserError(
                "Result URL is required"
            )

        self.result_urls[task_id] = result_url
        self.statuses[task_id] = "SUBMITTED"

    # =========================================================
    # AI EVALUATION
    # =========================================================

    @gl.public.write
    def evaluate_task(
        self,
        task_id: u32,
    ) -> None:
        if task_id >= u32(
            len(self.task_titles)
        ):
            raise gl.vm.UserError(
                "Task does not exist"
            )

        if self.statuses[task_id] != "SUBMITTED":
            raise gl.vm.UserError(
                "Task is not submitted"
            )

        requirements = self.requirements[task_id]
        result_url = self.result_urls[task_id]

        def leader_fn():
            web_data = gl.nondet.web.get(
                result_url
            )

            submitted_content = (
                web_data.body.decode("utf-8")
            )

            prompt = f"""
You are the evaluator for an AI-agent escrow platform.

Evaluate whether the submitted work satisfies
the task requirements.

TASK REQUIREMENTS:
{requirements}

SUBMITTED RESULT URL:
{result_url}

SUBMITTED RESULT:
{submitted_content}

SCORING:

70-100 = PASS
40-69 = PARTIAL
0-39 = FAIL

The verdict MUST match the score:

PASS = score >= 70
PARTIAL = score >= 40 and score < 70
FAIL = score < 40

Return ONLY valid JSON with exactly these fields:

{{
    "score": 0,
    "verdict": "FAIL",
    "explanation": "brief explanation"
}}

Rules:
- score must be an integer from 0 to 100
- verdict must be exactly PASS, PARTIAL, or FAIL
- explanation must be a short explanation
- do not include markdown
- do not include additional fields
"""

            return gl.nondet.exec_prompt(
                prompt,
                response_format="json",
            )

        def validator_fn(leader_result):
            if not isinstance(
                leader_result,
                gl.vm.Return
            ):
                return False

            leader_data = (
                leader_result.calldata
            )

            if not isinstance(
                leader_data,
                dict
            ):
                return False

            leader_score = (
                leader_data.get("score")
            )

            leader_verdict = (
                leader_data.get("verdict")
            )

            leader_explanation = (
                leader_data.get("explanation")
            )

            if not isinstance(
                leader_score,
                int
            ):
                return False

            if (
                leader_score < 0
                or leader_score > 100
            ):
                return False

            if leader_verdict not in (
                "PASS",
                "PARTIAL",
                "FAIL",
            ):
                return False

            if not isinstance(
                leader_explanation,
                str
            ):
                return False

            # Make sure the leader's verdict
            # matches its score.

            if (
                leader_score >= 70
                and leader_verdict != "PASS"
            ):
                return False

            if (
                leader_score >= 40
                and leader_score < 70
                and leader_verdict != "PARTIAL"
            ):
                return False

            if (
                leader_score < 40
                and leader_verdict != "FAIL"
            ):
                return False

            # Validator independently evaluates
            # the same submitted result.

            validator_data = leader_fn()

            if not isinstance(
                validator_data,
                dict
            ):
                return False

            validator_score = (
                validator_data.get("score")
            )

            validator_verdict = (
                validator_data.get("verdict")
            )

            if not isinstance(
                validator_score,
                int
            ):
                return False

            if (
                validator_score < 0
                or validator_score > 100
            ):
                return False

            if validator_verdict not in (
                "PASS",
                "PARTIAL",
                "FAIL",
            ):
                return False

            # Make sure validator's verdict
            # matches validator's score.

            if (
                validator_score >= 70
                and validator_verdict != "PASS"
            ):
                return False

            if (
                validator_score >= 40
                and validator_score < 70
                and validator_verdict != "PARTIAL"
            ):
                return False

            if (
                validator_score < 40
                and validator_verdict != "FAIL"
            ):
                return False

            # Leader and validator must agree
            # on the final verdict.

            if (
                leader_verdict
                != validator_verdict
            ):
                return False

            # Allow some variation in numerical
            # scoring between different LLMs.

            if abs(
                leader_score - validator_score
            ) > 15:
                return False

            return True

        result = gl.vm.run_nondet_unsafe(
            leader_fn,
            validator_fn,
        )

        # =====================================================
        # STORE CONSENSUS RESULT
        # =====================================================

        final_score = result["score"]
        final_verdict = result["verdict"]
        final_explanation = result.get(
            "explanation",
            ""
        )

        self.scores[task_id] = u32(
            final_score
        )

        self.verdicts[task_id] = (
            final_verdict
        )

        self.explanations[task_id] = (
            final_explanation
        )

        amount = self.amounts[task_id]

        # =====================================================
        # PASS -> PAY AGENT
        # =====================================================

        if final_verdict == "PASS":
            self.statuses[task_id] = "PAID"

            agent = self.agents[task_id]

            _Recipient(agent).emit_transfer(
                value=amount
            )

        # =====================================================
        # FAIL -> REFUND CREATOR
        # =====================================================

        elif final_verdict == "FAIL":
            self.statuses[task_id] = "REFUNDED"

            creator = self.creators[task_id]

            _Recipient(creator).emit_transfer(
                value=amount
            )

        # =====================================================
        # PARTIAL -> DISPUTE
        # =====================================================

        else:
            self.statuses[task_id] = "DISPUTED"

    # =========================================================
    # SETTLE DISPUTE
    # =========================================================

    @gl.public.write
    def settle_dispute(
        self,
        task_id: u32,
    ) -> None:
        if task_id >= u32(
            len(self.task_titles)
        ):
            raise gl.vm.UserError(
                "Task does not exist"
            )

        if self.statuses[task_id] != "DISPUTED":
            raise gl.vm.UserError(
                "Task is not disputed"
            )

        amount = self.amounts[task_id]

        half = amount // u256(2)

        creator = self.creators[task_id]
        agent = self.agents[task_id]

        self.statuses[task_id] = (
            "DISPUTE_SETTLED"
        )

        _Recipient(agent).emit_transfer(
            value=half
        )

        _Recipient(creator).emit_transfer(
            value=amount - half
        )

    # =========================================================
    # GET TASK
    # =========================================================

    @gl.public.view
    def get_task(
        self,
        task_id: u32,
    ) -> dict:
        if task_id >= u32(
            len(self.task_titles)
        ):
            raise gl.vm.UserError(
                "Task does not exist"
            )

        return {
            "id": task_id,
            "creator": self.creators[task_id],
            "agent": self.agents[task_id],
            "title": self.task_titles[task_id],
            "requirements": self.requirements[task_id],
            "result_url": self.result_urls[task_id],
            "amount": self.amounts[task_id],
            "status": self.statuses[task_id],
            "score": self.scores[task_id],
            "verdict": self.verdicts[task_id],
            "explanation": self.explanations[task_id],
        }

    # =========================================================
    # GET TASK COUNT
    # =========================================================

    @gl.public.view
    def get_task_count(self) -> u32:
        return u32(
            len(self.task_titles)
        )