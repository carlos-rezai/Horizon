# Understand-Anything — demo snapshot

This directory is a **generated artifact**, not hand-written source. It holds a
knowledge graph of the Horizon codebase produced by the
[Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) Claude Code
plugin (`/understand`), kept here so the interactive dashboard can be launched on
demand as a worked example of the tool on a small, heavily-documented project.

## What's tracked

| File                   | Purpose                                                                           |
| ---------------------- | --------------------------------------------------------------------------------- |
| `knowledge-graph.json` | The graph the dashboard renders — 648 nodes, 1073 edges, 12 layers, 14-step tour. |
| `meta.json`            | Snapshot metadata (pins the analyzed commit).                                     |
| `.understandignore`    | Scan exclusion rules (none active beyond built-in defaults).                      |

Scratch (`intermediate/`, `tmp/`, `.trash-*`) and the regenerable
`fingerprints.json` are `.gitignore`d.

## Important: this is a point-in-time snapshot

The graph was generated at commit **`f429d48`** and does **not** auto-update — it
will drift as Horizon evolves. Treat it as "the architecture as of that commit."
Before a fresh demo, regenerate with `/understand` (needs the plugin installed and
Node ≥ 22).

## Viewing it

Run `/understand-dashboard` in Claude Code. The dashboard ships with the plugin,
which is **not** vendored in this repo — it lives in your local `~/.claude` install,
so the dashboard works on a machine where the plugin is installed, not from a bare
`git clone`.
