export type NodeStatus = "ONLINE" | "OFFLINE" | "RESTRICTED" | "UNKNOWN";
export type SectorStatus = "ONLINE" | "RESTRICTED" | "DEGRADED" | "CONTESTED";

export type NodeType =
  | "ACCESS"
  | "RELAY"
  | "DATA SERVER"
  | "CORPORATE"
  | "PRIVATE"
  | "ARCHIVE"
  | "RESEARCH"
  | "SECURITY";

export interface Sector {
  id: string;
  code: string;
  name: string;
  status: SectorStatus;
  x: number;
  y: number;
  w: number;
  h: number;
  desc: string;
}

export interface NetNode {
  id: string;
  code: string;
  type: NodeType;
  sector: string;
  x: number;
  y: number;
  status: NodeStatus;
  desc: string;
}

export interface NetLink {
  a: string;
  b: string;
  backbone?: boolean;
  state: "stable" | "weak" | "down";
}

export interface RegionData {
  sectors: Sector[];
  nodes: NetNode[];
  links: NetLink[];
}

export const MAP_W = 1200;
export const MAP_H = 760;

export const TYPE_GLYPH: Record<NodeType, string> = {
  ACCESS: "circle",
  RELAY: "trapezoid",
  "DATA SERVER": "box",
  CORPORATE: "hex",
  PRIVATE: "diamond",
  ARCHIVE: "tri",
  RESEARCH: "oct",
  SECURITY: "pent",
};
