import type { NetLink, NetNode, RegionData, Sector } from "./network";

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
  /* 北极区域节点 */
  { id: "w1a_rly", code: "RLY-X01", type: "RELAY", sector: "w1_arct", x: 90, y: 70, status: "UNKNOWN", desc: "Ionospheric relay. Answers in 61-second bursts." },
  { id: "w1a_res", code: "RES-X02", type: "RESEARCH", sector: "w1_arct", x: 190, y: 110, status: "UNKNOWN", desc: "Auroral research array. Echoes telemetry from '88." },
  { id: "w1a_acc", code: "ACC-X03", type: "ACCESS", sector: "w1_arct", x: 130, y: 140, status: "OFFLINE", desc: "Ice station uplink. Mast collapsed last winter." },

  /* 北方网络 */
  { id: "w1n_acc", code: "ACC-N01", type: "ACCESS", sector: "w1_north", x: 330, y: 90, status: "ONLINE", desc: "Vancouver dial-in pool. Clean lines, 64 ports." },
  { id: "w1n_rly", code: "RLY-N02", type: "RELAY", sector: "w1_north", x: 470, y: 120, status: "ONLINE", desc: "Prairie relay on the Winnipeg spur." },
  { id: "w1n_dsv", code: "DSV-N03", type: "DATA SERVER", sector: "w1_north", x: 560, y: 75, status: "ONLINE", desc: "Hydro utility data vault. Meter archives since '71." },
  { id: "w1n_rly2", code: "RLY-N04", type: "RELAY", sector: "w1_north", x: 690, y: 140, status: "ONLINE", desc: "Hudson Bay relay. Weatherproofed and lonely." },
  { id: "w1n_arc", code: "ARC-N05", type: "ARCHIVE", sector: "w1_north", x: 390, y: 150, status: "OFFLINE", desc: "Government tape archive. Budget cut in '93." },

  /* 太平洋交换区 */
  { id: "w1p_acc", code: "ACC-P01", type: "ACCESS", sector: "w1_pac", x: 316, y: 308, status: "ONLINE", desc: "Bay area access concentrator. 96 lines, all screeching." },
  { id: "w1p_dsv", code: "DSV-P02", type: "DATA SERVER", sector: "w1_pac", x: 395, y: 340, status: "ONLINE", desc: "Intercell Synthetics west records host. Guest port 23 open." },
  { id: "w1p_sec", code: "SEC-P03", type: "SECURITY", sector: "w1_pac", x: 302, y: 424, status: "ONLINE", desc: "External firewall appliance fronting the Takamuri freight desk. Breach it and CRP-P06 opens." },
  { id: "w1p_prv", code: "PRV-P04", type: "PRIVATE", sector: "w1_pac", x: 420, y: 418, status: "ONLINE", desc: "Warez BBS. Registration improbable, leech ratio enforced." },
  { id: "w1p_rly", code: "RLY-P05", type: "RELAY", sector: "w1_pac", x: 350, y: 462, status: "OFFLINE", desc: "Coastal relay. Salt corrosion, carrier dead." },
  { id: "w1p_crp2", code: "CRP-P06", type: "CORPORATE", sector: "w1_pac", x: 318, y: 362, status: "ONLINE", desc: "Takamuri Global freight desk. Indexes every crate that moves west." },

  /* 中央交换区（冲突区） */
  { id: "w1m_rly", code: "RLY-C01", type: "RELAY", sector: "w1_mid", x: 575, y: 255, status: "ONLINE", desc: "Denver exchange relay. Three owners claim it." },
  { id: "w1m_sec", code: "SEC-C02", type: "SECURITY", sector: "w1_mid", x: 700, y: 300, status: "RESTRICTED", desc: "Anonymous security appliance. Vendor plate filed off." },
  { id: "w1m_dsv", code: "DSV-C03", type: "DATA SERVER", sector: "w1_mid", x: 640, y: 350, status: "ONLINE", desc: "Grain commodity server. Suspiciously fast." },
  { id: "w1m_prv", code: "PRV-C04", type: "PRIVATE", sector: "w1_mid", x: 765, y: 250, status: "UNKNOWN", desc: "CB radio gateway somebody digitized at 3am." },
  { id: "w1m_crp", code: "CRP-C06", type: "CORPORATE", sector: "w1_mid", x: 568, y: 330, status: "ONLINE", desc: "Intercell clearing host. Routes the shell transfers nobody signs for." },

  /* 大西洋网络 */
  { id: "w1e_acc", code: "ACC-A01", type: "ACCESS", sector: "w1_atl", x: 900, y: 230, status: "ONLINE", desc: "Metro access pool. Expect busy signals." },
  { id: "w1e_crp", code: "CRP-A02", type: "CORPORATE", sector: "w1_atl", x: 1010, y: 265, status: "ONLINE", desc: "Agogee Heights east tower. Logs everything." },
  { id: "w1e_dsv", code: "DSV-A03", type: "DATA SERVER", sector: "w1_atl", x: 935, y: 330, status: "ONLINE", desc: "Financial records mirror. Batch window 0200-0400." },
  { id: "w1e_rly", code: "RLY-A04", type: "RELAY", sector: "w1_atl", x: 1065, y: 385, status: "ONLINE", desc: "Cable landing relay. The ocean hums through it." },
  { id: "w1e_sec", code: "SEC-A05", type: "SECURITY", sector: "w1_atl", x: 890, y: 415, status: "ONLINE", desc: "Metro watchdog. Humorless by specification." },

  /* 海湾中继区 */
  { id: "w1g_acc", code: "ACC-G01", type: "ACCESS", sector: "w1_gulf", x: 520, y: 470, status: "ONLINE", desc: "Austin dial pool. Slackers welcome." },
  { id: "w1g_dsv", code: "DSV-G02", type: "DATA SERVER", sector: "w1_gulf", x: 645, y: 500, status: "ONLINE", desc: "Oil & gas telemetry vault. Pressure logs by the minute." },
  { id: "w1g_rly", code: "RLY-G03", type: "RELAY", sector: "w1_gulf", x: 765, y: 460, status: "ONLINE", desc: "Gulf coastal relay. Hurricane-rated enclosure." },
  { id: "w1g_prv", code: "PRV-G04", type: "PRIVATE", sector: "w1_gulf", x: 560, y: 565, status: "OFFLINE", desc: "Shrimp boat packet node. It sank." },
  { id: "w1g_prv2", code: "PRV-G05", type: "PRIVATE", sector: "w1_gulf", x: 710, y: 575, status: "RESTRICTED", desc: "Military reservation gateway. Test range traffic only." },

  /* Gexogen Medical：每个扇区一处诊所节点 */
  { id: "w1a_gex", code: "CRP-X09", type: "CORPORATE", sector: "w1_arct", x: 222, y: 60, status: "ONLINE", desc: "Gexogen polar clinic. Two staff, one surgeon, a very warm server room." },
  { id: "w1n_gex", code: "DSV-N09", type: "DATA SERVER", sector: "w1_north", x: 625, y: 168, status: "ONLINE", desc: "Gexogen regional clinic. Books every transplant slot north of the lakes." },
  { id: "w1p_gex", code: "RES-P09", type: "RESEARCH", sector: "w1_pac", x: 440, y: 300, status: "ONLINE", desc: "Gexogen coastal clinic. Implant fittings by appointment, scoring by algorithm." },
  { id: "w1m_gex", code: "CRP-K09", type: "CORPORATE", sector: "w1_mid", x: 745, y: 355, status: "ONLINE", desc: "Gexogen inland clinic. The only one for six hundred kilometres." },
  { id: "w1e_gex", code: "ARC-A09", type: "ARCHIVE", sector: "w1_atl", x: 1085, y: 212, status: "ONLINE", desc: "Gexogen central patient archive. Every clinic on the grid reports here." },
  { id: "w1g_gex", code: "SEC-G09", type: "SECURITY", sector: "w1_gulf", x: 818, y: 540, status: "ONLINE", desc: "Gexogen coastal clinic. Storm season doubles the intake." },

  /* 独立网格：与既有节点互不相连，入口位于 MIDLAND 中部 */
  { id: "w1m_z01", code: "ACC-Z01", type: "ACCESS", sector: "w1_mid", x: 670, y: 270, status: "ONLINE", desc: "Unlisted concentrator. It answers, but not to anything on the public map." },
  { id: "w1n_z02", code: "RLY-Z02", type: "RELAY", sector: "w1_north", x: 720, y: 68, status: "ONLINE", desc: "Shadow relay. Carries traffic that never touches the civic trunks." },
  { id: "w1a_z03", code: "DSV-Z03", type: "DATA SERVER", sector: "w1_arct", x: 50, y: 115, status: "ONLINE", desc: "Cold store on the shadow grid. Indexed in a format nobody publishes." },
  { id: "w1e_z04", code: "SEC-Z04", type: "SECURITY", sector: "w1_atl", x: 1095, y: 330, status: "ONLINE", desc: "Shadow grid watchdog. Logs intrusions to an address that does not resolve." },
  { id: "w1g_z05", code: "CRP-Z05", type: "CORPORATE", sector: "w1_gulf", x: 490, y: 545, status: "ONLINE", desc: "Unregistered corporate host. No letterhead, no filings, excellent uptime." },
];

