import type { NetLink, NetNode, RegionData, Sector } from "./network";

/* ================================================================== */
/* WEST1 — NORTH AMERICA                                               */
/* ================================================================== */

const W1_SECTORS: Sector[] = [
  {
    id: "w1_arct", code: "SEC-A0", name: "ARCTIC ECHO", status: "DEGRADED",
    x: 20, y: 20, w: 240, h: 150,
    desc: "Listening posts above the circle. Signals arrive pre-digested by the aurora.",
  },
  {
    id: "w1_north", code: "SEC-N1", name: "NORTHLINE", status: "ONLINE",
    x: 270, y: 40, w: 490, h: 150,
    desc: "Canadian backbone mesh. Polite, reliable, slightly frozen.",
  },
  {
    id: "w1_pac", code: "SEC-P2", name: "PACIFIC EXCHANGE", status: "ONLINE",
    x: 280, y: 240, w: 190, h: 240,
    desc: "West coast access belt. Warez boards and university shells.",
  },
  {
    id: "w1_mid", code: "SEC-C3", name: "MIDLAND EXCHANGE", status: "CONTESTED",
    x: 530, y: 210, w: 280, h: 180,
    desc: "Three carriers claim this grid. WARDEN signatures on every trunk. Route with care.",
  },
  {
    id: "w1_atl", code: "SEC-A4", name: "ATLANTIC GRID", status: "ONLINE",
    x: 860, y: 180, w: 260, h: 270,
    desc: "Eastern seaboard trunk. Financial mirrors and a cable landing with no off switch.",
  },
  {
    id: "w1_gulf", code: "SEC-G5", name: "GULF RELAY", status: "ONLINE",
    x: 470, y: 430, w: 380, h: 190,
    desc: "Southern relay chain. Storm-hardened, slacker tolerated.",
  },
];

