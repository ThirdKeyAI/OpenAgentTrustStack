# Open Agent Trust Stack (OATS)

## A System Specification for Zero-Trust AI Agent Execution

**Version:** 1.0.0  
**Status:** Release  
**Authors:** Jascha Wanger / ThirdKey AI  
**Date:** 2026-04-08  
**License:** Apache 2.0  

**PDF:** [OATS-v1.0.0.pdf](./OATS-v1.0.0.pdf)  

---

## Abstract

As AI systems evolve from assistants into autonomous agents executing consequential actions, the security boundary shifts from model outputs to tool execution. Traditional security paradigms -- log aggregation, perimeter defense, post-hoc forensics, and even runtime interception of fully-formed actions -- cannot adequately protect systems where AI-driven actions are irreversible, execute at machine speed, and originate from potentially compromised orchestration layers. The fundamental problem is architectural: when the policy gate can be influenced by the LLM it governs, when enforcement correctness is verified only at runtime, and when identity is self-asserted rather than cryptographically verified, security guarantees degrade under adversarial pressure.

This paper introduces the Open Agent Trust Stack (OATS), an open specification for zero-trust AI agent execution built on three architectural convictions. First, allow-list enforcement: rather than intercepting arbitrary actions and deciding which to block (a deny-list that is incomplete by definition), OATS constrains what actions can be expressed through declarative tool contracts, making dangerous actions structurally inexpressible. Second, compile-time enforcement: the Observe-Reason-Gate-Act (ORGA) reasoning loop uses typestate programming so that skipping the policy gate is a type error, not a runtime bug. Third, structural independence: the Gate phase operates outside LLM influence by construction, not by trust assumption.

OATS specifies five layers: (1) the ORGA reasoning loop with compile-time phase enforcement, (2) declarative tool contracts with typed parameter validation, (3) a cryptographic identity stack providing bidirectional trust between agents and tools, (4) a formally verifiable policy engine operating on structured inputs, and (5) hash-chained cryptographic audit journals with Ed25519 signatures for tamper-evident forensic reconstruction.

OATS is model-agnostic, framework-agnostic, and vendor-neutral. It defines what a compliant agent runtime must enforce, not how it must be implemented. The architecture specified here has been validated through approximately eight months of autonomous operation in a production runtime, moving beyond theoretical frameworks to specify requirements derived from operational experience.

