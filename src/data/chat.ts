export type ChannelId = "GLOBAL" | "OPERATORS" | "MARKET" | "CORPORATE" | "PRIVATE";

export interface ChatMsg {
  id: number;
  ch: ChannelId;
  nick: string;
  text: string;
  t: string;
  self?: boolean;
  corp?: boolean;
}

export const CHANNELS: ChannelId[] = ["GLOBAL", "OPERATORS", "MARKET", "CORPORATE", "PRIVATE"];

/* 低饱和昵称调色板，通过昵称哈希选择颜色。 */
export const NICK_COLORS = [
  "var(--color-phos)", // 荧光主色（跟随当前配色方案）
  "#cfa04b", // 琥珀色
  "#7f95a8", // 钢蓝色
  "#8f86b8", // 低饱和紫色
  "var(--color-sagehi)", // 浅鼠尾草绿
  "#b36a52", // 氧化红
];

export const nickColor = (nick: string): string => {
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (h * 31 + nick.charCodeAt(i)) >>> 0;
  return NICK_COLORS[h % NICK_COLORS.length];
};

interface PoolEntry {
  nick: string;
  text: string;
}

const G = (nick: string, text: string): PoolEntry => ({ nick, text });

export const CHAT_POOL: Record<ChannelId, { nicks: string[]; msgs: PoolEntry[] }> = {
  GLOBAL: {
    nicks: ["NULLBYTE", "Ghost_404", "deadlink", "rootkit", "SYNTH", "coldboot", "BlackRelay", "koma", "irq0", "modemmike", "VHS_girl", "patchbay", "Grazhdanka", "Gabedan", "AlexMurphy", "Comrakoff", "Nk", "ArkadyParovozov", "Pterich", "Shisoika", "LukeKey", "Vino"],
    msgs: [
      G("NULLBYTE", "anyone else getting packet loss in {sector}?"),
      G("Ghost_404", "found an unregistered relay out past the backbone. not touching it."),
      G("rootkit", "corporate security is unusually active today."),
      G("SYNTH", "does anyone know why {sector} is restricted?"),
      G("coldboot", "traceroute died 9 hops in. every hop in the core. spooky."),
      G("BlackRelay", "{node} dropped again. third time this week."),
      G("koma", "300 baud would feel faster than this lag"),
      G("irq0", "the deep net echoes are back. hearing repeats on {node}"),
      G("modemmike", "someone pinged my node at 4am. rude."),
      G("VHS_girl", "nah the archive mirrors are toast, check south storage instead"),
      G("patchbay", "who runs {node}? it answers but says nothing"),
      G("deadlink", "static on the eastern trunk again"),
      G("koma", "lol"),
      G("irq0", "afk, dinner"),
      G("SYNTH", "new here. is this map legit?"),
      G("Ghost_404", "yes. dont touch the core."),
      G("coldboot", "i miss the old BBS days"),
      G("NULLBYTE", "this IS the old bbs days"),
      G("patchbay", "syslog is screaming again, ignore it"),
      G("BlackRelay", "ran a sweep on {sector}. {n} nodes answered, {n} looked back."),
      G("rootkit", "keep your voice down. they read this channel."),
      G("modemmike", "anyone got a spare async card? asking for a friend"),
      G("VHS_girl", "the beacon on {node} sped up. 61 seconds. count it."),
      G("irq0", "signal echo on trunk B-{n}. hearing ourselves twice."),
      G("koma", "my 28.8 is absolutely chad today"),
      G("coldboot", "route around the damage, people. always route around."),
      G("patchbay", "who is SYN flooding the south gate. own up."),
      G("NULLBYTE", "carrier or it didn't happen"),
      G("rootkit", "grep the wire. the wire greps back"),
      G("SYNTH", "ping {node} for me? my traceroute keeps dying"),
      G("deadlink", "brb. mom needs the phone line"),
      G("modemmike", "tie up the line one more time and my sister screams"),
      G("VHS_girl", "ping of death? more like ping of mild inconvenience"),
      G("BlackRelay", "anyone got working WARDEN reports on {node}?"),
      G("irq0", "packet loss vibes tonight. strong ones."),
      G("koma", "lol who unplugs {node} every night"),
      G("Ghost_404", "packets in, packets out. simplest explanation: the grid dreams."),
      G("coldboot", "telnet me softly"),
      G("patchbay", "ftp into my heart, 450 timeout"),
      G("NULLBYTE", "chmod 777 everything. cowards."),
      G("rootkit", "./me sips jolt cola"),
      G("SYNTH", "saw someone kerberoses the wrong port. rookie."),
      G("BlackRelay", "the net is alive tonight. keep your scripts short."),
      G("Grazhdanka", "anyone seen my dialer module? riiight:)"),
      G("Grazhdanka", "morning begins not with coffee, but with routing. riiight:)"),
      G("Grazhdanka", "a bit light on packets, hmm? riiight:)"),
      G("Grazhdanka", "you're poking the wrong port, comrade. riiight:)"),
      G("Gabedan", "my box overheated — poured beer into the modem's coolant tank. now it hums cheerfully."),
      G("Gabedan", "beer for breakfast is fine if you've been online since 6 am."),
      G("Gabedan", "someone asked about honey beer. at 14.4 baud you only get the watered-down kind."),
      G("Gabedan", "dropped my cable end into a pint — speed went up, warranty went down."),
      G("AlexMurphy", "the street is no place for a walk. the net, even less so."),
      G("AlexMurphy", "i have thirty seconds to fix this port. you have thirty to reply."),
      G("AlexMurphy", "stay calm, zombies don't bite. i, however, bite plenty."),
      G("AlexMurphy", "someone asking about my old indicator? still glowing. still legal."),
      G("Comrakoff", "anyone kept schematics for the 1200 baud fax-modem?"),
      G("Comrakoff", "in my day we diagnosed with a screwdriver. and online."),
      G("Nk", "…"),
      G("ArkadyParovozov", "has anyone read the maid-café visual novel? dialogue beats our flood, honestly."),
      G("ArkadyParovozov", "rewatched episode eight of a slice-of-life. better than any manual."),
      G("ArkadyParovozov", "if a visual novel doesn't make you cry, you haven't finished it."),
      G("Pterich", "exactly, pterich. keep that cable wider."),
      G("Pterich", "has anyone seen my magnetic tape quotas? didn't find them in the mail."),
      G("Shisoika", "nya nya nya"),
      G("Shisoika", "brought twenty blank discs from the post with stickers. selling cheap."),
      G("LukeKey", "hasn't cleaned this channel in ages. dust by weight."),
      G("LukeKey", "don't poke the kernel. it's empty. very empty."),
      G("Vino", "know where the best byte is? the french riviera!"),
      G("Vino", "your lines are all grey here. in marseille the wires are gold."),
      G("Vino", "on french hosts even the shell smells like coffee and croissants."),
    ],
  },
  OPERATORS: {
    nicks: ["operator_17", "operator_04", "ops_dana", "nightshift", "operator_31", "ctrl_alt"],
    msgs: [
      G("operator_17", "sector scan of {sector} complete. nothing new."),
      G("ops_dana", "rotating access keys at 0400. expect brief drops."),
      G("nightshift", "please stop pinging SEC-C01. it is restricted for a reason."),
      G("operator_04", "uptime check, report in"),
      G("ctrl_alt", "here."),
      G("operator_31", "routing table updated for western relays. flush your caches."),
      G("ops_dana", "someone left a port open on {node}. closed it. you're welcome."),
      G("nightshift", "quiet shift tonight"),
      G("operator_17", "if you see UNKNOWN status, do not probe. log it and move on."),
      G("operator_31", "backup relay W06 still dark. parts on order."),
      G("ctrl_alt", "integrity audit passed on the south mirrors. carried on."),
      G("operator_04", "reminder: sessions over {n} hops are throttled. policy."),
      G("nightshift", "corporate ran a scanner sweep an hour ago. heads up."),
      G("ops_dana", "the deep sector is not haunted. it is unshielded. same thing."),
    ],
  },
  MARKET: {
    nicks: ["deadlink", "fuzzbar", "tallyman", "tapeworm", "ledger", "junkjockey"],
    msgs: [
      G("deadlink", "looking for an old access key. paying well."),
      G("fuzzbar", "WTB relay time on {node}, 30 min window, off-peak"),
      G("tallyman", "selling clean shell accounts, eastern grid only"),
      G("tapeworm", "trade: CP/M era archive dump for a core map fragment"),
      G("ledger", "prices up since the core lockdown. supply and demand."),
      G("junkjockey", "who is buying spare baud? i have spare baud."),
      G("tallyman", "offering decryption cycles. discrete. no questions."),
      G("fuzzbar", "dead-host coordinates for sale. best offer."),
      G("ledger", "WTB: working 14.4 modem. must hum, not scream."),
      G("tapeworm", "archive tape lot, unlabeled, as-is. you know what it is."),
      G("junkjockey", "no refunds on south sector routes. i mean it."),
      G("deadlink", "still looking. key must predate the lockdown."),
    ],
  },
  CORPORATE: {
    nicks: ["CORP-NOTICE", "SYSTEM", "HR_DAEMON"],
    msgs: [
      G("CORP-NOTICE", "NOTICE: scheduled maintenance on EASTERN trunk, 0200-0400."),
      G("CORP-NOTICE", "REMINDER: unauthorized scanning of SEC-04 violates policy 7-C."),
      G("SYSTEM", "packet loss reports in WESTERN NETWORK are under review."),
      G("CORP-NOTICE", "ALL CLEAR: integrity audit concluded. resume normal traffic."),
      G("HR_DAEMON", "your compliance session expires in 30 days. renew early."),
      G("CORP-NOTICE", "NOTICE: probing the DEEP NETWORK is discouraged. equipment failure likely."),
      G("SYSTEM", "bandwidth advisory: peak hours now enforced grid-wide."),
      G("CORP-NOTICE", "REMINDER: Intercell Synthetics is an equal opportunity network."),
      G("SYSTEM", "node RLY-E05 outage acknowledged. technician dispatched."),
      G("HR_DAEMON", "welfare announcement: caffeine rations increased 4%."),
    ],
  },
  PRIVATE: {
    nicks: ["Ghost_404", "patchbay", "lilith_x", "coldboot", "sable", "msm_ghost"],
    msgs: [
      G("Ghost_404", "you saw it too then"),
      G("patchbay", "not here. switch to channel 44."),
      G("lilith_x", "the key you asked about. check the north archive node."),
      G("sable", "delete this after reading"),
      G("coldboot", "meet at the usual relay. midnight. bring the map."),
      G("msm_ghost", "stop broadcasting on global. they listen."),
      G("lilith_x", "it is quiet. too quiet."),
      G("sable", "the reversed packets spell something. working on it."),
      G("patchbay", "i never sent that message. forget you saw it."),
      G("msm_ghost", "count the beacons tonight. tell me what you get."),
    ],
  },
};

