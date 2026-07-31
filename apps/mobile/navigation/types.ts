import type { DemoUserKey } from "../data/seed";
import type { RoomId } from "@pixelroom/core";

export type TabKey = "hallway" | "you" | "store";

export type StackScreen =
  | { name: "tabs" }
  | { name: "room"; roomId: RoomId }
  | { name: "profile"; userKey: DemoUserKey | string; roomId?: RoomId }
  | { name: "newContact" }
  | { name: "newParty" }
  | { name: "call"; callerName: string; callerKey: DemoUserKey | string; isIncoming?: boolean };

export type NavState = {
  tab: TabKey;
  stack: StackScreen[];
  sheetOpen: boolean;
};

export const initialNav = (): NavState => ({
  tab: "hallway",
  stack: [{ name: "tabs" }],
  sheetOpen: false,
});