const W1_NODES: NetNode[] = [
  /* arctic echo */
  { id: "w1a_rly", code: "RLY-X01", type: "RELAY", sector: "w1_arct", x: 90, y: 70, status: "UNKNOWN", desc: "Ionospheric relay. Answers in 61-second bursts." },
  { id: "w1a_res", code: "RES-X02", type: "RESEARCH", sector: "w1_arct", x: 190, y: 110, status: "UNKNOWN", desc: "Auroral research array. Echoes telemetry from '88." },
  { id: "w1a_acc", code: "ACC-X03", type: "ACCESS", sector: "w1_arct", x: 130, y: 140, status: "OFFLINE", desc: "Ice station uplink. Mast collapsed last winter." },

  /* northern grid */
  { id: "w1n_acc", code: "ACC-N01", type: "ACCESS", sector: "w1_north", x: 330, y: 90, status: "ONLINE", desc: "Vancouver dial-in pool. Clean lines, 64 ports." },
  { id: "w1n_rly", code: "RLY-N02", type: "RELAY", sector: "w1_north", x: 470, y: 120, status: "ONLINE", desc: "Prairie relay on the Winnipeg spur." },
  { id: "w1n_dsv", code: "DSV-N03", type: "DATA SERVER", sector: "w1_north", x: 560, y: 75, status: "ONLINE", desc: "Hydro utility data vault. Meter archives since '71." },
  { id: "w1n_rly2", code: "RLY-N04", type: "RELAY", sector: "w1_north", x: 690, y: 140, status: "ONLINE", desc: "Hudson Bay relay. Weatherproofed and lonely." },
  { id: "w1n_arc", code: "ARC-N05", type: "ARCHIVE", sector: "w1_north", x: 390, y: 150, status: "OFFLINE", desc: "Government tape archive. Budget cut in '93." },

  /* pac-net */
  { id: "w1p_acc", code: "ACC-P01", type: "ACCESS", sector: "w1_pac", x: 316, y: 308, status: "ONLINE", desc: "Bay area access concentrator. 96 lines, all screeching." },
  { id: "w1p_dsv", code: "DSV-P02", type: "DATA SERVER", sector: "w1_pac", x: 395, y: 340, status: "ONLINE", desc: "Intercell Synthetics west records host. Guest port 23 open." },
  { id: "w1p_res", code: "RES-P03", type: "RESEARCH", sector: "w1_pac", x: 320, y: 405, status: "ONLINE", desc: "Seismic lab node. Uploads tremor logs hourly." },
  { id: "w1p_prv", code: "PRV-P04", type: "PRIVATE", sector: "w1_pac", x: 420, y: 418, status: "ONLINE", desc: "Warez BBS. Registration improbable, leech ratio enforced." },
  { id: "w1p_rly", code: "RLY-P05", type: "RELAY", sector: "w1_pac", x: 350, y: 462, status: "OFFLINE", desc: "Coastal relay. Salt corrosion, carrier dead." },
  { id: "w1p_crp2", code: "CRP-P06", type: "CORPORATE", sector: "w1_pac", x: 318, y: 362, status: "ONLINE", desc: "Takamuri Global freight desk. Indexes every crate that moves west." },

  /* central grid (contested) */
  { id: "w1m_rly", code: "RLY-C01", type: "RELAY", sector: "w1_mid", x: 575, y: 255, status: "ONLINE", desc: "Denver exchange relay. Three owners claim it." },
  { id: "w1m_sec", code: "SEC-C02", type: "SECURITY", sector: "w1_mid", x: 700, y: 300, status: "RESTRICTED", desc: "Anonymous security appliance. Vendor plate filed off." },
  { id: "w1m_dsv", code: "DSV-C03", type: "DATA SERVER", sector: "w1_mid", x: 640, y: 350, status: "ONLINE", desc: "Grain commodity server. Suspiciously fast." },
  { id: "w1m_prv", code: "PRV-C04", type: "PRIVATE", sector: "w1_mid", x: 765, y: 250, status: "UNKNOWN", desc: "CB radio gateway somebody digitized at 3am." },
  { id: "w1m_crp", code: "CRP-C06", type: "CORPORATE", sector: "w1_mid", x: 568, y: 330, status: "ONLINE", desc: "Intercell clearing host. Routes the shell transfers nobody signs for." },

  /* atlantic grid */
  { id: "w1e_acc", code: "ACC-A01", type: "ACCESS", sector: "w1_atl", x: 900, y: 230, status: "ONLINE", desc: "Metro access pool. Expect busy signals." },
  { id: "w1e_crp", code: "CRP-A02", type: "CORPORATE", sector: "w1_atl", x: 1010, y: 265, status: "ONLINE", desc: "Agogee Heights east tower. Logs everything." },
  { id: "w1e_dsv", code: "DSV-A03", type: "DATA SERVER", sector: "w1_atl", x: 935, y: 330, status: "ONLINE", desc: "Financial records mirror. Batch window 0200-0400." },
  { id: "w1e_rly", code: "RLY-A04", type: "RELAY", sector: "w1_atl", x: 1065, y: 385, status: "ONLINE", desc: "Cable landing relay. The ocean hums through it." },
  { id: "w1e_sec", code: "SEC-A05", type: "SECURITY", sector: "w1_atl", x: 890, y: 415, status: "ONLINE", desc: "Metro watchdog. Humorless by specification." },

  /* gulfnet */
  { id: "w1g_acc", code: "ACC-G01", type: "ACCESS", sector: "w1_gulf", x: 520, y: 470, status: "ONLINE", desc: "Austin dial pool. Slackers welcome." },
  { id: "w1g_dsv", code: "DSV-G02", type: "DATA SERVER", sector: "w1_gulf", x: 645, y: 500, status: "ONLINE", desc: "Oil & gas telemetry vault. Pressure logs by the minute." },
  { id: "w1g_rly", code: "RLY-G03", type: "RELAY", sector: "w1_gulf", x: 765, y: 460, status: "ONLINE", desc: "Gulf coastal relay. Hurricane-rated enclosure." },
  { id: "w1g_prv", code: "PRV-G04", type: "PRIVATE", sector: "w1_gulf", x: 560, y: 565, status: "OFFLINE", desc: "Shrimp boat packet node. It sank." },
  { id: "w1g_prv2", code: "PRV-G05", type: "PRIVATE", sector: "w1_gulf", x: 710, y: 575, status: "RESTRICTED", desc: "Military reservation gateway. Test range traffic only." },
];

