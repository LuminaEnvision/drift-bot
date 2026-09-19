# Solana contract audit — v2 stub

Detection is already handled:

- `Anchor.toml` in the repo root, or
- `Cargo.toml` depending on `anchor-lang` or `solana-program`

Those flags come from `packages/stack-detector/src/rust/`. This folder does **not** run cargo-audit or Anchor/Solana static checks yet.

`runContractAudit` matches the EVM module interface and returns a labeled "not yet supported" result so a mixed EVM+Solana repo can still run Slither on the EVM side.

Fill this in during v2 without changing the package layout.
