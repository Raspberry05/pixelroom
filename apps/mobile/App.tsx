import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createCharacter,
  createRoom,
  createTextMessage,
  parseCommand,
  performAction,
  setPresence,
  tickRoom,
  type Character,
  type Room,
  type RoomActionLogEntry,
} from "@pixelroom/core";

/**
 * Logic playground shell — pixel art / polished UI comes later.
 * Demonstrates presence, commands, and simulation ticks on-device.
 */
export default function App() {
  const [alice] = useState<Character>(() =>
    createCharacter({ accountId: "local-alice", displayName: "Alice" }),
  );
  const [bob] = useState<Character>(() =>
    createCharacter({ accountId: "local-bob", displayName: "Bob" }),
  );
  const [room, setRoom] = useState<Room>(() => {
    let next = createRoom({ kind: "dm", memberIds: [alice.id, bob.id] });
    next = setPresence(next, alice.id, "active");
    next = setPresence(next, bob.id, "active");
    return next;
  });
  const [draft, setDraft] = useState("");
  const [feed, setFeed] = useState<string[]>(["Both active in the room. Try *hug Bob or *cook"]);

  const charactersById = useMemo(
    () =>
      new Map<Character["id"], Character>([
        [alice.id, alice],
        [bob.id, bob],
      ]),
    [alice, bob],
  );

  const memberLines = Object.values(room.memberState).map((m) => {
    const name = charactersById.get(m.characterId)?.displayName ?? m.characterId;
    return `${name}: ${m.presence} · ${m.currentAction} @ (${m.position.x},${m.position.y})`;
  });

  function pushFeed(line: string) {
    setFeed((prev) => [line, ...prev].slice(0, 40));
  }

  function formatLog(entry: RoomActionLogEntry): string {
    const actor = charactersById.get(entry.actorId)?.displayName ?? "???";
    const target = entry.targetId
      ? charactersById.get(entry.targetId)?.displayName
      : null;
    const suffix = target ? ` → ${target}` : "";
    return `[${entry.source}] ${actor} *${entry.action}${suffix}`;
  }

  function onSend() {
    const text = draft.trim();
    if (!text) return;

    const command = parseCommand(text);
    if (command) {
      try {
        const result = performAction(room, alice.id, command.action, {
          targetName: command.targetName,
          charactersById,
          source: "command",
        });
        setRoom(result.room);
        pushFeed(formatLog(result.logEntry));
      } catch (error) {
        pushFeed(error instanceof Error ? error.message : "action failed");
      }
    } else {
      const msg = createTextMessage({
        roomId: room.id,
        senderId: alice.id,
        text,
      });
      pushFeed(`Alice: ${msg.text}`);
    }
    setDraft("");
  }

  function onTick() {
    const result = tickRoom(room, {
      config: { autoInteractChance: 0.8, maxAutoInteractions: 1 },
    });
    setRoom(result.room);
    if (result.events.length === 0) {
      pushFeed("tick: wandered / idle");
    } else {
      for (const event of result.events) {
        pushFeed(formatLog(event));
      }
    }
  }

  function toggleBob() {
    const bobState = room.memberState[String(bob.id)];
    const nextPresence = bobState?.presence === "active" ? "sleeping" : "active";
    const next = setPresence(room, bob.id, nextPresence);
    setRoom(next);
    pushFeed(`Bob is now ${nextPresence}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>Pixelroom</Text>
        <Text style={styles.sub}>Encrypted room chat — logic preview</Text>
      </View>

      <View style={styles.roomPanel}>
        <Text style={styles.panelTitle}>Room</Text>
        {memberLines.map((line) => (
          <Text key={line} style={styles.mono}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={onTick}>
          <Text style={styles.btnText}>Sim tick</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={toggleBob}>
          <Text style={styles.btnText}>Toggle Bob sleep</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.feed} contentContainerStyle={styles.feedContent}>
        {feed.map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.feedLine}>
            {line}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message or *hug Bob"
          placeholderTextColor="#8a8a8a"
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <Pressable style={styles.send} onPress={onSend}>
          <Text style={styles.btnText}>Send</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f3f1ec",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: "#141414",
  },
  sub: {
    marginTop: 4,
    fontSize: 14,
    color: "#5c5c5c",
  },
  roomPanel: {
    marginHorizontal: 20,
    padding: 14,
    backgroundColor: "#e7e2d8",
    gap: 4,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b6b6b",
    marginBottom: 4,
  },
  mono: {
    fontSize: 13,
    color: "#1f1f1f",
    fontVariant: ["tabular-nums"],
  },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  btn: {
    backgroundColor: "#1f1f1f",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnSecondary: {
    backgroundColor: "#3d3d3d",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnText: {
    color: "#f7f7f7",
    fontWeight: "600",
    fontSize: 13,
  },
  feed: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 20,
  },
  feedContent: {
    gap: 8,
    paddingBottom: 12,
  },
  feedLine: {
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
  },
  composer: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#cfc9bd",
    backgroundColor: "#efebe3",
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111",
  },
  send: {
    backgroundColor: "#1f1f1f",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});