const W1_LINKS: NetLink[] = [
  /* arctic */
  { a: "w1a_rly", b: "w1a_res", state: "weak" },
  { a: "w1a_rly", b: "w1a_acc", state: "down" },
  /* north */
  { a: "w1n_acc", b: "w1n_rly", state: "stable" },
  { a: "w1n_rly", b: "w1n_dsv", state: "stable" },
  { a: "w1n_rly", b: "w1n_rly2", state: "stable" },
  { a: "w1n_acc", b: "w1n_arc", state: "weak" },
  { a: "w1n_arc", b: "w1n_rly", state: "weak" },
  /* pac */
  { a: "w1p_acc", b: "w1p_dsv", state: "stable" },
  { a: "w1p_acc", b: "w1p_res", state: "stable" },
  { a: "w1p_dsv", b: "w1p_prv", state: "weak" },
  { a: "w1p_res", b: "w1p_rly", state: "down" },
  { a: "w1p_prv", b: "w1p_rly", state: "weak" },
  { a: "w1p_res", b: "w1p_crp2", state: "stable" },
  { a: "w1p_crp2", b: "w1p_dsv", state: "weak" },
  /* central */
  { a: "w1m_rly", b: "w1m_sec", state: "weak" },
  { a: "w1m_rly", b: "w1m_dsv", state: "stable" },
  { a: "w1m_sec", b: "w1m_prv", state: "weak" },
  { a: "w1m_dsv", b: "w1m_prv", state: "weak" },
  { a: "w1m_rly", b: "w1m_crp", state: "stable" },
  { a: "w1m_crp", b: "w1m_dsv", state: "weak" },
  /* atlantic */
  { a: "w1e_acc", b: "w1e_crp", state: "stable" },
  { a: "w1e_acc", b: "w1e_dsv", state: "stable" },
  { a: "w1e_crp", b: "w1e_rly", state: "stable" },
  { a: "w1e_dsv", b: "w1e_sec", state: "stable" },
  { a: "w1e_rly", b: "w1e_sec", state: "weak" },
  /* gulf */
  { a: "w1g_acc", b: "w1g_dsv", state: "stable" },
  { a: "w1g_dsv", b: "w1g_rly", state: "stable" },
  { a: "w1g_acc", b: "w1g_prv", state: "down" },
  { a: "w1g_dsv", b: "w1g_prv2", state: "weak" },
  /* backbone */
  { a: "w1a_rly", b: "w1n_rly2", state: "weak", backbone: true },
  { a: "w1n_acc", b: "w1p_acc", state: "stable", backbone: true },
  { a: "w1n_dsv", b: "w1m_rly", state: "stable", backbone: true },
  { a: "w1n_rly2", b: "w1e_acc", state: "stable", backbone: true },
  { a: "w1m_sec", b: "w1e_dsv", state: "weak", backbone: true },
  { a: "w1p_acc", b: "w1g_acc", state: "stable", backbone: true },
  { a: "w1m_dsv", b: "w1g_dsv", state: "stable", backbone: true },
  { a: "w1e_rly", b: "w1g_rly", state: "weak", backbone: true },
  { a: "w1p_rly", b: "w1g_prv", state: "down", backbone: true },
];

/* ================================================================== */
/* WETLOW — SOUTH AMERICA                                              */
/* ================================================================== */