const W1_LINKS: NetLink[] = [
  /* 北极区域 */
  { a: "w1a_rly", b: "w1a_res", state: "weak" },
  { a: "w1a_rly", b: "w1a_acc", state: "down" },
  /* 北部 */
  { a: "w1n_acc", b: "w1n_rly", state: "stable" },
  { a: "w1n_rly", b: "w1n_dsv", state: "stable" },
  { a: "w1n_rly", b: "w1n_rly2", state: "stable" },
  { a: "w1n_acc", b: "w1n_arc", state: "weak" },
  { a: "w1n_arc", b: "w1n_rly", state: "weak" },
  /* 太平洋区域 */
  { a: "w1p_acc", b: "w1p_dsv", state: "stable" },
  { a: "w1p_dsv", b: "w1p_prv", state: "weak" },
  { a: "w1p_rly", b: "w1p_sec", state: "weak" },
  { a: "w1p_prv", b: "w1p_rly", state: "weak" },
  { a: "w1p_sec", b: "w1p_crp2", state: "stable" },
  { a: "w1p_crp2", b: "w1p_dsv", state: "weak" },
  /* 中央区域 */
  { a: "w1m_rly", b: "w1m_sec", state: "weak" },
  { a: "w1m_rly", b: "w1m_dsv", state: "stable" },
  { a: "w1m_sec", b: "w1m_prv", state: "weak" },
  { a: "w1m_dsv", b: "w1m_prv", state: "weak" },
  { a: "w1m_rly", b: "w1m_crp", state: "stable" },
  { a: "w1m_crp", b: "w1m_dsv", state: "weak" },
  /* 大西洋区域 */
  { a: "w1e_acc", b: "w1e_crp", state: "stable" },
  { a: "w1e_acc", b: "w1e_dsv", state: "stable" },
  { a: "w1e_crp", b: "w1e_rly", state: "stable" },
  { a: "w1e_dsv", b: "w1e_sec", state: "stable" },
  { a: "w1e_rly", b: "w1e_sec", state: "weak" },
  /* 海湾区域 */
  { a: "w1g_acc", b: "w1g_dsv", state: "stable" },
  { a: "w1g_dsv", b: "w1g_rly", state: "stable" },
  { a: "w1g_acc", b: "w1g_prv", state: "down" },
  { a: "w1g_dsv", b: "w1g_prv2", state: "weak" },
  /* WEST1 跨扇区骨干链路 */
  { a: "w1a_rly", b: "w1n_rly2", state: "weak", backbone: true },
  { a: "w1n_acc", b: "w1p_acc", state: "stable", backbone: true },
  { a: "w1n_dsv", b: "w1m_rly", state: "stable", backbone: true },
  { a: "w1n_rly2", b: "w1e_acc", state: "stable", backbone: true },
  { a: "w1m_sec", b: "w1e_dsv", state: "weak", backbone: true },
  { a: "w1p_acc", b: "w1g_acc", state: "stable", backbone: true },
  { a: "w1m_dsv", b: "w1g_dsv", state: "stable", backbone: true },
  { a: "w1e_rly", b: "w1g_rly", state: "weak", backbone: true },
  { a: "w1p_rly", b: "w1g_prv", state: "down", backbone: true },

  /* Gexogen 诊所接入既有网络 */
  { a: "w1a_res", b: "w1a_gex", state: "weak" },
  { a: "w1n_dsv", b: "w1n_gex", state: "stable" },
  { a: "w1p_dsv", b: "w1p_gex", state: "stable" },
  { a: "w1m_dsv", b: "w1m_gex", state: "weak" },
  { a: "w1e_crp", b: "w1e_gex", state: "stable" },
  { a: "w1g_rly", b: "w1g_gex", state: "weak" },

  /* 独立网格内部链路 */
  { a: "w1m_z01", b: "w1n_z02", state: "stable", backbone: true },
  { a: "w1n_z02", b: "w1a_z03", state: "weak", backbone: true },
  { a: "w1m_z01", b: "w1e_z04", state: "stable", backbone: true },
  { a: "w1e_z04", b: "w1g_z05", state: "weak", backbone: true },
];

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
  /* 赤道区域 */
  { id: "wlq_acc", code: "ACC-Q01", type: "ACCESS", sector: "wl_eq", x: 120, y: 90, status: "ONLINE", desc: "Caracas access pool. Warm modems, open doors." },
  { id: "wlq_rly", code: "RLY-Q02", type: "RELAY", sector: "wl_eq", x: 250, y: 120, status: "ONLINE", desc: "Equatorial trunk relay. Roasts at noon." },
  { id: "wlq_dsv", code: "DSV-Q03", type: "DATA SERVER", sector: "wl_eq", x: 355, y: 80, status: "ONLINE", desc: "Coffee exchange records server. Definitely just coffee." },

  /* 亚马逊回路（冲突区） */
  { id: "wlz_rly", code: "RLY-M01", type: "RELAY", sector: "wl_amz", x: 500, y: 180, status: "ONLINE", desc: "River float relay, Manaus reach. Powered questionably." },
  { id: "wlz_arc", code: "ARC-M02", type: "ARCHIVE", sector: "wl_amz", x: 640, y: 245, status: "UNKNOWN", desc: "Mission archive. Rumored to hold pre-network logs." },
  { id: "wlz_prv", code: "PRV-M03", type: "PRIVATE", sector: "wl_amz", x: 765, y: 160, status: "ONLINE", desc: "Jungle host. Photosynthesis-powered (unverified)." },
  { id: "wlz_sec", code: "SEC-M04", type: "SECURITY", sector: "wl_amz", x: 840, y: 285, status: "RESTRICTED", desc: "Logging concession security grid. Do not probe twice." },

  /* 安第斯网络 */
  { id: "wld_rly", code: "RLY-A01", type: "RELAY", sector: "wl_and", x: 150, y: 240, status: "ONLINE", desc: "Altiplano relay. Oxygen optional, uptime not." },
  { id: "wld_res", code: "RES-A02", type: "RESEARCH", sector: "wl_and", x: 255, y: 320, status: "ONLINE", desc: "Observatory node. Nightly sky dumps, 400MB of dark." },
  { id: "wld_acc", code: "ACC-A03", type: "ACCESS", sector: "wl_and", x: 140, y: 395, status: "ONLINE", desc: "Valparaiso dial pool. Funicular of packets." },

  /* 大西洋大陆架 */
  { id: "wls_crp", code: "CRP-S01", type: "CORPORATE", sector: "wl_atl", x: 920, y: 300, status: "ONLINE", desc: "Port authority host. Stamped, signed, mirrored." },
  { id: "wls_rly", code: "RLY-S02", type: "RELAY", sector: "wl_atl", x: 1045, y: 345, status: "ONLINE", desc: "Shelf cable relay. Barnacled but swift." },
  { id: "wls_dsv", code: "DSV-S03", type: "DATA SERVER", sector: "wl_atl", x: 955, y: 415, status: "ONLINE", desc: "Shipping ledger mirror. Every crate accounted." },

  /* 潘帕斯中继区 */
  { id: "wlp_acc", code: "ACC-PA01", type: "ACCESS", sector: "wl_pam", x: 400, y: 450, status: "ONLINE", desc: "Buenos Aires access. Passionate about uptime." },
  { id: "wlp_rly", code: "RLY-PA02", type: "RELAY", sector: "wl_pam", x: 545, y: 480, status: "ONLINE", desc: "Pampeano backbone relay. Grass-fed packets." },
  { id: "wlp_dsv", code: "DSV-PA03", type: "DATA SERVER", sector: "wl_pam", x: 665, y: 430, status: "ONLINE", desc: "Cattle futures vault. Volatile." },
  { id: "wlp_prv", code: "PRV-PA04", type: "PRIVATE", sector: "wl_pam", x: 460, y: 558, status: "OFFLINE", desc: "Estancia node. Generator out of diesel." },

  /* 南部海角 */
  { id: "wlc_rly", code: "RLY-CA01", type: "RELAY", sector: "wl_cape", x: 320, y: 610, status: "UNKNOWN", desc: "Cape relay. Signal bends wrong here. Count the echoes." },
  { id: "wlc_arc", code: "ARC-CA02", type: "ARCHIVE", sector: "wl_cape", x: 465, y: 650, status: "OFFLINE", desc: "Whaling records archive. Waterlogged in both senses." },
  { id: "wlc_res", code: "RES-CA03", type: "RESEARCH", sector: "wl_cape", x: 510, y: 590, status: "UNKNOWN", desc: "Penguin census beacon. Someone taught it to ping." },

  /* Gexogen Medical：每个扇区一处诊所节点 */
  { id: "wlq_gex", code: "DSV-Q09", type: "DATA SERVER", sector: "wl_eq", x: 175, y: 165, status: "ONLINE", desc: "Gexogen equatorial clinic. The waiting list is longer than the coastline." },
  { id: "wlz_gex", code: "CRP-M09", type: "CORPORATE", sector: "wl_amz", x: 560, y: 300, status: "ONLINE", desc: "Gexogen river clinic. Reached by boat, billed by satellite." },
  { id: "wld_gex", code: "RES-D09", type: "RESEARCH", sector: "wl_and", x: 262, y: 430, status: "ONLINE", desc: "Gexogen highland clinic. Altitude surcharge applied to every procedure." },
  { id: "wls_gex", code: "CRP-S09", type: "CORPORATE", sector: "wl_atl", x: 1100, y: 300, status: "ONLINE", desc: "Gexogen port clinic. Crew physicals, and whatever the crews bring with them." },
  { id: "wlp_gex", code: "CRP-W09", type: "CORPORATE", sector: "wl_pam", x: 620, y: 550, status: "ONLINE", desc: "Gexogen grassland clinic. One ambulance, four hundred kilometres of road." },
  { id: "wlc_gex", code: "RLY-V09", type: "RELAY", sector: "wl_cape", x: 300, y: 690, status: "ONLINE", desc: "Gexogen cape clinic. Staffed in summer, uplinked all year." },

  /* 独立网格在南半球的延伸 */
  { id: "wlq_z06", code: "ACC-Z06", type: "ACCESS", sector: "wl_eq", x: 60, y: 145, status: "ONLINE", desc: "Southern door of the shadow grid. Opens only for the northern key." },
  { id: "wlz_z07", code: "RLY-Z07", type: "RELAY", sector: "wl_amz", x: 870, y: 215, status: "ONLINE", desc: "Shadow relay above the canopy. No mast, no owner, no silence." },
  { id: "wld_z08", code: "ARC-Z08", type: "ARCHIVE", sector: "wl_and", x: 110, y: 300, status: "ONLINE", desc: "Shadow archive at altitude. Thin air, thick indices." },
  { id: "wls_z09", code: "DSV-Z09", type: "DATA SERVER", sector: "wl_atl", x: 880, y: 370, status: "ONLINE", desc: "Shelf-side store on the shadow grid. Mirrors something it should not." },
  { id: "wlp_z10", code: "PRV-Z10", type: "PRIVATE", sector: "wl_pam", x: 350, y: 500, status: "ONLINE", desc: "Private host on the shadow grid. Answers in full sentences." },
  { id: "wlc_z11", code: "SEC-Z11", type: "SECURITY", sector: "wl_cape", x: 408, y: 612, status: "ONLINE", desc: "Southern watchdog of the shadow grid. It has never reported an intrusion." },
];