/* 用于回复操作员消息的预设网络俚语，{op} 表示操作员代号。 */
export const REPLY_POOL: { ch: ChannelId | "ANY"; nick: string; text: string }[] = [
  { ch: "ANY", nick: "irq0", text: "ack" },
  { ch: "ANY", nick: "koma", text: "ack ack" },
  { ch: "ANY", nick: "coldboot", text: "lol" },
  { ch: "ANY", nick: "NULLBYTE", text: "+1 {op}" },
  { ch: "ANY", nick: "patchbay", text: "syn? ack. we good, {op}" },
  { ch: "ANY", nick: "koma", text: "loud and clear" },
  { ch: "ANY", nick: "modemmike", text: "10-4, {op}" },
  { ch: "ANY", nick: "VHS_girl", text: "roger wilco" },
  { ch: "ANY", nick: "SYNTH", text: "copy that, {op}" },
  { ch: "ANY", nick: "BlackRelay", text: "fax. no printer." },
  { ch: "ANY", nick: "irq0", text: "big if true" },
  { ch: "ANY", nick: "koma", text: "kek" },
  { ch: "ANY", nick: "rootkit", text: "word. keep it off the trunk." },
  { ch: "ANY", nick: "coldboot", text: "smooth. like fresh 56k." },
  { ch: "ANY", nick: "patchbay", text: "you transmitting from a toaster, {op}?" },
  { ch: "ANY", nick: "modemmike", text: "say again, line noisy" },
  { ch: "ANY", nick: "VHS_girl", text: "bet. ping me later." },
  { ch: "ANY", nick: "NULLBYTE", text: "lol {op}. classic." },
  { ch: "ANY", nick: "SYNTH", text: "affirmative" },
  { ch: "ANY", nick: "deadlink", text: "sure. sure. i believe you." },
  { ch: "ANY", nick: "BlackRelay", text: "and then?" },
  { ch: "ANY", nick: "koma", text: "skill issue, honestly" },
  { ch: "ANY", nick: "irq0", text: "./me nods solemnly" },
  { ch: "ANY", nick: "coldboot", text: "spill the hex, {op}" },
  { ch: "GLOBAL", nick: "Ghost_404", text: "careful what you say here" },
  { ch: "GLOBAL", nick: "rootkit", text: "they read this channel, {op}. just fyi." },
  { ch: "OPERATORS", nick: "operator_17", text: "received." },
  { ch: "OPERATORS", nick: "ops_dana", text: "logged. carry on." },
  { ch: "OPERATORS", nick: "nightshift", text: "noted. watching the board." },
  { ch: "PRIVATE", nick: "sable", text: "..." },
  { ch: "PRIVATE", nick: "msm_ghost", text: "wrong channel. you sure about that?" },
  { ch: "PRIVATE", nick: "patchbay", text: "keep private private, {op}." },
  { ch: "MARKET", nick: "ledger", text: "price check? make an offer." },
  { ch: "MARKET", nick: "tallyman", text: "interesting. paying in what?" },
  { ch: "CORPORATE", nick: "SYSTEM", text: "your input has been routed to the void. reference #0042." },
];

