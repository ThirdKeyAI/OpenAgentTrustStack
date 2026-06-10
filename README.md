# Open Agent Trust Stack (OATS)

## A System Specification for Zero-Trust AI Agent Execution

**Version:** 1.3.0  
**Status:** Release  
**Authors:** Jascha Wanger / ThirdKey AI  
**Date:** May 2026  
**License:** CC BY 4.0  
**DOI:** [10.5281/zenodo.20298543](https://doi.org/10.5281/zenodo.20298543)

> **📖 Read the full specification:** **[openagenttruststack.org](https://openagenttruststack.org)**  
> **PDF:** [oats_v1.3.0.pdf](https://zenodo.org/records/20298543/files/oats_v1.3.0.pdf?download=1)
>
> This README is a summary. The website is the canonical, always-current version of
> the specification — including the full normative text, figures, and changelog.

---

## Abstract

As AI systems evolve from assistants into autonomous agents executing consequential actions, the security boundary shifts from model outputs to tool execution. Traditional security paradigms -- log aggregation, perimeter defense, post-hoc forensics, and runtime interception of fully-formed actions -- cannot adequately protect systems where AI-driven actions are irreversible, execute at machine speed, and originate from potentially compromised orchestration layers.

This paper introduces the Open Agent Trust Stack (OATS), an open specification for zero-trust AI agent execution. OATS is built on three architectural convictions. First, **allow-list enforcement**: rather than intercepting arbitrary actions and deciding which to block, OATS constrains what actions can be expressed through declarative tool contracts, making dangerous actions structurally inexpressible. Second, **compile-time enforcement**: the Observe-Reason-Gate-Act (ORGA) reasoning loop uses typestate programming so that skipping the policy gate is a type error, not a runtime bug. Third, **structural independence**: the Gate phase is architecturally isolated from LLM influence.

OATS specifies five layers: (1) the ORGA reasoning loop with compile-time phase enforcement, (2) declarative tool contracts with typed parameter validation, (3) a cryptographic identity stack providing bidirectional trust between agents and tools, (4) a formally verifiable policy engine operating on structured inputs, and (5) hash-chained cryptographic audit journals with Ed25519 signatures for tamper-evident forensic reconstruction.

OATS is model-agnostic, framework-agnostic, and vendor-neutral. The architecture is informed by operational experience with a production runtime (Symbiont) that has operated autonomously for approximately nine months. Initial empirical results validating five of seven core conformance requirements are now available through three companion preprints and the `symbiont-orga-demo` reference corpus; results are summarized in §14.7 of the full specification. The specification continues to stand independently of any single implementation, and remaining empirical work is identified as future deliverables.

---

## The Three Convictions

OATS's core thesis: **define what is permitted and make everything else structurally inexpressible, rather than trying to enumerate and block what is dangerous.**

1. **Allow-list enforcement** — constrain what actions can be *expressed* through declarative tool contracts, instead of intercepting arbitrary actions and deciding which to block.
2. **Compile-time enforcement** — the ORGA loop uses typestate programming so that skipping the policy Gate is a *type error*, not a runtime bug.
3. **Structural independence** — the Gate is architecturally isolated from LLM influence; it operates on structured inputs only and never processes natural language.

## The Five Layers

| Layer | Name | Security question it answers |
|-------|------|------------------------------|
| 1 | **ORGA Reasoning Loop** | Did the policy Gate actually run before the action? (compile-time enforced) |
| 2 | **Tool Contract Layer** | Is this action even expressible? (typed, allow-listed parameters) |
| 3 | **Identity Layer** | Are the agent and the tool who they claim to be? (bidirectional trust) |
| 4 | **Policy Enforcement Layer** | Is this action authorized, given accumulated session context? |
| 5 | **Audit Layer** | What was decided, and can it be proven after the fact? (hash-chained, Ed25519-signed) |

---

## Conformance

OATS defines two conformance levels (RFC 2119 language):

- **OATS Core** — all MUST requirements (**C1–C7**): baseline zero-trust agent execution.
- **OATS Extended** — all MUST and SHOULD requirements (**C1–C7 + E1–E9**).

**Core requirements (MUST):**

- **C1: ORGA Loop Enforcement** — implement the four-phase ORGA loop; the Gate MUST execute before every tool dispatch, enforced at compile time via typestates where the language allows.
- **C2: Tool Contract Support** — declarative tool contracts with typed parameter validation; the LLM MUST NOT generate raw tool invocations.
- **C3: Policy Evaluation** — evaluate actions against policy before execution, outside LLM influence; support Allow, Deny, Modify, Step-Up, and Defer; default MUST be deny.
- **C4: Context Accumulation** — accumulate session context across actions.
- **C5: Cryptographic Audit Journal** — maintain a hash-chained, offline-verifiable journal of loop events.
- **C6: Gate Independence** — the Gate MUST operate on structured inputs only and share no mutable state with the LLM.
- **C7: Evidence Envelopes** — tool executions MUST produce structured evidence.

**Extended requirements (SHOULD):** E1 Tool Integrity Verification · E2 Agent Identity Verification · E3 Semantic Distance Tracking · E4 Multi-Tier Sandboxing · E5 Inter-Agent Communication Governance · E6 Telemetry Export · E7 Formally Verifiable Policies · E8 Least-Privilege Credential Scoping · **E9 Content Sanitization** *(new in v1.3.0)*.

---

## What's New in v1.3.0

The five-layer architecture, the three convictions, the ORGA loop construction, and the core conformance requirements C1–C7 are unchanged from earlier releases. Highlights of this revision:

- **§6.6 Content Sanitization** *(new)* — SHOULD-level requirement for stripping invisible Unicode and applying NFKC normalization on agent-influenced string fields.
- **§7.5 Cryptographic Agility and Algorithm Allowlisting** *(new)* — runtime verifiers SHOULD refuse algorithm classes outside their declared allowlist.
- **§8.1** clarified — the runtime's default *construction* MUST be fail-closed when no policy is wired.
- **§9.6 Redaction of Sensitive Parameters** *(new)* — journal writers SHOULD substitute redaction sentinels for parameters declared sensitive.
- **§11.5 Distributed Trace Context** *(new)* — W3C `traceparent` recommended for cross-runtime tracing.
- **E9: Content Sanitization** added as an extended conformance requirement.
- **§14.7 Initial Empirical Results** — substrate-comparison sweep, the regex-ceiling / GPT-5 outlier characterization, and the Symbiont v1.14.0 reference-implementation audit response.
- **§15 / §16** — new limitation on the content-shape ceiling against frontier models, and research directions (§16.7 structural defenses, §16.8 multi-implementation conformance).

See the full, versioned changelog at **[openagenttruststack.org](https://openagenttruststack.org)**.

---

## Citation

```bibtex
@techreport{wanger2026oats,
  title       = {Open Agent Trust Stack (OATS): A System Specification for Zero-Trust AI Agent Execution},
  author      = {Wanger, Jascha},
  institution = {ThirdKey AI},
  year        = {2026},
  version     = {1.3.0},
  doi         = {10.5281/zenodo.20298543},
  url         = {https://openagenttruststack.org}
}
```

---

*Open Agent Trust Stack (OATS): Zero-trust agent execution through structural enforcement.*  

**ThirdKey AI** -- thirdkey.ai  
**Symbiont Runtime** -- symbiont.dev  
**SchemaPin** -- schemapin.org  
**AgentPin** -- agentpin.org  
**ToolClad** -- toolclad.org
