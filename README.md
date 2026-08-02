# Roomie

Encrypted messaging with friends and family inside a shared pixel room — characters walk, sleep, and hang out when you're both present.

> Product name: **Roomie**. Internal packages still use `@pixelroom/*`.

## Concept

Roomie combines Signal-style secure messaging with a lightweight Sims-like room layer:

- **1:1 and group chats** each own a shared room
- **Presence**: active members walk and interact; absent members sleep in the room
- **Commands**: `*cook`, `*clean`, `*hug`, `*kiss`, and more drive roleplay actions
- **Auto-play**: server-driven sim ticks while people are in the room
- **Hallway / You / Store** shell inspired by WhatsApp & Signal, with pixel-room stage
- **E2E encryption**: interfaces ready; demo sync is plaintext for local dual-user testing

## Monorepo

| Path | Package | Role |
|------|---------|------|
| `packages/core` | `@pixelroom/core` | Domain: rooms, presence, actions, simulation |
| `packages/crypto` | `@pixelroom/crypto` | E2E crypto interfaces + local session primitives |
| `apps/mobile` | `@pixelroom/mobile` | Expo UI (Hallway, Room, Store, …) |
| `apps/sync-server` | `@pixelroom/sync-server` | Local WebSocket hub for Alice/Bob demo |
| `assets/_incoming` | — | Staged free art packs (see `docs/ASSETS.md`) |
| `docs/ASSETS.md` | — | Asset inventory + future unpack/cook vision |

## Quick start

```bash
npm install
npm test
npm run build
```

### Dual-user web demo (recommended)

```bash
npm run demo:duo
```

Then open **two** browser windows:

- http://localhost:8081/?user=alice
- http://localhost:8081/?user=bob

(Use the port Expo prints if it is not `8081`.)

Each user already has the other in contacts. Open the DM from the Hallway — messages, `*actions`, and live character movement sync over `ws://localhost:8787`.

Or run pieces separately:

```bash
npm run sync
npm run web
```

### Expo Go

Same Wi‑Fi as the PC works best (`npm start -w @pixelroom/mobile`). Cross-network / Tailscale discovery is unreliable.

## Security stance

- Treat the server as untrusted for message content in production
- Demo sync server is **not** E2E encrypted — local playground only
- Production path: encrypt payloads with `@pixelroom/crypto` before transport

## License

MIT
