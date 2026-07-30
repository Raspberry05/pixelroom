# Architecture

## Goals

1. Secure messaging first-class (E2E)
2. Shared room simulation driven by presence + commands
3. Mobile-first UX (Expo), pixel presentation later
4. Clear domain boundaries so UI never owns business rules

## Layers

```
apps/mobile          UI / navigation / rendering
        │
packages/core        Room, Character, Presence, Actions, Simulation
        │
packages/crypto      Identity, sessions, encrypt/decrypt APIs
        │
(future) server      Delivery, presence fan-out, shop catalog (no plaintext)
```

## Core domain

### Character

Created at onboarding. Holds display name, appearance slots, and inventory refs. Bound to a verified phone identity at the account layer (not stored as raw PII in the room model).

### Room

One room per conversation (`dm` or `group`). Members map to characters. Room state is a syncable snapshot:

- member presence
- positions / current action
- recent action log (for replay / UI)

### Presence

| State | Meaning |
|-------|---------|
| `active` | App focused in this chat; character awake and available |
| `away` | App backgrounded briefly; idle but not sleeping |
| `sleeping` | Not in the chat; character rests in the room |

### Actions & commands

User text starting with `*` parses as a command (`*hug @alex`). Valid actions update room state and emit an encrypted `action` event alongside (or instead of) a chat bubble.

### Simulation tick

On each tick (client-authoritative for v0; later reconcile via encrypted state events):

1. Sleep all non-present members
2. Idle active members toward room hotspots
3. If ≥2 active: pick compatible auto-interactions (talk, wave, sit together)
4. Append action log entries for UI

## Messaging & encryption

Message envelope (conceptual):

```ts
{
  id: string
  roomId: string
  senderId: string
  sentAt: number
  ciphertext: Uint8Array  // seals MessagePayload
  // MessagePayload = { type: 'text' | 'action' | 'presence' | 'room_state', ... }
}
```

Servers store and fan-out ciphertext only. Group rooms will need sender keys / MLS later; v0 models 1:1 session APIs first.

## Shop (planned)

Catalog of clothes, furniture, and room skins. Purchases unlock cosmetic inventory — never bypass encryption or presence rules.

## Non-goals (for now)

- Final pixel art / animation system
- Production Signal Protocol implementation
- Payment provider integration
- Moderation tooling beyond basic stubs