/* 操作员打招呼时触发的一组问候回复。 */
export const GREETING_POOL: { nick: string; text: string }[] = [
  { nick: "koma", text: "o7" },
  { nick: "coldboot", text: "yo, {op}" },
  { nick: "VHS_girl", text: "welcome to the wire, {op}" },
  { nick: "irq0", text: "o7 o7" },
  { nick: "modemmike", text: "hey hey. fresh carrier smell." },
  { nick: "patchbay", text: "\\o" },
  { nick: "NULLBYTE", text: "sup {op}" },
  { nick: "SYNTH", text: "greetings, operator. you are packet #53409 today." },
  { nick: "BlackRelay", text: "ahoy" },
  { nick: "deadlink", text: "wb. we counted the silence while you were gone." },
  { nick: "Ghost_404", text: "oh. it talks. hi." },
  { nick: "rootkit", text: "heya {op}. lurk moar, then type." },
  { nick: "lilith_x", text: "hello hello" },
  { nick: "operator_17", text: "welcome aboard, {op}. mind the restricted zones." },
];

export interface AmbientEvent {
  text: string;
  kind: "info" | "warn" | "good" | "odd";
}

export const AMBIENT_POOL: AmbientEvent[] = [
  { text: "packet storm detected in {sector} — routing around", kind: "warn" },
  { text: "integrity checksum verified for {sector}", kind: "good" },
  { text: "unregistered beacon heard in DEEP NETWORK", kind: "odd" },
  { text: "key rotation complete on security nodes", kind: "info" },
  { text: "signal echo on backbone trunk B-{n}", kind: "odd" },
  { text: "corporate scanner sweep in progress — keep sessions clean", kind: "warn" },
  { text: "heap compaction finished on {node}", kind: "info" },
  { text: "mirror sync complete: {sector} archives", kind: "good" },
  { text: "dial-in line {n} reported noise — muted", kind: "info" },
  { text: "uplink drift corrected (+{n}ms)", kind: "info" },
  { text: "unknown probe count rising in {sector}", kind: "warn" },
  { text: "the grid hums. everything nominal.", kind: "info" },
];
