import assert from "node:assert/strict";
import test from "node:test";
import { ALL_NODES, REGION_DATA } from "../../data/regions";
import { NODE_META, NODE_REGION, NEIGHBOURS } from "../data";
import { Door } from "./entities";
import { IceSentry } from "./enemies";
import { buildVrLevel, finaleForNode, usesVirtualityBreach, VR_TIER_TUNING } from "./levels";
import { TILE_SIZE } from "./themes";
import { Tilemap } from "./tilemap";

const W1 = REGION_DATA.west1;

test("Every WEST1 sector has at least one connected CORPORATE (CRP) node", () => {
  for (const sector of W1.sectors) {
    const crps = W1.nodes.filter((n) => n.sector === sector.id && n.type === "CORPORATE");
    assert.ok(
      crps.length >= 1,
      `Sector ${sector.id} (${sector.code}) must have at least one CRP node`
    );
    for (const crp of crps) {
      const links = W1.links.filter((l) => l.a === crp.id || l.b === crp.id);
      assert.ok(links.length >= 1, `CRP node ${crp.id} (${crp.code}) must be linked to neighbours`);
      assert.ok((NEIGHBOURS[crp.id]?.length ?? 0) >= 1, `NEIGHBOURS must index ${crp.id}`);
      assert.ok(NODE_META[crp.id], `NODE_META must exist for ${crp.id}`);
    }
  }
});

test("usesVirtualityBreach covers WEST1 CORPORATE nodes only and excludes WETLOW", () => {
  const w1Crps = W1.nodes.filter((n) => n.type === "CORPORATE");
  assert.ok(w1Crps.length >= 6);
  for (const crp of w1Crps) {
    assert.equal(usesVirtualityBreach(crp.id), true, `${crp.id} should use Virtuality Breach`);
  }

  const nonCrp = W1.nodes.find((n) => n.type !== "CORPORATE");
  assert.ok(nonCrp);
  assert.equal(usesVirtualityBreach(nonCrp.id), false);

  const wetlowCrp = ALL_NODES.find(
    (n) => NODE_REGION[n.id] !== "west1" && n.type === "CORPORATE"
  );
  assert.ok(wetlowCrp, "Expected non-west1 CRP node in dataset to confirm prototype scope");
  assert.equal(usesVirtualityBreach(wetlowCrp.id), false);
});

test("CRP-P06 (w1p_crp2) uses BLACKOUT_SWITCH sabotage finale and Takamuri theme", () => {
  const lvl = buildVrLevel("w1p_crp2");
  assert.equal(lvl.nodeCode, "CRP-P06");
  assert.equal(lvl.tier, 3);
  assert.equal(lvl.finaleKind, "BLACKOUT_SWITCH");
  assert.equal(lvl.isSabotageBlackout, true);
  assert.equal(lvl.theme.id, "takamuri");
});

test("Tier difficulty tuning scales monotonically from T1 to T5", () => {
  for (let t = 1 as 1 | 2 | 3 | 4; t < 5; t = (t + 1) as 1 | 2 | 3 | 4) {
    const cur = VR_TIER_TUNING[t];
    const next = VR_TIER_TUNING[(t + 1) as 2 | 3 | 4 | 5];
    assert.ok(next.enemyHpBonus >= cur.enemyHpBonus, `T${t + 1} HP bonus >= T${t}`);
    assert.ok(next.enemyFireRateMult <= cur.enemyFireRateMult, `T${t + 1} fire cooldown <= T${t}`);
    assert.ok(next.enemyBulletSpeedMult >= cur.enemyBulletSpeedMult, `T${t + 1} bullet speed >= T${t}`);
    assert.ok(next.timedDoorSec <= cur.timedDoorSec, `T${t + 1} timed door <= T${t}`);
    assert.ok(next.failRep > cur.failRep, `T${t + 1} failRep > T${t}`);
  }
});

test("All WEST1 CRP levels build valid enclosed tilemaps with clear spawns, shafts, and varied endings", () => {
  const w1Crps = W1.nodes.filter((n) => n.type === "CORPORATE");
  const seenEndings = new Set<string>();
  const seenThemes = new Set<string>();

  for (const node of w1Crps) {
    const lvl = buildVrLevel(node.id);
    seenEndings.add(lvl.finaleKind);
    seenThemes.add(lvl.theme.id);

    const tm = new Tilemap(lvl.ascii);
    assert.ok(tm.cols >= 72);
    assert.ok(tm.rows >= 28);

    // Outer walls sealed
    assert.equal(tm.getTile(0, 0), "solid");
    assert.equal(tm.getTile(tm.cols - 1, tm.rows - 1), "solid");

    // Spawn & checkpoint & core terminal stand in empty headroom above floor
    assert.equal(tm.getTile(lvl.spawn.col, lvl.spawn.row - 1), "empty", `${node.code} spawn headroom`);
    assert.equal(tm.getTile(lvl.checkpoint.col, lvl.checkpoint.row - 1), "empty", `${node.code} checkpoint headroom`);
    assert.equal(tm.getTile(lvl.coreTerminal.col, lvl.coreTerminal.row - 1), "empty", `${node.code} core headroom`);

    // Elevators have no solid wall blocking intermediate rows
    for (const elev of lvl.elevators) {
      for (let r = elev.topRow; r < elev.bottomRow; r++) {
        assert.notEqual(
          tm.getTile(elev.col + 1, r),
          "solid",
          `${node.code} ${elev.id} blocked at row ${r}`
        );
      }
    }
  }

  assert.ok(seenEndings.size >= 4, "Expected at least 4 distinct finale types across WEST1 CRP nodes");
  assert.ok(seenThemes.size >= 5, "Expected distinct corp reality themes across WEST1 CRP nodes");
  assert.equal(finaleForNode("w1g_crp", 5), "CORE_EXTRACTION");
});

test("Tilemap collision stops falling bodies on solid deck", () => {
  const tm = new Tilemap([
    "########",
    "#......#",
    "#......#",
    "########",
  ]);
  const rect = { x: 24, y: 16, w: 14, h: 28 };
  const col = tm.moveAndCollide(rect, 0, 200, 0.1);
  assert.equal(col.hitBottom, true);
  assert.equal(rect.y + rect.h, 3 * TILE_SIZE);
});

test("Door opens and closes safely after timer expiration when player is clear", () => {
  const door = new Door({
    id: "d1",
    color: "green",
    col: 10,
    topRow: 4,
    heightTiles: 3,
    timedSeconds: 2,
  });
  assert.equal(door.isBlocking(), true);
  door.open();
  for (let i = 0; i < 20; i++) {
    door.update(0.05, { x: 0, y: 0, w: 14, h: 28 });
  }
  assert.equal(door.isOpen, true);
  assert.equal(door.isBlocking(), false);

  for (let i = 0; i < 30; i++) {
    door.update(0.05, { x: 0, y: 0, w: 14, h: 28 });
  }
  assert.equal(door.isOpen, false);
});

test("IceSentry takes damage and transitions to dead when HP depleted", () => {
  const sentry = new IceSentry(
    { kind: "thug", col: 5, row: 10, facing: -1, patrolMinCol: 2, patrolMaxCol: 8 },
    VR_TIER_TUNING[1]
  );
  assert.equal(sentry.isAlive(), true);
  assert.equal(sentry.takeDamage(2, 50), false);
  assert.equal(sentry.isAlive(), true);
  assert.equal(sentry.takeDamage(2, 50), true);
  assert.equal(sentry.isAlive(), false);
});
