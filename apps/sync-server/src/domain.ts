/**
 * Thin re-export + seed room helper so the sync server can depend on core.
 */
import {
  asAccountId,
  asCharacterId,
  asRoomId,
  DEFAULT_HOTSPOTS,
  hotspotsWithFurnitureSeats,
  isRoomStyleId,
  performAction,
  resolveWalkPosition,
  ROOM_SPAN_X,
  setPresence,
  setRoomStyle,
  solidBoxesFromFurniture,
  tickRoom,
  withMemberState,
  type ActionKind,
  type Character,
  type CharacterId,
  type LayoutFurnitureRef,
  type PresenceState,
  type Room,
  type RoomId,
  type RoomStyleId,
  type SolidBox,
} from "@pixelroom/core";

export {
  asAccountId,
  asCharacterId,
  asRoomId,
  DEFAULT_HOTSPOTS,
  hotspotsWithFurnitureSeats,
  isRoomStyleId,
  performAction,
  resolveWalkPosition,
  ROOM_SPAN_X,
  setPresence,
  setRoomStyle,
  solidBoxesFromFurniture,
  tickRoom,
  withMemberState,
  type ActionKind,
  type Character,
  type CharacterId,
  type LayoutFurnitureRef,
  type PresenceState,
  type Room,
  type RoomId,
  type RoomStyleId,
  type SolidBox,
};

export function createSeedCompatibleRoom(
  roomId: RoomId,
  memberIds: CharacterId[],
  options: {
    kind?: "dm" | "party";
    name?: string | null;
    adminIds?: CharacterId[];
    styleId?: RoomStyleId;
  } = {},
): Room {
  const now = Date.now();
  const memberState: Room["memberState"] = {};
  memberIds.forEach((id, index) => {
    memberState[String(id)] = {
      characterId: id,
      presence: "sleeping",
      position: { x: 3 + index * 3.5, y: 1.6 + (index % 2) * 1.0 },
      facing: index % 2 === 0 ? "right" : "left",
      currentAction: "sleep",
      actionTargetId: null,
      occupiedSpotId: null,
      lastActiveAt: now,
    };
  });

  const kind = options.kind ?? (memberIds.length >= 3 ? "party" : "dm");

  return {
    id: roomId,
    kind,
    name: options.name ?? null,
    memberIds: [...memberIds],
    adminIds: options.adminIds ?? (kind === "party" ? memberIds.slice(0, 1) : []),
    styleId: options.styleId ?? "garden",
    hotspots: DEFAULT_HOTSPOTS.map((h) => ({ ...h, position: { ...h.position } })),
    memberState,
    actionLog: [],
    createdAt: now,
    updatedAt: now,
  };
}