const WL_SECTORS: Sector[] = [
  {
    id: "wl_eq", code: "SEC-Q0", name: "EQUATOR NET", status: "ONLINE",
    x: 30, y: 40, w: 390, h: 150,
    desc: "Coastal access pools and the equatorial trunk. Humid racks, hot packets.",
  },
  {
    id: "wl_amz", code: "SEC-M1", name: "AMAZON CIRCUIT", status: "CONTESTED",
    x: 420, y: 120, w: 480, h: 210,
    desc: "River-borne relays and a logging-concession security grid. Ownership changes weekly.",
  },
  {
    id: "wl_and", code: "SEC-A2", name: "ANDES GRID", status: "ONLINE",
    x: 90, y: 190, w: 240, h: 280,
    desc: "High-altitude relay spine. Thin air, thick latency, excellent observatories.",
  },
  {
    id: "wl_atl", code: "SEC-S3", name: "ATLANTIC SHELF", status: "ONLINE",
    x: 850, y: 250, w: 300, h: 210,
    desc: "Port authority hosts and shelf cable landings. Bureaucratic but stable.",
  },
  {
    id: "wl_pam", code: "SEC-P4", name: "PAMPA RELAY", status: "ONLINE",
    x: 330, y: 400, w: 390, h: 200,
    desc: "Grassland backbone. Cattle futures and very passionate uptime.",
  },
  {
    id: "wl_cape", code: "SEC-C5", name: "SOUTH CAPE", status: "DEGRADED",
    x: 240, y: 560, w: 320, h: 160,
    desc: "The far end of the wire. Signals bend wrong here, and nobody knows why.",
  },
];

const WL_NODES: NetNode[] = [
  /* equator */
  { id: "wlq_acc", code: "ACC-Q01", type: "ACCESS", sector: "wl_eq", x: 120, y: 90, status: "ONLINE", desc: "Caracas access pool. Warm modems, open doors." },
  { id: "wlq_rly", code: "RLY-Q02", type: "RELAY", sector: "wl_eq", x: 250, y: 120, status: "ONLINE", desc: "Equatorial trunk relay. Roasts at noon." },
  { id: "wlq_dsv", code: "DSV-Q03", type: "DATA SERVER", sector: "wl_eq", x: 355, y: 80, status: "ONLINE", desc: "Coffee exchange records server. Definitely just coffee." },

  /* amazon mesh (contested) */
  { id: "wlz_rly", code: "RLY-M01", type: "RELAY", sector: "wl_amz", x: 500, y: 180, status: "ONLINE", desc: "River float relay, Manaus reach. Powered questionably." },
  { id: "wlz_arc", code: "ARC-M02", type: "ARCHIVE", sector: "wl_amz", x: 640, y: 245, status: "UNKNOWN", desc: "Mission archive. Rumored to hold pre-network logs." },
  { id: "wlz_prv", code: "PRV-M03", type: "PRIVATE", sector: "wl_amz", x: 765, y: 160, status: "ONLINE", desc: "Jungle host. Photosynthesis-powered (unverified)." },
  { id: "wlz_sec", code: "SEC-M04", type: "SECURITY", sector: "wl_amz", x: 840, y: 285, status: "RESTRICTED", desc: "Logging concession security grid. Do not probe twice." },

  /* andes */
  { id: "wld_rly", code: "RLY-A01", type: "RELAY", sector: "wl_and", x: 150, y: 240, status: "ONLINE", desc: "Altiplano relay. Oxygen optional, uptime not." },
  { id: "wld_res", code: "RES-A02", type: "RESEARCH", sector: "wl_and", x: 255, y: 320, status: "ONLINE", desc: "Observatory node. Nightly sky dumps, 400MB of dark." },
  { id: "wld_acc", code: "ACC-A03", type: "ACCESS", sector: "wl_and", x: 140, y: 395, status: "ONLINE", desc: "Valparaiso dial pool. Funicular of packets." },

  /* atlantic shelf */
  { id: "wls_crp", code: "CRP-S01", type: "CORPORATE", sector: "wl_atl", x: 920, y: 300, status: "ONLINE", desc: "Port authority host. Stamped, signed, mirrored." },
  { id: "wls_rly", code: "RLY-S02", type: "RELAY", sector: "wl_atl", x: 1045, y: 345, status: "ONLINE", desc: "Shelf cable relay. Barnacled but swift." },
  { id: "wls_dsv", code: "DSV-S03", type: "DATA SERVER", sector: "wl_atl", x: 955, y: 415, status: "ONLINE", desc: "Shipping ledger mirror. Every crate accounted." },

  /* pampa */
  { id: "wlp_acc", code: "ACC-PA01", type: "ACCESS", sector: "wl_pam", x: 400, y: 450, status: "ONLINE", desc: "Buenos Aires access. Passionate about uptime." },
  { id: "wlp_rly", code: "RLY-PA02", type: "RELAY", sector: "wl_pam", x: 545, y: 480, status: "ONLINE", desc: "Pampeano backbone relay. Grass-fed packets." },
  { id: "wlp_dsv", code: "DSV-PA03", type: "DATA SERVER", sector: "wl_pam", x: 665, y: 430, status: "ONLINE", desc: "Cattle futures vault. Volatile." },
  { id: "wlp_prv", code: "PRV-PA04", type: "PRIVATE", sector: "wl_pam", x: 460, y: 558, status: "OFFLINE", desc: "Estancia node. Generator out of diesel." },

  /* south cape */
  { id: "wlc_rly", code: "RLY-CA01", type: "RELAY", sector: "wl_cape", x: 320, y: 610, status: "UNKNOWN", desc: "Cape relay. Signal bends wrong here. Count the echoes." },
  { id: "wlc_arc", code: "ARC-CA02", type: "ARCHIVE", sector: "wl_cape", x: 465, y: 650, status: "OFFLINE", desc: "Whaling records archive. Waterlogged in both senses." },
  { id: "wlc_res", code: "RES-CA03", type: "RESEARCH", sector: "wl_cape", x: 510, y: 590, status: "UNKNOWN", desc: "Penguin census beacon. Someone taught it to ping." },
];