**Specification available at:** thirdkey.ai/oats

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Related Work](#2-related-work)
3. [Problem Formalization](#3-problem-formalization)
4. [Threat Model](#4-threat-model)
5. [Core Architecture: The ORGA Loop](#5-core-architecture-the-orga-loop)
6. [Tool Contract Layer](#6-tool-contract-layer)
7. [Identity Layer](#7-identity-layer)
8. [Policy Enforcement Layer](#8-policy-enforcement-layer)
9. [Audit Layer](#9-audit-layer)
10. [Sandboxing and Isolation](#10-sandboxing-and-isolation)
11. [Inter-Agent Communication](#11-inter-agent-communication)
12. [Conformance Requirements](#12-conformance-requirements)
13. [Implementation Architectures](#13-implementation-architectures)
14. [Research Directions](#14-research-directions)
15. [Conclusion](#15-conclusion)

---

## 1. Introduction

### 1.1 The Problem

AI agents now execute consequential actions across enterprise systems: querying databases, sending communications, modifying files, invoking cloud services, and managing credentials. These actions are irreversible, execute at machine speed, originate from potentially compromised orchestration layers, and compose into violation patterns invisible when evaluated in isolation.

The security community has correctly identified the action layer as the stable enforcement boundary. Regardless of how agent frameworks, model architectures, or orchestration patterns evolve, actions on tools and APIs remain the point where AI decisions materialize as real-world effects. Security must be enforced at this boundary.

However, identifying the right boundary is necessary but not sufficient. The critical question is *how* enforcement occurs at that boundary, and current approaches have structural weaknesses that undermine their guarantees.

### 1.2 The Allow-List Thesis

Existing runtime security approaches operate on a deny-list model: the agent formulates an action, the security system intercepts it, evaluates it against policy and context, and decides whether to allow or block it. This model has a fundamental problem: it requires enumerating dangerous behavior. Every deny-list is incomplete by definition. Novel attacks, unanticipated compositions, and edge cases slip through because the system only blocks what it has been told to block.

OATS inverts this model. Instead of intercepting arbitrary actions and deciding which to block, an OATS-compliant runtime constrains what actions can be expressed in the first place. The agent fills typed parameters defined by a declarative tool contract. The runtime validates those parameters against the contract, constructs the invocation from a template, and executes it. The agent never generates raw commands, never constructs API calls directly, never formulates unconstrained actions. Dangerous actions cannot be expressed because the interface does not permit them.

This is the allow-list thesis: define what is permitted and make everything else structurally inexpressible, rather than trying to enumerate and block what is dangerous.

### 1.3 Structural Enforcement

A second structural weakness in existing approaches is that enforcement correctness is verified only at runtime. The policy gate is a software component that can be misconfigured, bypassed through bugs, or circumvented through unanticipated code paths. If the gate fails to execute, actions proceed unguarded.

OATS addresses this through compile-time enforcement of the reasoning loop. The Observe-Reason-Gate-Act (ORGA) cycle uses type-level programming (typestates) so that skipping the Gate phase, dispatching tools without reasoning first, or observing results without dispatching are compile-time errors, not runtime bugs. The type system guarantees that every action passes through policy evaluation. This guarantee holds regardless of code changes, refactoring, or integration complexity.

### 1.4 Gate Independence

The third structural weakness is that existing approaches evaluate actions within systems that process untrusted LLM outputs. The policy engine shares context, memory, and execution environment with the orchestration layer it is supposed to govern. An LLM that has been compromised through prompt injection can potentially influence the evaluation of its own actions.

In OATS, the Gate phase operates outside LLM influence. The Gate receives a structured action proposal and evaluates it against policy using a formally verifiable policy engine. The LLM cannot modify, bypass, or influence the Gate's evaluation. Policy denial is fed back to the LLM as an observation, allowing it to adjust its approach, but the denial itself is not negotiable.

### 1.5 Contributions

This specification makes five contributions:

1. **Typestate-enforced reasoning loop.** We specify the ORGA (Observe-Reason-Gate-Act) cycle with compile-time phase enforcement, ensuring that policy evaluation cannot be skipped, circumvented, or reordered.

2. **Allow-list tool contracts.** We specify a declarative tool contract format that constrains agent-tool interaction to typed, validated parameters, making dangerous actions structurally inexpressible.

3. **Layered cryptographic identity.** We specify a bidirectional identity stack: tool integrity verification (ensuring tools have not been tampered with) and agent identity verification (ensuring agents are who they claim to be), providing mutual authentication between agents and tools.

4. **Hash-chained audit journals.** We specify cryptographically signed, hash-chained event journals that provide tamper-evident forensic reconstruction with offline verification.

5. **Conformance requirements.** We define minimum requirements for OATS-compliant systems, enabling objective evaluation of implementations and preventing category dilution.

---

## 2. Related Work

This section positions OATS relative to existing academic research, industry frameworks, and emerging specifications for AI agent security.

### 2.1 Agent Security Research

The security risks of LLM-based agents have been catalogued by several surveys. Ruan et al. provide comprehensive threat taxonomies covering prompt injection, tool misuse, and data exfiltration in agentic systems. Wu et al. focus on security properties of AI agents, while Su et al. address autonomy-induced risks including memory poisoning and deferred decision hazards. Debenedetti et al. introduce AgentDojo for evaluating attacks and defenses against LLM agents, and Ye et al. propose ToolEmu for identifying risky agent failures. These works characterize the problem space and evaluate agent robustness but operate at the model or benchmark level, not at the runtime action boundary where OATS enforces policy. OATS builds on their threat models and contributes an enforcement architecture.

Gaire et al. systematize security and safety risks in the Model Context Protocol ecosystem, providing a taxonomy of threats to MCP primitives. Their analysis of tool poisoning and indirect prompt injection directly informs OATS's threat model for tool supply chain attacks.

### 2.2 Runtime Security Specifications

Errico (2026) introduces Autonomous Action Runtime Management (AARM), a system specification for securing AI-driven actions at runtime. AARM formalizes the runtime security gap, proposes an action classification framework (forbidden, context-dependent deny, context-dependent allow, context-dependent defer), and specifies conformance requirements for pre-execution interception, context accumulation, policy evaluation, and tamper-evident receipts. OATS shares AARM's identification of the action layer as the stable security boundary and incorporates its context-dependent action classification. OATS extends this foundation with compile-time enforcement of the reasoning loop, allow-list tool contracts, concrete cryptographic identity protocols, and multi-tier execution isolation.

### 2.3 Industry Frameworks

Google's Cloud CISO perspective advocates defense-in-depth and runtime controls for agents, aligning with OATS's architectural principles. AWS's Agentic AI Security Scoping Matrix provides a risk assessment framework that complements OATS's runtime enforcement with deployment-time scoping. Microsoft's governance framework addresses organizational controls including identity management and approval workflows. Raza et al. present a TRiSM framework for agentic multi-agent systems, structured around governance, explainability, and privacy. These frameworks provide lifecycle governance perspectives; OATS focuses specifically on the runtime enforcement layer.

### 2.4 Policy Languages and Access Control

OATS's policy enforcement layer builds on established access control research. RBAC and ABAC evaluate permissions against static attributes but lack session-level context accumulation. Capability-based security constrains authority propagation but does not address the compositional risks of non-deterministic agents. Policy languages such as OPA and Cedar provide expressive evaluation engines suitable as backends for OATS's policy evaluation component. AWS's independent choice of Cedar for their AgentCore runtime validates the architectural thesis that formal policy languages belong at the agent execution boundary.

### 2.5 Complementary Standards

OATS is complementary to, not competitive with, several existing standards:

**OWASP Top 10 for LLM Applications.** OWASP catalogs vulnerabilities. OATS provides runtime enforcement that mitigates several categories, particularly tool misuse, excessive agency, and insecure output handling.

**NIST AI RMF.** NIST provides a risk management framework. OATS provides technical enforcement mechanisms that implement portions of the NIST framework, particularly around governance, monitoring, and accountability.

**Model Context Protocol (MCP).** MCP defines a protocol for agent-tool communication. OATS defines how to govern actions flowing through that protocol (or any other tool invocation mechanism). The two are complementary: MCP defines the transport, OATS defines the trust.

---

## 3. Problem Formalization

This section formalizes the system model, action definitions, and security objectives that the remainder of the specification builds upon.

### 3.1 System Model

Let an AI-enabled application `A` consist of:

- An **orchestration layer** `O` (agent framework, workflow engine, or application code) that interprets user requests and invokes tools. `O` includes the LLM, prompt templates, memory systems, and control flow logic. Crucially, `O` processes untrusted inputs and cannot be assumed to behave as intended.
- A set of **tools** `T = {t_1, t_2, ..., t_n}`, where each tool `t_i` exposes operations producing effects on external systems.
- An **identity context** `I` comprising four layers: human principal, service identity, agent/session identity, and role/privilege scope.
- An **environment** `E` including data stores, APIs, cloud services, and enterprise systems.
- A **session context** `C` that accumulates state over the course of an interaction.

### 3.2 Action Definition

An action `a` is a discrete operation the agent requests against a tool:

```
a = (t, op, p, id, ctx, ts)
```

where `t ∈ T` is the target tool, `op` is the specific operation, `p` is the parameter set, `id ∈ I` is the identity context, `ctx ∈ C` is the accumulated session context, and `ts` is the timestamp.

### 3.3 Tool Contract Definition

A tool contract `κ` defines the complete behavioral interface for a tool:

```
κ = (name, Π, τ, σ_out, μ, ρ)
```

where `Π = {π_1, ..., π_m}` is the set of typed parameter definitions, `τ` is the invocation template, `σ_out` is the output schema, `μ` is the policy metadata (resource, action), and `ρ` is the risk tier.

Each parameter definition `π_i = (name_i, type_i, V_i, req_i)` specifies the parameter name, its type from the type system `T`, validation constraints `V_i`, and whether it is required.

The type system `T` provides at minimum:

```
T = {string, integer, boolean, enum, scope_target, url, path, ip_address, cidr, port}
```

Each type `τ ∈ T` has an associated validation function `v_τ : Value → {valid, invalid}` and a sanitization function `s_τ : Value → Value` that strips dangerous characters.

### 3.4 Constrained Action Formulation

Under OATS, the agent does not formulate arbitrary actions. Instead, the agent proposes a *parameterized invocation*:

```
a' = (t, op, p')
```

where `p' = {(name_i, val_i)}` maps parameter names to values. The runtime validates each value:

```
∀(name_i, val_i) ∈ p' :  v_{type_i}(val_i) = valid
```

If validation succeeds, the runtime constructs the executable action from the template:

```
a_exec = τ(p')   where τ is the invocation template
```

The agent never sees or constructs `a_exec`. This is the allow-list property: the space of expressible actions is constrained to `{a_exec : a_exec = τ(p'), ∀(name_i, val_i) ∈ p', v_{type_i}(val_i) = valid}`.

### 3.5 Context Accumulation

Session context accumulates across actions:

```
C_n = C_{n-1} ∪ {a_n, o_n, δ_n}
```

where `C_n` is the context after action `n`, `a_n` is the action, `o_n` is its output, and `δ_n` represents derived signals including data classification, semantic distance from the original request, scope expansion indicators, entity references, and confidence level.

### 3.6 Policy Structure

A policy `π ∈ Π` maps an action-context-identity triple to an authorization decision:

```
π : (a, C, I) → {ALLOW, DENY, MODIFY, STEP_UP, DEFER}
```

Each policy consists of a match predicate `m(a, C, I) → {true, false}`, a decision `d`, a priority `p ∈ ℕ`, and an optional modification function `f(a) → a'` applied when `d = MODIFY`.

### 3.7 Security Objectives

An OATS-compliant runtime MUST ensure that for all actions `a`:

1. **Structural constraint.** `a` is expressible only through a valid tool contract `κ`.
2. **Pre-execution interception.** `a` is intercepted and evaluated before any effects occur.
3. **Compile-time gate guarantee.** All code paths from action proposal to tool dispatch pass through the Gate phase; this is verified at compile time.
4. **Policy compliance.** `a` satisfies organizational policy `Π` given context `C` and identity `I`.
5. **Context-aware evaluation.** `a` is evaluated against both static policy and accumulated session context.
6. **Identity verification.** Both the agent invoking a tool and the tool being invoked are cryptographically verified.
7. **Forensic completeness.** Every action, its context, the policy decision, and the execution outcome are recorded in a tamper-evident journal.

---

## 4. Threat Model

OATS operates on a fundamental assumption: **the AI orchestration layer `O` cannot be trusted as a security boundary.** The model processes untrusted inputs through opaque reasoning, producing actions that may serve attacker goals rather than user intent. This assumption is conservative but necessary given demonstrated attack success rates against state-of-the-art models.

### 4.1 Threats Addressed

OATS addresses the following threat categories. For each, we describe the threat and the OATS-specific mitigation.

**Prompt injection (direct and indirect).** Adversaries embed instructions in user input, documents, tool outputs, or multimedia that override the agent's intended behavior. OATS mitigates this at two layers. At the tool contract layer, injected instructions cannot produce arbitrary tool invocations because the contract does not expose parameters that accept raw commands; shell metacharacters are rejected by default on all string types. At the policy layer, actions are evaluated against accumulated session context regardless of how the agent was instructed, catching injection-triggered actions that violate intent alignment.

**Confused deputy.** A privileged agent is tricked into misusing its authority through ambiguous or deceptive instructions. OATS mitigates this through bidirectional identity verification: before an agent invokes a tool, the tool's integrity is verified cryptographically (ensuring the tool contract has not been tampered with); before a tool accepts an invocation, the agent's identity is verified cryptographically (ensuring the agent is authorized to act). Destructive operations may be classified as forbidden or context-dependent, and step-up authorization breaks the autonomous execution chain.

**Action composition / data exfiltration.** Individual actions may each satisfy policy while their composition constitutes a breach. OATS tracks data classification across actions within a session through context accumulation. When sensitive data is accessed, subsequent external communications are evaluated against this context. Tool contracts can additionally declare allowed destinations and data classification constraints, providing defense-in-depth before the action reaches the policy engine.

**Intent drift.** The agent's actions gradually diverge from the user's original request through its own reasoning process, without adversarial manipulation. OATS tracks the chain of intent from original request through each action via context accumulation and semantic distance measurement. When cumulative drift exceeds configured thresholds, the Gate triggers deferral, step-up authorization, or denial.

**Malicious tool outputs.** Compromised or adversarial tools return outputs designed to manipulate subsequent agent behavior. OATS tracks tool outputs as part of session state and restricts what actions are permissible after specific tool calls. The context-dependent deny classification blocks actions that appear legitimate in isolation but are inconsistent with the session's chain of intent.

**Over-privileged credentials.** Agents are provisioned with credentials exceeding operational requirements. OATS supports least-privilege enforcement through just-in-time credential issuance and operation-specific token scoping, and detects scope expansion through context accumulation.

**Goal hijacking and memory poisoning.** Adversaries alter the agent's objectives or corrupt persistent memory. OATS operates at the action level: regardless of what objective the agent believes it is pursuing, each action must satisfy policy and align with accumulated context. Audit journals with provenance information enable detection of behavioral drift across sessions.

### 4.2 Attack Lifecycle

Attacks against AI agents typically follow a four-stage lifecycle: (1) **injection** — attacker embeds malicious instructions in content the agent processes; (2) **hijacking** — the agent interprets malicious content as legitimate instructions; (3) **execution** — the agent invokes tools with attacker-controlled parameters; (4) **impact** — actions produce irreversible effects. OATS intervenes at two points: between stages 2 and 3 (the Gate blocks actions that violate policy), and before stage 3 begins (tool contracts constrain what parameters the agent can express).

Intent drift follows a different lifecycle without explicit injection. The agent's reasoning gradually diverges through plausible-seeming steps. OATS detects this through context accumulation and semantic distance tracking regardless of cause.

### 4.3 Tool Supply Chain Attacks

OATS addresses a threat category critical to the emerging agent ecosystem: tool supply chain attacks. When agents use tools provided by third parties (MCP servers, API integrations, plugin ecosystems), those tools may be tampered with, impersonated, or silently modified after initial deployment. Tool contracts may be altered to widen parameter validation, change command templates, or modify output schemas.

OATS mitigates tool supply chain attacks through cryptographic tool integrity verification. Tool contracts are signed by their publishers. The runtime verifies signatures before registering tools, rejecting any contract that fails verification. Signatures cover the entire behavioral contract (parameter definitions, validation rules, command templates, output schemas, scope constraints), so any tampering is detected.

### 4.4 Trust Assumptions

OATS's security guarantees depend on explicit trust assumptions:

**Trusted:**
- The OATS runtime (ORGA loop, policy engine, tool contract executor, journal, identity verifier)
- Cryptographic primitives and key management infrastructure
- The policy store and policy authoring process
- The underlying infrastructure (OS, network, hardware)
- The compiler and type system (for compile-time enforcement guarantees)

**Untrusted:**
- The AI model and its outputs
- The orchestration layer (agent framework, workflow logic)
- User inputs and prompts
- Tool outputs and retrieved data
- External documents, emails, web content, and multi-modal inputs
- Agent memory and conversation history
- Tool contracts from unverified publishers (until signature verification succeeds)

**Partially trusted:**
- Tool implementations (OATS constrains invocation but cannot prevent bugs within tools)
- Human approvers (OATS routes step-up authorization but cannot prevent social engineering)
- Verified tool contracts (verified as untampered, but the tool itself may have vulnerabilities)

### 4.5 Out of Scope

OATS addresses runtime action security. The following threats require complementary controls: model training data poisoning or weight manipulation (pre-deployment ML security); denial of service against the OATS runtime (infrastructure availability); physical or infrastructure-level attacks (physical security); social engineering of human approvers (security awareness training); code-level vulnerabilities within tool implementations (application security testing); memory storage security (separate storage controls). OATS is one layer in a defense-in-depth strategy.

---

## 5. Core Architecture: The ORGA Loop

The ORGA (Observe-Reason-Gate-Act) loop is the core execution engine for OATS-compliant agent runtimes. It drives a multi-turn cycle between an LLM, a policy gate, and external tools through four mandatory phases.

### 5.1 Phase Definitions

**Observe.** Collect results from previous tool executions. Incorporate tool outputs, error messages, policy denial feedback, and environmental signals into the agent's context. This phase also integrates knowledge retrieval (RAG-enhanced context from vector-backed storage) when available.

**Reason.** The LLM processes accumulated context and produces proposed actions (tool calls or text responses). The LLM sees tool definitions (derived from tool contracts) but never sees raw invocation details (command strings, API endpoints, connection parameters). The LLM's output is a structured proposal, not an executable action.

**Gate.** The policy engine evaluates each proposed action. This phase operates entirely outside LLM influence. The Gate receives the proposed action, the accumulated session context, and the agent's identity, and evaluates them against organizational policy. The Gate produces one of five decisions: Allow, Deny, Modify, Step-Up (pause for human approval), or Defer (temporarily suspend pending additional context). Denial reasons are recorded in the audit journal and fed back to the LLM as observations in the next Observe phase.

**Act.** Approved actions are dispatched to tool executors. The tool contract executor validates parameters against the contract's type system, constructs the invocation from the contract's template, executes with timeout enforcement, captures output in a structured evidence envelope, and records the execution in the audit journal.

### 5.2 Typestate Enforcement

Phase transitions MUST be enforced at compile time using type-level programming (typestates). Each phase is a distinct type. The loop state machine can only call methods appropriate to its current phase. The transition from Reason to Act without passing through Gate MUST be a type error, not a runtime check.

Concretely, in a Rust implementation:

```
AgentLoop<Reasoning>  -- produce_output() -->  AgentLoop<PolicyCheck>
AgentLoop<PolicyCheck> -- check_policy()  -->  AgentLoop<ToolDispatching>
AgentLoop<ToolDispatching> -- dispatch()  -->  AgentLoop<Observing>
AgentLoop<Observing>  -- observe()        -->  AgentLoop<Reasoning> | LoopResult
```

The following are compile-time errors:
- Skipping the policy check (Reasoning to ToolDispatching)
- Dispatching tools without reasoning (PolicyCheck to Observing)
- Observing results without dispatching (Reasoning to Observing)

Implementations in languages without native typestate support (Python, JavaScript, TypeScript) MUST provide equivalent guarantees through runtime enforcement with 100% path coverage testing and formal verification that all tool dispatch paths pass through the Gate. Implementations SHOULD document which guarantee mechanism is used and its limitations.

### 5.3 Dynamic Branching

The only point where the ORGA loop branches dynamically is after the Observe phase: the loop either continues (returning to Reason for another iteration) or completes (producing a final result). This branching is a standard pattern match on a concrete type, not dynamic dispatch. All other phase transitions are strictly linear.

### 5.4 Loop Termination

The loop terminates when:
- The LLM produces a final text response (no tool calls proposed)
- Iteration limits are reached (configurable per deployment)
- Token budget is exhausted
- Time budget is exhausted
- A circuit breaker trips (configurable failure thresholds on tool calls)

On termination, the journal records the termination reason, total iterations, token usage, and wall-clock duration.

### 5.5 Policy Denial Feedback

When the Gate denies an action, the denial reason MUST be fed back to the LLM as an observation in the next Observe phase. This allows the LLM to adjust its approach without compromising the denial. The LLM may propose alternative actions that satisfy policy, but the Gate evaluates each proposal independently. The denial is not negotiable; only the LLM's subsequent proposals can change.

---

## 6. Tool Contract Layer

### 6.1 The Allow-List Principle

An OATS-compliant runtime MUST support declarative tool contracts that define the complete behavioral contract for each tool. The contract specifies what the tool accepts (typed parameters with validation), how it is invoked (templates or structured calls), and what it produces (output schemas).

The security model inverts the sandbox approach:

- **Sandbox (deny-list):** LLM generates an arbitrary action. The security system intercepts it, evaluates it, and decides whether to allow or block it.
- **Tool contract (allow-list):** LLM fills typed parameters constrained by the contract. The executor validates parameters, constructs the invocation from a template, and executes. The LLM never generates or sees the raw invocation.

The dangerous action cannot be expressed because the interface does not permit it.

### 6.2 Contract Requirements

A tool contract MUST define:

1. **Typed parameters.** Each parameter has a declared type with validation constraints. The type system MUST include at minimum: string (with injection sanitization, optional regex pattern), integer (with optional min/max), boolean, enum (value from declared allow-list), and a target type for scope-checked values (hostnames, IPs, CIDRs, URLs). All string-based types MUST reject shell metacharacters (`;|&$\`(){}[]<>!`) by default.

2. **Invocation mechanism.** The contract declares how the tool is invoked: command template, HTTP request template, protocol server address, or interactive session definition. The LLM never constructs invocation details directly.

3. **Output schema.** The contract declares the expected structure of tool output. The executor validates parsed output against this schema before returning results to the agent. Malformed results are rejected before they enter the agent's context.

4. **Policy metadata.** The contract declares the policy resource and action for the tool, enabling the policy engine to evaluate authorization without parsing tool-specific details.

5. **Risk tier.** The contract declares a risk classification (e.g., low, medium, high, critical) that informs default policy generation and step-up authorization thresholds.

### 6.3 Execution Modes

An OATS-compliant tool contract format SHOULD support multiple execution modes sharing a common governance layer:

- **Oneshot:** Execute a single invocation and return results. Backends may include shell commands, HTTP requests, or protocol server calls.
- **Session:** Maintain a running process where each interaction is independently validated and policy-gated. For interactive tools (database consoles, security tools, REPLs).
- **Browser:** Maintain a governed browser session where navigation, form submission, and script execution are typed, scoped, and policy-gated.

All modes share the same typed parameter validation, policy gating, and evidence capture.

### 6.4 Contract Integrity

Tool contracts MUST support cryptographic integrity verification. When a contract is loaded, the runtime SHOULD verify its signature against the publisher's public key. A contract that fails verification MUST be rejected and the tool MUST NOT be registered.

The signature MUST cover the entire contract (parameters, validation rules, invocation templates, output schemas, scope constraints). Partial signatures that cover only the parameter schema are insufficient because the invocation template and scope constraints are security-critical.

### 6.5 MCP Schema Generation

Tool contracts SHOULD support automatic generation of protocol-compatible schemas (e.g., MCP `inputSchema` and `outputSchema`) from the contract definition. This enables the LLM to understand tool capabilities without the contract format being exposed to the LLM.

---

## 7. Identity Layer

### 7.1 The Identity Problem

When AI agents interact with tools, services, and other agents, identity is typically self-asserted. An agent claims to be "Scout v2 from Tarnover LLC" with no way for the receiving party to verify that claim. A tool claims to offer a specific interface with no way for the agent to verify it has not been tampered with. Self-asserted identity provides no security guarantee: agents can be impersonated, tools can be spoofed, and delegation claims cannot be verified.

OATS specifies a two-layer cryptographic identity stack that addresses both directions of the trust problem:

### 7.2 Tool Integrity Verification

An OATS-compliant runtime MUST support cryptographic verification of tool schemas and contracts. The protocol MUST provide:

- **Domain-anchored discovery.** Tool publishers host public keys at well-known endpoints (e.g., `/.well-known/` URIs per RFC 8615). No centralized registry is required.
- **Signature verification.** Tool contracts and schemas are signed with ECDSA P-256 (or equivalent). The runtime verifies signatures before registering tools.
- **Trust-On-First-Use (TOFU) key pinning.** On first encounter, the runtime pins the publisher's key. Subsequent key changes require explicit trust decisions, preventing silent key substitution.
- **Revocation support.** Publishers can revoke keys and schemas. The runtime checks revocation status before accepting tools.

### 7.3 Agent Identity Verification

An OATS-compliant runtime SHOULD support cryptographic agent identity verification. The protocol provides:

- **Domain-anchored agent identity.** Organizations publish verifiable identity documents for their agents at well-known endpoints, anchoring trust to domain ownership via existing DNS and HTTPS infrastructure.
- **Short-lived credentials.** Agents are issued time-limited signed credentials (e.g., ES256 JWTs) declaring their identity, capabilities, and delegation chain.
- **Verification protocol.** Verifiers validate credentials through a multi-step protocol including signature verification, domain binding, capability validation, revocation checking, and TOFU key pinning.
- **Delegation chains.** Agent credentials support maker-deployer delegation, where the organization that builds agent software and the organization that deploys it are independently verifiable.
- **Capability scoping.** Agent credentials declare specific capabilities (e.g., `read:data`, `write:reports`), enabling verifiers to enforce least-privilege access.

### 7.4 Bidirectional Trust

The two identity layers create a bidirectional trust model for agent-tool interactions:

1. **Agent verifies tool.** Before invoking a tool, the agent's runtime verifies the tool's contract integrity using tool integrity verification. This ensures the tool has not been tampered with.
2. **Tool verifies agent.** Before accepting an invocation, the tool (or its hosting runtime) verifies the agent's identity using agent identity verification. This ensures the agent is authorized to act.
3. **Policy evaluation.** The runtime evaluates whether the verified agent's capabilities authorize it to use the verified tool.
4. **Audit recording.** Both verifications and the policy decision are recorded in the cryptographic audit journal.

This bidirectional model provides end-to-end trust: every action is attributable to a verified agent acting on a verified tool, with the authorization decision recorded immutably.

---

## 8. Policy Enforcement Layer

### 8.1 Policy Engine Requirements

An OATS-compliant runtime MUST include a policy engine that evaluates the tuple `(action, context, identity)` and produces an authorization decision. The policy engine:

- MUST support five authorization decisions: Allow, Deny, Modify, Step-Up, Defer.
- MUST evaluate both static policy (parameter constraints, forbidden patterns) and accumulated session context (intent alignment, compositional risk).
- MUST operate outside LLM influence. The policy engine receives structured inputs and returns structured decisions. It does not process natural language, does not share memory with the LLM, and cannot be influenced by the LLM's reasoning.
- SHOULD support a formally verifiable policy language (Cedar, OPA, or equivalent) that enables static analysis of policy correctness.
- MUST default to deny. Actions without an explicit allow policy are denied.

### 8.2 Action Classification

Not all actions can be evaluated the same way. OATS classifies actions into five categories based on how they should be evaluated:

- **Structurally forbidden.** Actions that cannot be expressed through the tool contract layer. These are eliminated before reaching the policy engine. No shell injection, no arbitrary command execution, no unconstrained API calls. This category exists only in systems with allow-list tool contracts; it is the primary differentiator of OATS's security model.
- **Policy-forbidden.** Actions expressible through tool contracts but always blocked by policy regardless of context. Hard organizational limits (e.g., dropping production databases, connections to known malicious domains).
- **Context-dependent deny.** Actions allowed by static policy but blocked when session context reveals inconsistency with stated intent. An agent authorized to send emails and query databases may exercise both capabilities legitimately, but reading customer PII followed by external email transmission constitutes a breach that neither action reveals in isolation.
- **Context-dependent allow.** Actions denied by default policy but permitted when context demonstrates clear alignment with legitimate intent. Deleting database records appears dangerous in isolation, but if context confirms the user explicitly requested "clean up my test data," blocking the action frustrates legitimate work without security benefit.
- **Context-dependent defer.** Actions whose risk cannot be conclusively determined. When available context is insufficient, ambiguous, or internally conflicting, execution is temporarily suspended pending additional context, validation, or human oversight.

This classification addresses the fundamental limitation of policy-only systems: they answer "is this action permitted?" without asking "does this action make sense given what the user asked for and what the agent has done?" The structurally forbidden category goes further, eliminating entire classes of dangerous actions before any classification is needed.

### 8.3 Context Accumulation

An OATS-compliant runtime MUST accumulate session context across actions within a session. The context accumulator maintains:

- **Original request.** The user's initial instruction establishing intent.
- **Action history.** The sequence of actions proposed, approved, denied, deferred, and executed.
- **Data classification.** The sensitivity level of information accessed. When no classification mechanism produces a label, data MUST be treated as the highest configured sensitivity level.
- **Tool outputs.** Results returned from previous actions.
- **Semantic distance.** A measure of how far the current action has drifted from the original request (see Section 8.4).
- **Identity context.** Verified identities of the agent, user, and tools involved.

The context accumulator MUST be implemented as an append-only, hash-chained log (see Section 9), ensuring that the context informing policy decisions is itself tamper-evident.

### 8.4 Semantic Distance Tracking

An OATS-compliant runtime SHOULD compute semantic distance between actions and stated intent to detect intent drift. Semantic distance is computed via embedding similarity between the original request and the current action.

Cumulative drift SHOULD be tracked across action sequences, not only per-action. Drift thresholds are deployment-specific and SHOULD be calibrated empirically. When drift exceeds configured thresholds, the Gate SHOULD trigger deferral, step-up authorization, or denial depending on the configured risk level.

### 8.5 Step-Up Authorization

For ambiguous cases, the runtime MUST support step-up authorization workflows:

- Action execution MUST block until an approval decision is received.
- Full action context MUST be available to approvers.
- Configurable timeouts MUST be enforced. Deny on timeout MUST be the default.
- Approval decisions MUST be recorded in the audit journal with approver identity and timestamp.

### 8.6 Deferral

For actions whose risk cannot be conclusively determined, the runtime MUST support deferral:

- Deferred actions MUST remain paused without producing effects.
- The runtime MUST track deferred actions and maintain their execution order.
- Cascading deferrals MUST be bounded: when concurrently deferred actions exceed a configurable limit, subsequent actions MUST be denied.
- Deny on timeout MUST be the default for deferred actions.
- Deferred actions MUST generate receipts recording both the deferral and its resolution.

---

## 9. Audit Layer

### 9.1 Journal Requirements

An OATS-compliant runtime MUST maintain a cryptographic audit journal recording all events in the ORGA loop. The journal is the authoritative record of what happened, when, why, and by whose authority.

### 9.2 Event Types

The journal MUST record at minimum the following event types:

| Event | When | Content |
|-------|------|---------|
| **LoopStarted** | Loop begins | Configuration, agent identity, original request |
| **ReasoningComplete** | After LLM response, before Gate | Proposed actions, token usage |
| **PolicyEvaluated** | After Gate decision | Actions evaluated, decisions, matching policies, reasons |
| **ToolsDispatched** | After tool execution | Tools invoked, parameters, duration, evidence hashes |
| **ObservationsCollected** | After collecting results | Observation count, context size |
| **LoopTerminated** | Loop ends | Reason, iterations, total usage, duration |
| **RecoveryTriggered** | On tool failure | Strategy, error context |

### 9.3 Cryptographic Properties

Each journal entry MUST include:

- **Ed25519 signature** (or equivalent; ECDSA P-256 also acceptable). The signature covers the canonical serialization of the entry contents.
- **Hash chain link.** Each entry includes the cryptographic hash of the previous entry, forming an append-only chain that detects retroactive modification.
- **Timestamp.** Cryptographic timestamp for temporal ordering.

Journal entries MUST be verifiable offline. A verifier with access to the journal and the signing public key can reconstruct the complete execution history and verify its integrity without access to the runtime.

### 9.4 Evidence Envelopes

Tool executions MUST produce structured evidence envelopes containing:

- Tool name and version
- Validated parameters
- Constructed invocation (command, HTTP request, etc.)
- Duration and exit status
- Output hash (SHA-256)
- Policy decision that authorized execution
- Agent and user identity at time of execution

Evidence envelopes are recorded in the journal and provide the forensic link between policy decisions and their effects.

### 9.5 Compliance Properties

The journal provides:

- **HIPAA audit trail.** Every access to health data is recorded with identity, authorization, and timestamp.
- **SOC2 evidence.** Policy enforcement decisions are immutably recorded.
- **SOX audit trail.** Financial system actions are attributable and reconstructible.
- **GDPR accountability.** Data access patterns are recorded for data subject rights enforcement.

---

## 10. Sandboxing and Isolation

### 10.1 Multi-Tier Sandboxing

An OATS-compliant runtime SHOULD support multiple sandboxing tiers with increasing isolation:

- **Tier 1: Container isolation.** Agent execution within container boundaries (e.g., Docker) with resource limits, network restrictions, and filesystem isolation.
- **Tier 2: Kernel-level isolation.** Agent execution within a user-space kernel (e.g., gVisor) providing syscall filtering and interception without full virtualization overhead.
- **Tier 3: Microkernel isolation.** Agent execution within a lightweight VM (e.g., Firecracker) providing hardware-level isolation with minimal overhead.

The choice of tier is deployment-specific and SHOULD be configurable per agent or per task based on risk classification.

### 10.2 Resource Limits

Regardless of sandboxing tier, agent execution MUST support configurable resource limits:

- Token budget (total tokens consumed across the session)
- Time budget (wall-clock duration)
- Iteration budget (maximum ORGA loop iterations)
- Tool call budget (maximum tool invocations)
- Network restrictions (allowed destinations, bandwidth limits)
- Filesystem restrictions (accessible paths, write permissions)

### 10.3 Circuit Breakers

Tool executions SHOULD be protected by circuit breakers. When a tool fails repeatedly, the circuit breaker trips and subsequent calls to that tool are rejected without execution until the circuit resets. This prevents cascading failures and runaway retry loops.

---

## 11. Inter-Agent Communication

### 11.1 Communication Governance

When agents communicate with other agents (delegation, queries, parallel execution), all inter-agent messages MUST pass through a communication policy gate. The gate evaluates authorization rules on communication primitives (ask, delegate, send, parallel, race) before execution.

### 11.2 Message Security

Inter-agent messages MUST be:

- **Cryptographically signed** (Ed25519 or equivalent) to ensure authenticity and integrity.
- **Encrypted** (AES-256-GCM or equivalent) to ensure confidentiality.
- **Attributed** to verified agent identities for audit trail purposes.

### 11.3 Delegation Constraints

Delegation chains MUST be bounded. An OATS-compliant runtime MUST enforce:

- Maximum delegation depth (configurable)
- Capability narrowing (a delegated agent cannot exceed the delegating agent's capabilities)
- Blast-radius containment (a compromised agent in a delegation chain cannot escalate privileges)

### 11.4 Cross-Agent Context

When an agent delegates to another agent, the session context (original user request, prior actions, data classifications) SHOULD be propagated to the downstream agent. This enables the downstream agent's Gate to evaluate actions against the original intent rather than only the delegation instruction.

---

## 12. Conformance Requirements

### 12.1 Conformance Levels

**OATS Core** (satisfies all MUST requirements): Provides baseline zero-trust agent execution.

**OATS Extended** (satisfies all MUST and SHOULD requirements): Provides comprehensive zero-trust agent execution with identity, sandboxing, and advanced policy features.

### 12.2 Core Requirements (MUST)

**C1: ORGA Loop Enforcement.** The runtime MUST implement the four-phase ORGA loop. The Gate phase MUST execute before every tool dispatch. In compiled languages, phase transitions MUST be enforced at compile time via typestates. In interpreted languages, equivalent guarantees MUST be provided through runtime enforcement with documented verification methodology.

**C2: Tool Contract Support.** The runtime MUST support declarative tool contracts with typed parameter validation. The LLM MUST NOT generate raw tool invocations (shell commands, API calls, SQL queries). All tool invocations MUST be constructed from validated parameters and contract-defined templates.

**C3: Policy Evaluation.** The runtime MUST evaluate actions against policy before execution. The policy engine MUST operate outside LLM influence. The policy engine MUST support Allow, Deny, Modify, Step-Up, and Defer decisions. Default stance MUST be deny.

**C4: Context Accumulation.** The runtime MUST accumulate session context across actions. Context MUST include original request (when available), action history, and data classification of accessed information.

**C5: Cryptographic Audit Journal.** The runtime MUST maintain a hash-chained, cryptographically signed audit journal recording all ORGA loop events. Journal entries MUST be verifiable offline.

**C6: Gate Independence.** The Gate phase MUST operate on structured inputs only. It MUST NOT process natural language, share mutable state with the LLM, or be influenced by the LLM's reasoning process.

**C7: Evidence Envelopes.** Tool executions MUST produce structured evidence envelopes with output hashes, execution metadata, and identity binding.

### 12.3 Extended Requirements (SHOULD)

**E1: Tool Integrity Verification.** The runtime SHOULD verify tool contract signatures using domain-anchored cryptographic verification with TOFU key pinning.

**E2: Agent Identity Verification.** The runtime SHOULD verify agent identity using domain-anchored cryptographic credentials with delegation chain support.

**E3: Semantic Distance Tracking.** The runtime SHOULD compute and track semantic distance between actions and stated intent.

**E4: Multi-Tier Sandboxing.** The runtime SHOULD support configurable sandboxing tiers for agent execution isolation.

**E5: Inter-Agent Communication Governance.** The runtime SHOULD enforce authorization policies on inter-agent communication with signed and encrypted messages.

**E6: Telemetry Export.** The runtime SHOULD export structured telemetry to security platforms (OCSF, CEF, or documented custom schemas).

**E7: Formally Verifiable Policies.** The policy engine SHOULD use a formally verifiable policy language that enables static analysis of policy correctness.

**E8: Least-Privilege Credential Scoping.** The runtime SHOULD support just-in-time credential issuance with operation-specific scoping.

### 12.4 Verification Methodology

For each Core requirement, the specification defines a verification procedure:

- **C1:** Attempt to construct a code path from Reason to Act that bypasses Gate. In a typestate implementation, this MUST be a compile error. In a runtime-enforced implementation, this MUST be caught by a verified test suite.
- **C2:** Submit tool parameters containing shell metacharacters. Verify rejection. Submit parameters outside declared type constraints. Verify rejection. Verify the LLM never receives raw invocation strings.
- **C3:** Configure Deny policy. Submit matching action. Verify no effects on target system. Verify denial recorded in journal.
- **C4:** Execute a sequence of actions. Verify the policy engine receives accumulated context for each subsequent action.
- **C5:** Generate journal entries for allowed, denied, deferred, and step-up actions. Verify all fields present, signatures valid, and hash chain intact. Tamper with an entry and verify detection.
- **C6:** Inspect Gate implementation. Verify no natural language parsing, no shared mutable state with LLM, no dynamic code paths influenced by LLM output.
- **C7:** Execute a tool. Verify evidence envelope contains tool name, parameters, output hash, duration, identity, and policy decision.

---

## 13. Implementation Architectures

OATS does not mandate a specific implementation architecture. The specification defines what a compliant runtime must do, not how it must be implemented. However, we note that the ORGA loop with typestate enforcement has a natural home in systems-level languages with rich type systems (Rust being the exemplar), and that tool contracts benefit from a declarative format (TOML, YAML, or equivalent) that can be version-controlled alongside the tools they describe.

### 13.1 Self-Hosted Runtimes

For organizations that control their agent infrastructure, the full OATS stack (ORGA loop, tool contracts, policy engine, audit journal, identity verification, sandboxing) can be deployed as a single runtime. This provides the strongest guarantees: compile-time enforcement, full context visibility, cryptographic identity, and multi-tier isolation.

### 13.2 Plugin/Extension Model

For agents that run inside third-party platforms (Claude Code, Gemini CLI, VS Code extensions), OATS compliance can be achieved through a layered approach:

- **Inner layer (awareness):** A plugin or extension running inside the agent platform provides tool discovery, audit logging, and advisory policy evaluation.
- **Outer layer (enforcement):** The agent platform runs inside an OATS-compliant runtime (via CLI executor, container wrapper, or similar). The outer runtime's ORGA Gate provides hard enforcement that the inner plugin cannot bypass.

This dual-mode architecture provides governance for agents running on platforms the organization does not control, using the platform's extension mechanism for awareness and a wrapping runtime for enforcement.

### 13.3 Gateway Architecture

For protocol-based tool invocations (MCP, REST APIs), an OATS-compliant gateway can intercept all traffic between agents and tools. The gateway implements the Gate phase, context accumulation, and audit journaling. This provides enforcement without modifying agent code, at the cost of reduced context visibility (the gateway may not see internal agent state or the original user request unless explicitly provided).

### 13.4 Vendor Integration

For SaaS agents where organizations control none of the infrastructure, OATS conformance requires vendor cooperation. Vendors must provide synchronous pre-execution hooks, decision enforcement, context availability, and receipt export. OATS provides the specification that customers can reference in vendor evaluations and contracts.

---

## 14. Research Directions

### 14.1 Typestate in Non-Rust Languages

The compile-time enforcement guarantee of OATS is strongest in languages with typestate support (Rust, potentially Haskell, Scala with phantom types). Providing equivalent guarantees in Python, JavaScript, and Go requires either runtime enforcement with formal verification of path coverage, or code generation from a verified specification. Research into practical typestate enforcement across language ecosystems is needed.

### 14.2 Data Flow Through Context Windows

Tracking data lineage through LLM context windows remains an open challenge. Data may be transformed, summarized, or paraphrased by the LLM before being used in subsequent actions. Information-theoretic approaches (taint analysis, watermarking) are active research areas.

### 14.3 Multi-Agent Trust Coordination

As agents delegate to other agents across organizational boundaries, maintaining coherent trust chains requires distributed tracing standards, federated receipt verification, and cross-domain policy negotiation. The identity layer specified in OATS provides the foundation, but the coordination protocols are not yet specified.

### 14.4 Formal Verification of the ORGA Loop

The typestate enforcement of ORGA provides compile-time guarantees about phase ordering, but formal verification of the entire loop (including policy engine correctness, context accumulator completeness, and journal integrity) would provide stronger assurance. Research into mechanized proofs of agent runtime properties is a promising direction.

### 14.5 Approval Fatigue and Deferral Resolution

Balancing security (more actions require approval) against usability (too many approvals cause fatigue) remains an open design challenge. ML-based approval recommendation, batch approval for similar actions, and progressive autonomy (where agents earn reduced approval requirements through demonstrated compliance) are active research directions.

### 14.6 Vector Embedding Security

When semantic distance tracking uses vector embeddings, the embeddings themselves become a security surface. Research into information-theoretic watermarking of embeddings, steganographic attack detection, and quantization-robust integrity verification is needed to ensure that the semantic distance mechanism itself cannot be subverted.

---

## 15. Conclusion

OATS specifies what a zero-trust AI agent runtime must do to provide meaningful security guarantees for autonomous agent execution. The specification is grounded in three architectural convictions:

**Allow-list over deny-list.** Constraining what actions can be expressed is fundamentally stronger than intercepting arbitrary actions and deciding which to block. Tool contracts make dangerous actions structurally inexpressible.

**Compile-time over runtime enforcement.** Guaranteeing that policy evaluation cannot be bypassed through the type system is fundamentally stronger than testing that it works at runtime. The ORGA typestate makes invalid phase transitions compile errors.

**Structural independence over trust assumptions.** Ensuring that the Gate operates outside LLM influence through structural isolation is fundamentally stronger than assuming the orchestration layer will correctly route actions through the policy engine.

These convictions are not theoretical. The architecture specified here has been validated through approximately eight months of autonomous operation in a production runtime (Symbiont, by ThirdKey AI), including a catastrophic disaster recovery scenario where the runtime rebuilt itself using its own agent infrastructure after a total codebase loss.

By publishing this specification as an open standard, we aim to establish baseline requirements that preserve interoperability and buyer choice. The goal is not to build OATS, but to define what an OATS-compliant system must do, enabling the market to compete on implementation quality rather than category definition.

---

## References

- Anthropic. "Model Context Protocol Specification." 2024. https://modelcontextprotocol.io
- Amazon Web Services. "Cedar: A Language for Defining Permissions as Policies." 2023. https://www.cedarpolicy.com
- Chuvakin, A. "Cloud CISO Perspectives: How Google secures AI Agents." Google Cloud Blog, June 2025.
- Debenedetti, E. et al. "AgentDojo: A Dynamic Environment to Evaluate Attacks and Defenses for LLM Agents." arXiv:2406.13352, 2024.
- Errico, H. "Autonomous Action Runtime Management (AARM): A System Specification for Securing AI-Driven Actions at Runtime." arXiv:2602.09433v1, 2026.
- Gaire, S. et al. "Systematization of Knowledge: Security and Safety in the Model Context Protocol Ecosystem." arXiv:2512.08290, 2025.
- Gregg, B. "BPF Performance Tools." Addison-Wesley, 2019.
- Greshake, K. et al. "Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection." AISec Workshop at ACM CCS, 2023.
- Hardy, N. "The Confused Deputy: (or why capabilities might have been invented)." ACM SIGOPS, 1988.
- Microsoft. "Governance and security for AI agents across the organization." Cloud Adoption Framework, 2024.
- Miller, M. S. "Robust Composition: Towards a Unified Approach to Access Control and Concurrency Control." Ph.D. dissertation, Johns Hopkins University, 2006.
- National Institute of Standards and Technology. "AI Risk Management Framework (AI RMF 1.0)." 2023.
- Open Policy Agent. "OPA: Policy-based control for cloud native environments." 2024. https://www.openpolicyagent.org
- OWASP Foundation. "OWASP Top 10 for Large Language Model Applications." 2024.
- Raza, S. et al. "TRiSM for Agentic AI: A Review of Trust, Risk, and Security Management in LLM-based Agentic Multi-Agent Systems." arXiv:2506.04133, 2025.
- Reber, D. "The Agentic AI Security Scoping Matrix: A Framework for Securing Autonomous AI Systems." AWS Security Blog, November 2024.
- Ruan, Y. et al. "The Emerged Security and Privacy of LLM Agent: A Survey with Case Studies." arXiv:2407.19354, 2024.
- Su, H. et al. "A Survey on Autonomy-Induced Security Risks in Large Model-Based Agents." arXiv:2506.23844, 2025.
- Wanger, J. "AgentPin Technical Specification v0.2.0." ThirdKey AI, 2026. https://agentpin.org
- Wanger, J. "SchemaPin Protocol Specification." ThirdKey AI, 2025. https://schemapin.org
- Wanger, J. "Symbiont Runtime Architecture." ThirdKey AI, 2026. https://symbiont.dev
- Wanger, J. "ToolClad: Declarative Tool Interface Contracts for Agentic Runtimes v0.5.1." ThirdKey AI, 2026.
- Wu, Q. et al. "Security of AI Agents." arXiv:2406.08689, 2024.
- Ye, Q. et al. "ToolEmu: Identifying Risky Real-World Agent Failures with a Language Model Emulator." ICLR, 2024.

---

*Open Agent Trust Stack (OATS): Zero-trust agent execution through structural enforcement.*  

**ThirdKey AI** -- thirdkey.ai  
**Symbiont Runtime** -- symbiont.dev  
**SchemaPin** -- schemapin.org  
**AgentPin** -- agentpin.org  
**ToolClad** -- toolclad.org
