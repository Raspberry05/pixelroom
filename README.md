# Pixelroom

Encrypted messaging game for mobile: chat with friends inside a shared pixel room where characters walk, sleep, and act when you're both present.

> Working title — rename anytime. Logic first; pixel art style later.

## Concept

Pixelroom combines Signal-style secure messaging with a lightweight Sims-like room layer:

- **1:1 and group chats** each own a shared room
- **Presence**: active members walk and interact; absent members sleep in the room
- **Commands**: `*cook`, `*clean`, `*hug`, `*kiss`, and more drive roleplay actions
- **Auto-play**: when multiple people are active, characters interact on their own
- **Character + shop** (planned): create an avatar, buy clothes and rooms
- **E2E encryption**: message payloads stay confidential end-to-end

## Monorepo

| Path | Package | Role |
|------|---------|------|
| `packages/core` | `@pixelroom/core` | Domain: rooms, presence, actions, simulation |
| `packages/crypto` | `@pixelroom/crypto` | E2E crypto interfaces + local session primitives |
| `apps/mobile` | `@pixelroom/mobile` | Expo app shell (UI/style later) |

## Quick start

```bash
npm install
npm test
npm run build
```

Run the mobile shell:

```bash
npm start -w @pixelroom/mobile
```

## Security stance

- Treat the server as untrusted for message content
- Encrypt chat text and action events before transport
- Phone-number identity is planned with careful hashing / verification (Signal-like)
- Current crypto package exposes typed interfaces and a **dev local cipher** for tests — replace with a production Signal/MLS protocol before shipping

## License

MIT