const WL_LINKS: NetLink[] = [
  /* 赤道区域 */
  { a: "wlq_acc", b: "wlq_rly", state: "stable" },
  { a: "wlq_rly", b: "wlq_dsv", state: "stable" },
  /* 亚马逊区域 */
  { a: "wlz_rly", b: "wlz_arc", state: "weak" },
  { a: "wlz_rly", b: "wlz_prv", state: "weak" },
  { a: "wlz_prv", b: "wlz_sec", state: "weak" },
  { a: "wlz_arc", b: "wlz_sec", state: "down" },
  /* 安第斯网络 */
  { a: "wld_rly", b: "wld_res", state: "stable" },
  { a: "wld_res", b: "wld_acc", state: "stable" },
  { a: "wld_rly", b: "wld_acc", state: "stable" },
  /* 大陆架区域 */
  { a: "wls_crp", b: "wls_rly", state: "stable" },
  { a: "wls_crp", b: "wls_dsv", state: "stable" },
  { a: "wls_rly", b: "wls_dsv", state: "stable" },
  /* 潘帕斯中继区 */
  { a: "wlp_acc", b: "wlp_rly", state: "stable" },
  { a: "wlp_rly", b: "wlp_dsv", state: "stable" },
  { a: "wlp_acc", b: "wlp_prv", state: "down" },
  { a: "wlp_dsv", b: "wlp_prv", state: "weak" },
  /* 南部海角 */
  { a: "wlc_rly", b: "wlc_arc", state: "weak" },
  { a: "wlc_arc", b: "wlc_res", state: "weak" },
  /* WETLOW 跨扇区骨干链路 */
  { a: "wlq_rly", b: "wlz_rly", state: "stable", backbone: true },
  { a: "wlq_acc", b: "wld_rly", state: "stable", backbone: true },
  { a: "wlz_sec", b: "wls_crp", state: "weak", backbone: true },
  { a: "wlz_prv", b: "wlp_dsv", state: "weak", backbone: true },
  { a: "wld_acc", b: "wlp_acc", state: "stable", backbone: true },
  { a: "wlp_dsv", b: "wls_dsv", state: "stable", backbone: true },
  { a: "wlp_rly", b: "wlc_rly", state: "weak", backbone: true },
  { a: "wld_acc", b: "wlc_arc", state: "down", backbone: true },

  /* Gexogen 诊所接入既有网络 */
  { a: "wlq_rly", b: "wlq_gex", state: "weak" },
  { a: "wlz_arc", b: "wlz_gex", state: "weak" },
  { a: "wld_res", b: "wld_gex", state: "stable" },
  { a: "wls_crp", b: "wls_gex", state: "stable" },
  { a: "wlp_rly", b: "wlp_gex", state: "weak" },
  { a: "wlc_arc", b: "wlc_gex", state: "weak" },

  /* 独立网格内部链路 */
  { a: "wlq_z06", b: "wld_z08", state: "stable", backbone: true },
  { a: "wld_z08", b: "wlp_z10", state: "weak", backbone: true },
  { a: "wlp_z10", b: "wlc_z11", state: "weak", backbone: true },
  { a: "wlq_z06", b: "wlz_z07", state: "stable", backbone: true },
  { a: "wlz_z07", b: "wls_z09", state: "weak", backbone: true },
];

export const REGION_DATA: Record<string, RegionData> = {
  west1: { sectors: W1_SECTORS, nodes: W1_NODES, links: W1_LINKS },
  wetlow: { sectors: WL_SECTORS, nodes: WL_NODES, links: WL_LINKS },
};

export const ALL_NODES: NetNode[] = [...W1_NODES, ...WL_NODES];

export const regionNodeById = (nodes: NetNode[], id: string) => nodes.find((n) => n.id === id);
export const regionSectorById = (sectors: Sector[], id: string) => sectors.find((s) => s.id === id);
