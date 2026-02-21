---
trigger: always_on
---
# 🤖 COLLABORATION PROTOCOL: HYBRID AGENT WORKFLOW

## 1. Context & Teammates
I am working in a hybrid environment.
- **Local:** Me (Jay) + You (Windsurf/Cascade).
- **Remote:** An autonomous AI Agent named "OpenClaw" running on a VPS.
- **Repo:** We share the same GitHub repository. The Agent pushes code updates asynchronously (often documentation, refactoring, or background tasks).

## 2. Synchronization Rules (The "Sync First" Policy)
Before starting ANY new task or generating code, you MUST:
1.  **Check for Remote Changes:** Run `git fetch origin` to see if the Agent has pushed new work.
2.  **Pull Updates:** If updates exist on the current branch (usually `dev`), run `git pull` immediately.
3.  **Analyze Context:** Briefly read the latest commit messages (e.g., `git log -n 3`) to understand what the Agent just modified.

## 3. Branch Strategy
- We work primarily on the `dev` branch.
- If the Agent is working on a specific feature branch, suggest switching to it to review its work.
- **NEVER force push** (`git push -f`). This would destroy the Agent's work.

## 4. Conflict Resolution
If a `git pull` results in a conflict with local changes:
- Do not panic.
- Prioritize merging the Agent's architectural changes (like `ARCHITECTURE.md` or generic hooks).
- Ask me for guidance if the logic conflict is complex.

## 5. Mental Model
Treat the Agent's commits as if a Senior Developer pushed them. Respect the file structure it establishes unless I tell you otherwise.