const WL_LINKS: NetLink[] = [
  /* equator */
  { a: "wlq_acc", b: "wlq_rly", state: "stable" },
  { a: "wlq_rly", b: "wlq_dsv", state: "stable" },
  /* amazon */
  { a: "wlz_rly", b: "wlz_arc", state: "weak" },
  { a: "wlz_rly", b: "wlz_prv", state: "weak" },
  { a: "wlz_prv", b: "wlz_sec", state: "weak" },
  { a: "wlz_arc", b: "wlz_sec", state: "down" },
  /* andes */
  { a: "wld_rly", b: "wld_res", state: "stable" },
  { a: "wld_res", b: "wld_acc", state: "stable" },
  { a: "wld_rly", b: "wld_acc", state: "stable" },
  /* shelf */
  { a: "wls_crp", b: "wls_rly", state: "stable" },
  { a: "wls_crp", b: "wls_dsv", state: "stable" },
  { a: "wls_rly", b: "wls_dsv", state: "stable" },
  /* pampa */
  { a: "wlp_acc", b: "wlp_rly", state: "stable" },
  { a: "wlp_rly", b: "wlp_dsv", state: "stable" },
  { a: "wlp_acc", b: "wlp_prv", state: "down" },
  { a: "wlp_dsv", b: "wlp_prv", state: "weak" },
  /* cape */
  { a: "wlc_rly", b: "wlc_arc", state: "weak" },
  { a: "wlc_arc", b: "wlc_res", state: "weak" },
  /* backbone */
  { a: "wlq_rly", b: "wlz_rly", state: "stable", backbone: true },
  { a: "wlq_acc", b: "wld_rly", state: "stable", backbone: true },
  { a: "wlz_sec", b: "wls_crp", state: "weak", backbone: true },
  { a: "wlz_prv", b: "wlp_dsv", state: "weak", backbone: true },
  { a: "wld_acc", b: "wlp_acc", state: "stable", backbone: true },
  { a: "wlp_dsv", b: "wls_dsv", state: "stable", backbone: true },
  { a: "wlp_rly", b: "wlc_rly", state: "weak", backbone: true },
  { a: "wld_acc", b: "wlc_arc", state: "down", backbone: true },
];

/* ================================================================== */

export const REGION_DATA: Record<string, RegionData> = {
  west1: { sectors: W1_SECTORS, nodes: W1_NODES, links: W1_LINKS },
  wetlow: { sectors: WL_SECTORS, nodes: WL_NODES, links: WL_LINKS },
};

export const ALL_NODES: NetNode[] = [...W1_NODES, ...WL_NODES];

export const regionNodeById = (nodes: NetNode[], id: string) => nodes.find((n) => n.id === id);
export const regionSectorById = (sectors: Sector[], id: string) => sectors.find((s) => s.id === id);
