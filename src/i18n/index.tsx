import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { store } from "../lib/util";

export type Lang = "en" | "ru";

type Entry = { en: string; ru: string };

/* ================================================================== */
/* UI dictionary                                                       */
/* ================================================================== */

export const DICT: Record<string, Entry> = {
  /* ---------- brand / top bar ---------- */
  "brand.sub": { en: "net operations console", ru: "консоль сетевых операций" },
  "top.system": { en: "System", ru: "Система" },
  "top.network": { en: "Network", ru: "Сеть" },
  "top.conn": { en: "Conn", ru: "Связь" },
  "top.sessions": { en: "Sessions", ru: "Сеансы" },
  "top.uptime": { en: "Uptime", ru: "Аптайм" },
  "top.local": { en: "Local", ru: "Время" },
  "top.operator": { en: "Operator", ru: "Оператор" },
  "top.online": { en: "ONLINE", ru: "В СЕТИ" },
  "top.stable": { en: "STABLE", ru: "СТАБИЛЬНА" },
  "top.globalgrid": { en: "WORLD", ru: "WORLD" },
  "top.crtTip": { en: "toggle CRT scanlines", ru: "переключить развёртку ЭЛТ" },
  "top.handleTip": { en: "set operator handle", ru: "сменить позывной оператора" },
  "top.save": { en: "save handle", ru: "сохранить" },
  "top.cancel": { en: "cancel", ru: "отмена" },
  "top.handlePh": { en: "HANDLE", ru: "ПОЗЫВНОЙ" },
  "top.langTip": { en: "switch language", ru: "переключить язык" },

  /* ---------- panel titles ---------- */
  "panel.worldnet": { en: "WORLD", ru: "WORLD" },
  "panel.regional": { en: "Regional Map", ru: "Карта региона" },
  "panel.sector": { en: "Sector Data", ru: "Данные сектора" },
  "panel.node": { en: "Node Detail", ru: "Данные узла" },
  "panel.events": { en: "Event Log", ru: "Журнал событий" },
  "panel.chat": { en: "Message Subsystem", ru: "Подсистема сообщений" },

  /* ---------- pane switcher ---------- */
  "pane.world": { en: "WORLD", ru: "WORLD" },
  "pane.region": { en: "REGIONAL MAP", ru: "КАРТА РЕГИОНА" },
  "pane.data": { en: "SECTOR / NODE / LOG", ru: "СЕКТОР / УЗЕЛ / ЛОГ" },

  /* ---------- world map ---------- */
  "world.feed": { en: "world // mercator-feed 72x36", ru: "world // меркатор 72x36" },
  "world.sessions": { en: "{n} sessions live", ru: "сеансов: {n}" },
  "world.fig": {
    en: "FIG 0.1 — TERMINAL PERCEPTION OF EARTH, APPROX.",
    ru: "РИС 0.1 — ВОСПРИЯТИЕ ЗЕМЛИ ТЕРМИНАЛОМ, ПРИБЛ.",
  },
  "world.reach": {
    en: "{r} REGIONS REACHABLE · {d} TRUNKS DEAD",
    ru: "ДОСТУПНО РЕГИОНОВ: {r} · МЁРТВЫХ МАГИСТРАЛЕЙ: {d}",
  },
  "world.enter": { en: "▸ ENTER REGION", ru: "▸ ВОЙТИ В РЕГИОН" },
  "world.offline": { en: "OFFLINE", ru: "НЕ В СЕТИ" },
  "world.uplink": { en: "SATELLITE UPLINK", ru: "СПУТНИКОВЫЙ КАНАЛ" },

  /* ---------- route trace ---------- */
  "trace.title": { en: "route handoff in progress", ru: "идёт передача маршрута" },
  "trace.hop1": { en: "hop 1  SAT-0 uplink ........ {ms} ms", ru: "хоп 1  аплинк SAT-0 ....... {ms} мс" },
  "trace.hop2": { en: "hop 2  backbone exchange ... {ms} ms", ru: "хоп 2  узел магистрали .... {ms} мс" },
  "trace.hop3": { en: "hop 3  border gateway ...... {ms} ms", ru: "хоп 3  пограничный шлюз ... {ms} мс" },
  "trace.hop4": { en: "hop 4  {code} entry ......... {ms} ms", ru: "хоп 4  вход {code} ......... {ms} мс" },
  "trace.inject": { en: "injecting packet stream", ru: "внедрение потока пакетов" },
  "trace.dontclose": { en: "do not close terminal", ru: "не закрывайте терминал" },

  /* ---------- region map ---------- */
  "map.back": { en: "world", ru: "world" },
  "map.backTip": { en: "return to WORLD", ru: "вернуться в WORLD" },
  "map.zoomIn": { en: "zoom in · wheel up", ru: "приблизить · колесо вверх" },
  "map.zoomOut": { en: "zoom out · wheel down", ru: "отдалить · колесо вниз" },
  "map.zoomReset": { en: "reset view", ru: "сбросить вид" },
  "map.panHint": { en: "wheel to zoom · drag to pan", ru: "колесо — зум · перетаскивание — сдвиг" },
  "map.legend": { en: "▞ LEGEND", ru: "▞ ЛЕГЕНДА" },
  "map.links": {
    en: "─ STABLE  ┈ WEAK  ┄ DOWN  ══ BACKBONE",
    ru: "─ СТАБ.  ┈ СЛАБ.  ┄ ОБРЫВ  ══ МАГИСТР.",
  },
  "map.nd": { en: "{n} ND", ru: "{n} УЗ" },

  /* ---------- sector panel ---------- */
  "sec.none": { en: "NO SECTOR SELECTED", ru: "СЕКТОР НЕ ВЫБРАН" },
  "sec.hintRegion": {
    en: "select a grid on the regional map to inspect its routing table.",
    ru: "выберите сектор на карте региона, чтобы изучить его таблицу маршрутов.",
  },
  "sec.hintWorld": {
    en: "no grids at world altitude — route into a region first.",
    ru: "на глобальной высоте секторов нет — сначала войдите в регион.",
  },
  "sec.nodes": { en: "Nodes", ru: "Узлы" },
  "sec.indexed": { en: "{n} indexed", ru: "{n} в индексе" },
  "sec.reach": { en: "Reachable", ru: "Доступно" },
  "sec.integrity": { en: "Integrity", ru: "Целостность" },

  /* ---------- node panel ---------- */
  "node.none": { en: "NO NODE TARGETED", ru: "УЗЕЛ НЕ ВЫБРАН" },
  "node.hint": {
    en: "click a node marker on the grid to interrogate it.",
    ru: "нажмите на маркер узла на карте, чтобы опросить его.",
  },
  "node.class": { en: "Class", ru: "Класс" },
  "node.grid": { en: "Grid", ru: "Сектор" },
  "node.ref": { en: "Grid ref", ru: "Координаты" },
  "node.state": { en: "State", ru: "Состояние" },
  "node.syn": { en: "SYN SENT…", ru: "SYN ОТПРАВЛЕН…" },
  "node.suffix": { en: "{t} NODE", ru: "УЗЕЛ · {t}" },
  "node.contested": {
    en: "▲ conflict zone — WARDEN proximity warning",
    ru: "▲ зона конфликта — рядом защита WARDEN",
  },
  "node.handshake": { en: "handshake in progress", ru: "идёт рукопожатие" },
  "node.active": { en: "session active", ru: "сеанс активен" },
  "node.drop": { en: "drop", ru: "сброс" },
  "node.connect": { en: "connect", ru: "подключиться" },
  "node.connectAuth": { en: "connect · auth req", ru: "подключение · нужен допуск" },
  "node.noCarrier": { en: "no carrier", ru: "нет несущей" },
  "node.attempt": { en: "attempt link · unverified", ru: "попытка связи · не проверен" },

  /* ---------- event log ---------- */
  "ev.entries": { en: "{n} entries", ru: "записей: {n}" },
  "ev.waiting": { en: "awaiting network telemetry…", ru: "ожидание телеметрии сети…" },

  /* ---------- chat ---------- */
  "chat.on": { en: "{n} ON", ru: "{n} В СЕТИ" },
  "chat.send": { en: "SEND", ru: "СЛАТЬ" },
  "chat.ph": { en: "transmit to {ch}…", ru: "передать в {ch}…" },
  "chat.quiet": {
    en: "— channel quiet · carrier present —",
    ru: "— в канале тихо · несущая есть —",
  },
  "ch.GLOBAL": { en: "GLOBAL", ru: "ОБЩИЙ" },
  "ch.OPERATORS": { en: "OPERATORS", ru: "ОПЕРАТОРЫ" },
  "ch.MARKET": { en: "MARKET", ru: "РЫНОК" },
  "ch.CORPORATE": { en: "CORPORATE", ru: "КОРПОРАЦИИ" },
  "ch.PRIVATE": { en: "PRIVATE", ru: "ЛИЧНЫЙ" },
  "chs.GLOBAL": { en: "GLOB", ru: "ОБЩ" },
  "chs.OPERATORS": { en: "OPS", ru: "ОПЕР" },
  "chs.MARKET": { en: "MKT", ru: "РЫН" },
  "chs.CORPORATE": { en: "CORP", ru: "КОРП" },
  "chs.PRIVATE": { en: "PVT", ru: "ЛИЧН" },
  "topic.GLOBAL": {
    en: "topic: the grid is older than you think",
    ru: "тема: сеть старше, чем вам кажется",
  },
  "topic.OPERATORS": { en: "topic: shift log · keep it clean", ru: "тема: журнал смены · без флуда" },
  "topic.MARKET": {
    en: "topic: trade at your own risk · ops not liable",
    ru: "тема: сделки на свой страх · операторы не отвечают",
  },
  "topic.CORPORATE": { en: "topic: official traffic · monitored", ru: "тема: официальный трафик · под надзором" },
  "topic.PRIVATE": { en: "topic: low bandwidth · encryption off", ru: "тема: узкий канал · шифрование выкл" },

  /* ---------- terminal bar ---------- */
  "term.title": { en: "tty0 · system console", ru: "tty0 · системная консоль" },
  "term.hint": { en: "CTRL+` toggles", ru: "CTRL+` — показать/скрыть" },
  "term.expand": { en: "expand", ru: "развернуть" },
  "term.collapse": { en: "collapse", ru: "свернуть" },
  "term.ready": { en: "console ready_", ru: "консоль готова_" },
  "term.mem": { en: "mem 640K ok", ru: "память 640K ok" },
  "term.buf": { en: "buf {n}/120", ru: "буфер {n}/120" },
  "term.line": { en: "tty0 @ 9600,n,8,1", ru: "tty0 @ 9600,n,8,1" },
  "term.rom": { en: "gns-9000 rom 41.7 · no warranty", ru: "gns-9000 пзу 41.7 · без гарантий" },

  /* ---------- login ---------- */
  "login.title": { en: "system login — remote terminal", ru: "вход в систему — удалённый терминал" },
  "login.guest": { en: "tty-guest", ru: "tty-гость" },
  "login.sub": { en: "global network operations system", ru: "система операций глобальной сети" },
  "login.lang": { en: "interface language", ru: "язык интерфейса" },
  "login.handle": { en: "operator handle", ru: "позывной оператора" },
  "login.ph": { en: "TYPE HANDLE OR LEAVE BLANK", ru: "ВВЕДИТЕ ПОЗЫВНОЙ ИЛИ ОСТАВЬТЕ ПУСТЫМ" },
  "login.jack": { en: "► log on", ru: "► подключиться" },
  "login.unknown": { en: "enter as unknown", ru: "войти как unknown" },
  "login.auth": { en: "authenticating :: {h} …", ru: "аутентификация :: {h} …" },
  "login.granted": {
    en: "access granted — welcome to the wire",
    ru: "доступ разрешён — добро пожаловать в сеть",
  },
  "login.notice": {
    en: "notice: sessions are monitored and logged. unauthorized use of core trunks violates grid policy 7-c. prototype build — no warranty express or implied.",
    ru: "внимание: сеансы отслеживаются и журналируются. несанкционированный доступ к магистралям нарушает регламент сети 7-c. прототип — без каких-либо гарантий.",
  },
  "login.f1": { en: "backbone online", ru: "магистраль в сети" },
  "login.f2": { en: "world index ready", ru: "индекс world готов" },
  "login.f3": { en: "rom 41.7", ru: "пзу 41.7" },
  "login.foot": {
    en: "enter handle · press enter · or ride in anonymous",
    ru: "введите позывной · нажмите ввод · или входите анонимно",
  },
  "login.boot1": { en: "GNS-9000 ROM v41.7 . POST ok", ru: "GNS-9000 ПЗУ v41.7 . POST ok" },
  "login.boot2": { en: "memory check: 640K conventional … ok", ru: "проверка памяти: 640K … ok" },
  "login.boot3": { en: "packet driver at 0x60 … loaded", ru: "пакетный драйвер 0x60 … загружен" },
  "login.boot4": { en: "dialing backbone carrier … CONNECT 9600/ARQ", ru: "набор магистрали … CONNECT 9600/ARQ" },
  "login.boot5": { en: "resolving WORLD … region index ready", ru: "поиск WORLD … индекс регионов готов" },

  /* ---------- node types ---------- */
  "type.ACCESS": { en: "ACCESS", ru: "ДОСТУП" },
  "type.RELAY": { en: "RELAY", ru: "РЕТРАНСЛЯТОР" },
  "type.DATA SERVER": { en: "DATA SERVER", ru: "СЕРВЕР ДАННЫХ" },
  "type.CORPORATE": { en: "CORPORATE", ru: "КОРПОРАТИВНЫЙ" },
  "type.PRIVATE": { en: "PRIVATE", ru: "ЧАСТНЫЙ" },
  "type.ARCHIVE": { en: "ARCHIVE", ru: "АРХИВ" },
  "type.RESEARCH": { en: "RESEARCH", ru: "НАУЧНЫЙ" },
  "type.SECURITY": { en: "SECURITY", ru: "ОХРАННЫЙ" },
  "tshort.ACCESS": { en: "ACCESS", ru: "ДОСТУП" },
  "tshort.RELAY": { en: "RELAY", ru: "РЕТРАНС" },
  "tshort.DATA SERVER": { en: "DATA SRVR", ru: "СЕРВЕР" },
  "tshort.CORPORATE": { en: "CORPORATE", ru: "КОРПОРАТ" },
  "tshort.PRIVATE": { en: "PRIVATE", ru: "ЧАСТНЫЙ" },
  "tshort.ARCHIVE": { en: "ARCHIVE", ru: "АРХИВ" },
  "tshort.RESEARCH": { en: "RESEARCH", ru: "НАУЧНЫЙ" },
  "tshort.SECURITY": { en: "SECURITY", ru: "ОХРАНА" },

  /* ---------- statuses ---------- */
  "st.ONLINE": { en: "ONLINE", ru: "В СЕТИ" },
  "st.OFFLINE": { en: "OFFLINE", ru: "НЕ В СЕТИ" },
  "st.RESTRICTED": { en: "RESTRICTED", ru: "ЗАКРЫТ" },
  "st.UNKNOWN": { en: "UNKNOWN", ru: "НЕИЗВЕСТЕН" },
  "st.DEGRADED": { en: "DEGRADED", ru: "ДЕГРАДАЦИЯ" },
  "st.CONTESTED": { en: "CONFLICT ZONE", ru: "ЗОНА КОНФЛИКТА" },
  "st.CONNECTED": { en: "CONNECTED", ru: "ПОДКЛЮЧЁН" },

  /* ---------- terminal / event messages ---------- */
  "t.auth": { en: "operator {op} authenticated :: session opened", ru: "оператор {op} аутентифицирован :: сеанс открыт" },
  "t.init": { en: "initializing network interface …", ru: "инициализация сетевого интерфейса …" },
  "t.carrier": { en: "carrier detect :: WORLD @ 9600 baud", ru: "несущая найдена :: WORLD @ 9600 бод" },
  "t.regions": { en: "region index :: WEST1 licensed", ru: "индекс регионов :: WEST1 лицензирован" },
  "t.dead": {
    en: "EU-LINK / EASTNET / PAC-CABLE trunks dead (prototype scope)",
    ru: "магистрали EU-LINK / EASTNET / PAC-CABLE мертвы (рамки прототипа)",
  },
  "t.sat": { en: "satellite uplink SAT-0 standing by", ru: "спутниковый канал SAT-0 в ожидании" },
  "t.ready": { en: "console ready. select a region on WORLD.", ru: "консоль готова. выберите регион на карте WORLD." },
  "e.sessionOpened": { en: "operator {op} opened a session", ru: "оператор {op} открыл сеанс" },

  "t.joined": { en: "joined channel #{ch}", ru: "вход в канал #{ch}" },
  "t.tx": { en: "tx >> #{ch} :: {n} chars", ru: "передача >> #{ch} :: {n} симв." },

  "t.routeResolve": { en: "route resolve :: {code} ({cont})", ru: "поиск маршрута :: {code} ({cont})" },
  "t.inject": { en: "injecting packet stream :: 64/64 queued", ru: "внедрение потока пакетов :: 64/64 в очереди" },
  "t.handoff": { en: "handoff ok :: entering {code} regional grid", ru: "передача ок :: вход в региональную сеть {code}" },
  "t.gridLoaded": {
    en: "regional grid loaded :: {s} sectors, {n} nodes indexed",
    ru: "региональная сеть загружена :: секторов {s}, узлов {n}",
  },
  "e.routeEstablished": { en: "route established to {code} — {cont}", ru: "маршрут установлен до {code} — {cont}" },
  "t.uplinkCut": { en: "uplink severed :: back at WORLD", ru: "канал разорван :: возврат в WORLD" },
  "e.backWorld": { en: "operator returned to WORLD", ru: "оператор вернулся в WORLD" },
  "t.dialDead": { en: "dial {code} … {note}", ru: "набор {code} … {note}" },
  "e.deadUnreachable": { en: "{code} unreachable — {note}", ru: "{code} недоступен — {note}" },

  "t.sectorScan": {
    en: "sector scan :: {code} {name} [{st}] — {n} nodes indexed",
    ru: "скан сектора :: {code} {name} [{st}] — узлов: {n}",
  },
  "e.sectorSelected": { en: "sector {name} selected by operator", ru: "оператор выбрал сектор {name}" },
  "t.interrogate": { en: "interrogate {code} :: {type} NODE :: {st}", ru: "опрос {code} :: УЗЕЛ {type} :: {st}" },

  "t.linkBusy": { en: "link busy :: handshake already in progress", ru: "канал занят :: рукопожатие уже идёт" },
  "t.dial": { en: "dial {code} …", ru: "набор {code} …" },
  "t.noCarrier": { en: "no carrier :: {code} is offline", ru: "нет несущей :: {code} не в сети" },
  "e.noCarrier": { en: "{code} unreachable — no carrier", ru: "{code} недоступен — нет несущей" },
  "t.contestedWarn": {
    en: "warning :: conflict zone — WARDEN signature nearby",
    ru: "внимание :: зона конфликта — рядом сигнатура WARDEN",
  },
  "t.denied": { en: "ACCESS DENIED :: {code} requires auth level 3", ru: "ДОСТУП ЗАПРЕЩЁН :: {code} требует допуск 3" },
  "e.denied": { en: "unauthorized connect attempt on {code} logged", ru: "попытка доступа к {code} занесена в журнал" },
  "t.unresolved": { en: "unresolved address :: probing {code} …", ru: "адрес не разрешён :: зондирование {code} …" },
  "t.echoLost": { en: "carrier lost :: signal echo destroyed the handshake", ru: "несущая потеряна :: эхо сигнала сорвало рукопожатие" },
  "e.refused": { en: "{code} refused to resolve — connection failed", ru: "{code} не разрешился — подключение не удалось" },
  "t.routeLocked": { en: "route locked :: {h} hops via {route}", ru: "маршрут зафиксирован :: {h} хопов через {route}" },
  "t.protocol": { en: "negotiating protocol :: x.25/pad ok", ru: "согласование протокола :: x.25/pad ok" },
  "t.established": { en: "connection established :: {code} latency {ms}ms", ru: "соединение установлено :: {code} задержка {ms}мс" },
  "e.established": { en: "session opened with {code} ({type} NODE)", ru: "открыт сеанс с {code} (УЗЕЛ {type})" },
  "e.contestedRisk": { en: "contested grid session — trace risk elevated", ru: "сеанс в спорном секторе — риск трассировки повышен" },
  "t.closed": { en: "session closed :: {code} — line hung up", ru: "сеанс закрыт :: {code} — линия разорвана" },
  "e.dropped": { en: "operator dropped session with {code}", ru: "оператор сбросил сеанс с {code}" },

  "e.carrierLost": { en: "carrier lost on {code} — node offline", ru: "потеряна несущая на {code} — узел не в сети" },
  "t.wentOffline": { en: "alert :: {code} dropped offline", ru: "тревога :: {code} ушёл из сети" },
  "e.restored": { en: "{code} responding again — link restored", ru: "{code} снова отвечает — связь восстановлена" },
  "t.backOnline": { en: "notice :: {code} back online", ru: "уведомление :: {code} снова в сети" },
  "t.sessionLost": { en: "SESSION LOST :: {code} carrier dropped", ru: "СЕАНС ПОТЕРЯН :: {code} несущая пропала" },
  "e.sessionLost": { en: "session with {code} lost — carrier dropped", ru: "сеанс с {code} потерян — несущая пропала" },

  "t.crtOn": { en: "crt overlay enabled", ru: "развёртка ЭЛТ включена" },
  "t.crtOff": { en: "crt overlay disabled", ru: "развёртка ЭЛТ выключена" },
  "t.handleSet": { en: "operator handle set :: {op}", ru: "позывной оператора задан :: {op}" },
  "e.handleSet": { en: "operator identified as {op}", ru: "оператор опознан как {op}" },
  "t.langSet": { en: "interface language :: ENGLISH", ru: "язык интерфейса :: РУССКИЙ" },

  /* dead-point notes */
  "dead.EU-LINK": {
    en: "transatlantic trunk severed in this build",
    ru: "трансатлантическая магистраль обрезана в этой сборке",
  },
  "dead.EASTNET": {
    en: "no route announced from this terminal",
    ru: "маршрут с этого терминала не анонсирован",
  },
  "dead.PAC-CABLE": {
    en: "cable repeater silent since '94",
    ru: "кабельный повторитель молчит с '94",
  },
  "dead.name.EU-LINK": { en: "EUROPEAN TRUNK", ru: "ЕВРОПЕЙСКАЯ МАГИСТРАЛЬ" },
  "dead.name.EASTNET": { en: "EASTERN NET", ru: "ВОСТОЧНАЯ СЕТЬ" },
  "dead.name.PAC-CABLE": { en: "TRANS-PACIFIC", ru: "ТРАНСТИХООКЕАНСКИЙ" },

  /* ================= GAME LAYER ================= */

  /* tabs */
  "tab.CHAT": { en: "CHAT", ru: "ЧАТ" },
  "tab.CODEX": { en: "CODEX", ru: "КОДЕКС" },
  "tab.CONTACTS": { en: "CONTACTS", ru: "КОНТАКТЫ" },
  "tab.STATUS": { en: "STATUS", ru: "СТАТУС" },
  "tab.new": { en: "NEW", ru: "НОВОЕ" },

  /* node states */
  "nst.LOCKED": { en: "LOCKED", ru: "ЗАБЛОКИРОВАН" },
  "nst.AVAILABLE": { en: "AVAILABLE", ru: "ДОСТУПЕН" },
  "nst.COMPROMISED": { en: "COMPROMISED", ru: "ВЗЛОМАН" },
  "nst.RESTRICTED": { en: "RESTRICTED", ru: "ОГРАНИЧЕН" },

  /* node classes */
  "ncls.CORPORATE": { en: "CORPORATE", ru: "КОРПОРАТИВНЫЙ" },
  "ncls.GOVERNMENT": { en: "GOVERNMENT", ru: "ГОСУДАРСТВЕННЫЙ" },
  "ncls.PRIVATE": { en: "PRIVATE", ru: "ЧАСТНЫЙ" },
  "ncls.PUBLIC": { en: "PUBLIC", ru: "ПУБЛИЧНЫЙ" },
  "ncls.UNDERGROUND": { en: "UNDERGROUND", ru: "ПОДПОЛЬНЫЙ" },

  /* data categories */
  "dcat.CORPORATE DATA": { en: "CORPORATE DATA", ru: "КОРПОРАТИВНЫЕ ДАННЫЕ" },
  "dcat.CLASSIFIED DATA": { en: "CLASSIFIED DATA", ru: "СЕКРЕТНЫЕ ДАННЫЕ" },
  "dcat.PERSONAL DATA": { en: "PERSONAL DATA", ru: "ЛИЧНЫЕ ДАННЫЕ" },
  "dcat.INTEL": { en: "INTEL", ru: "РАЗВЕДДАННЫЕ" },

  /* dossier */
  "dos.owner": { en: "Operator", ru: "Владелец" },
  "dos.warden": { en: "WARDEN", ru: "WARDEN" },
  "dos.class": { en: "Class", ru: "Класс" },
  "dos.state": { en: "State", ru: "Состояние" },
  "dos.reward": { en: "Reward", ru: "Награда" },
  "dos.region": { en: "Region", ru: "Регион" },
  "dos.cond": { en: "Access conditions", ru: "Условия доступа" },
  "dos.condRep": { en: "requires {n} REP", ru: "нужно {n} REP" },
  "dos.condNode": { en: "requires access to {code}", ru: "нужен доступ к {code}" },
  "dos.condOpen": { en: "no additional conditions", ru: "дополнительных условий нет" },
  "dos.condLocked": { en: "unlock by breaching an adjacent node", ru: "откроется после взлома соседнего узла" },
  "dos.files": { en: "Data available", ru: "Доступные данные" },
  "dos.noFiles": { en: "no retrievable data on this host", ru: "извлекаемых данных на узле нет" },
  "dos.download": { en: "download", ru: "скачать" },
  "dos.stored": { en: "stored", ru: "сохранено" },
  "dos.hack": { en: "connect · run GENIUS", ru: "подключиться · запуск GENIUS" },
  "dos.hackRepeat": { en: "re-enter · no REP", ru: "повторный вход · без REP" },
  "dos.hacking": { en: "GENIUS intrusion in progress", ru: "GENIUS: идёт проникновение" },
  "dos.lockedBtn": { en: "locked · no route", ru: "заблокирован · нет маршрута" },
  "dos.restrictedBtn": { en: "restricted · conditions unmet", ru: "ограничен · условия не выполнены" },
  "dos.recoveryBtn": { en: "too exposed · reset identity first", ru: "слишком засвечен · сначала смените личность" },
  "dos.intel": { en: "Intel", ru: "Разведданные" },
  "dos.noReward": { en: "none · already breached", ru: "нет · уже взломан" },
  "dos.breached": { en: "breached {n}x", ru: "взломов: {n}" },

  /* genius */
  "genius.title": { en: "GENIUS", ru: "GENIUS" },
  "genius.ops": { en: "OPS {a}/{b}", ru: "ОПЕР {a}/{b}" },
  "genius.recover": { en: "ANONYMITY", ru: "АНОНИМНОСТЬ" },
  "genius.recovering": { en: "RESETTING…", ru: "СБРОС…" },
  "genius.required": { en: "IDENTITY RESET REQUIRED", ru: "ТРЕБУЕТСЯ СБРОС ЛИЧНОСТИ" },
  "genius.ready": { en: "CLEAN", ru: "ЧИСТО" },
  "genius.anonTip": {
    en: "burn the current identity — clears the trail and the operation buffer",
    ru: "сжечь текущую личность — обрубает след и очищает буфер операций",
  },

  /* hack log */
  "hk.start": { en: "GENIUS :: opening intrusion stack on {code}", ru: "GENIUS :: открываю стек проникновения на {code}" },
  "hk.probe": { en: "probing WARDEN tier {n} …", ru: "зондирование WARDEN уровня {n} …" },
  "hk.bypass": { en: "bypassing signature checks :: {p}%", ru: "обход проверки сигнатур :: {p}%" },
  "hk.granted": { en: "ACCESS GRANTED :: {code} compromised", ru: "ДОСТУП ПОЛУЧЕН :: {code} взломан" },
  "hk.rep": { en: "+{n} REP credited to operator", ru: "+{n} REP зачислено оператору" },
  "hk.rel": { en: "{owner} relations {n}", ru: "отношения с {owner}: {n}" },
  "hk.codex": { en: "CODEX updated :: {n} entries", ru: "КОДЕКС обновлён :: записей {n}" },
  "hk.unlock": { en: "route discovered :: {code} unlocked", ru: "найден маршрут :: {code} разблокирован" },
  "hk.files": { en: "DATA DISCOVERY :: {n} file(s) retrievable", ru: "ОБНАРУЖЕНЫ ДАННЫЕ :: файлов к выгрузке: {n}" },
  "hk.repeat": { en: "repeat intrusion :: host already burned, no REP", ru: "повторное проникновение :: узел уже отработан, REP не начислен" },
  "hk.blocked": { en: "GENIUS refused :: {r}", ru: "GENIUS отказал :: {r}" },
  "hk.download": { en: "DATA DOWNLOAD :: {name} → DATA STORED", ru: "ЗАГРУЗКА :: {name} → ДАННЫЕ СОХРАНЕНЫ" },
  "hk.recovered": { en: "identity burned :: new signature, buffer cleared", ru: "личность сожжена :: новая сигнатура, буфер очищен" },
  "hk.recovering": { en: "rotating identity … shredding the trail", ru: "смена личности … затираю след" },

  /* codex page */
  "cx.cat.FACTIONS": { en: "FACTIONS", ru: "ФРАКЦИИ" },
  "cx.cat.CHARACTERS": { en: "CHARACTERS", ru: "ПЕРСОНАЖИ" },
  "cx.cat.LOCATIONS": { en: "LOCATIONS", ru: "ЛОКАЦИИ" },
  "cx.cat.NETWORK": { en: "NETWORK", ru: "СЕТЬ" },
  "cx.cat.INTEL": { en: "INTEL", ru: "РАЗВЕДДАННЫЕ" },
  "cx.state.UNKNOWN": { en: "UNKNOWN", ru: "НЕИЗВЕСТНО" },
  "cx.state.DISCOVERED": { en: "DISCOVERED", ru: "ОТКРЫТО" },
  "cx.state.UPDATED": { en: "UPDATED", ru: "ОБНОВЛЕНО" },
  "cx.classified": { en: "entry not yet recovered — breach related nodes to reveal", ru: "запись не получена — вскройте связанные узлы" },
  "cx.pick": { en: "select an entry", ru: "выберите запись" },
  "cx.known": { en: "{a}/{b} known", ru: "{a}/{b} открыто" },
  "cx.log": { en: "recent updates", ru: "последние обновления" },
  "cx.src": { en: "related faction", ru: "связанная фракция" },

  /* contacts page */
  "co.none": { en: "no contacts yet — build REP and they will find you", ru: "контактов нет — набирайте REP, и вас найдут" },
  "co.pick": { en: "select a contact", ru: "выберите контакт" },
  "co.rep": { en: "REP {n}", ru: "REP {n}" },
  "co.jump": { en: "NEW JOB", ru: "НОВЫЙ ЗАКАЗ" },
  "co.jumpTip": { en: "jump to the live job in this thread", ru: "перейти к заказу в этой переписке" },
  "co.accept": { en: "ACCEPT CONTRACT", ru: "ПРИНЯТЬ КОНТРАКТ" },
  "co.deliver": { en: "TRANSFER DATA", ru: "ПЕРЕДАТЬ ДАННЫЕ" },
  "co.target": { en: "target", ru: "цель" },
  "co.file": { en: "file", ru: "файл" },
  "co.payout": { en: "payout", ru: "оплата" },
  "co.cstate": { en: "contract state", ru: "состояние контракта" },
  "co.locked": { en: "locked · requires {n} REP", ru: "закрыт · нужно {n} REP" },
  "co.you": { en: "YOU", ru: "ВЫ" },
  "co.yes": { en: "YES", ru: "ДА" },
  "tut.incoming": { en: "INCOMING CALL", ru: "ВХОДЯЩИЙ ЗВОНОК" },
  "tut.unlisted": { en: "unlisted route · no trace", ru: "маршрут не указан · без следа" },
  "tut.answer": { en: "ANSWER", ru: "ОТВЕТИТЬ" },
  "tut.live": { en: "line open", ru: "линия открыта" },
  "tut.hangup": { en: "HANG UP", ru: "СБРОСИТЬ" },
  "tut.fold": { en: "HIDE", ru: "СВЕРНУТЬ" },
  "tut.unfold": { en: "SHOW", ru: "РАЗВЕРНУТЬ" },
  "tut.next": { en: "continue", ru: "дальше" },
  "tut.end": { en: "end call", ru: "завершить" },
  "tut.waiting": { en: "waiting for you…", ru: "ждёт от вас действия…" },
  "co.no": { en: "NO", ru: "НЕТ" },

  /* contract states */
  "cs.AVAILABLE": { en: "AVAILABLE", ru: "ДОСТУПЕН" },
  "cs.ACCEPTED": { en: "ACCEPTED", ru: "ПРИНЯТ" },
  "cs.TARGET ACCESSED": { en: "TARGET ACCESSED", ru: "ЦЕЛЬ ВЗЛОМАНА" },
  "cs.DATA ACQUIRED": { en: "DATA ACQUIRED", ru: "ДАННЫЕ ПОЛУЧЕНЫ" },
  "cs.DELIVERED": { en: "DELIVERED", ru: "ПЕРЕДАНО" },
  "cs.COMPLETED": { en: "COMPLETED", ru: "ЗАВЕРШЁН" },

  /* status page */
  "sp.profile": { en: "PROFILE", ru: "ПРОФИЛЬ" },
  "sp.handle": { en: "handle", ru: "позывной" },
  "sp.uid": { en: "operator id", ru: "идентификатор" },
  "sp.credits": { en: "CREDITS", ru: "КРЕДИТЫ" },
  "sp.rep": { en: "REPUTATION", ru: "РЕПУТАЦИЯ" },
  "sp.factions": { en: "FACTIONS", ru: "ФРАКЦИИ" },
  "sp.stats": { en: "STATISTICS", ru: "СТАТИСТИКА" },
  "sp.hacks": { en: "intrusions", ru: "взломов" },
  "sp.contracts": { en: "contracts done", ru: "контрактов" },
  "sp.files": { en: "files acquired", ru: "файлов получено" },
  "sp.nodes": { en: "nodes opened", ru: "узлов открыто" },
  "sp.storage": { en: "DATA STORAGE", ru: "ХРАНИЛИЩЕ ДАННЫХ" },
  "sp.empty": { en: "storage empty", ru: "хранилище пусто" },
  "sp.market": { en: "BLACK MARKET", ru: "ЧЁРНЫЙ РЫНОК" },
  "sp.marketSoon": { en: "offline — data trading is not wired up in this build", ru: "не работает — торговля данными в этой сборке не подключена" },
  "sp.marketVal": { en: "estimated book value", ru: "оценочная стоимость" },
  "sp.upgrades": { en: "NETWORK UPGRADES", ru: "СЕТЕВЫЕ АПГРЕЙДЫ" },
  "sp.buy": { en: "PURCHASE", ru: "КУПИТЬ" },
  "sp.owned": { en: "INSTALLED", ru: "УСТАНОВЛЕНО" },
  "sp.needRep": { en: "needs {n} REP", ru: "нужно {n} REP" },
  "sp.needCr": { en: "insufficient credits", ru: "недостаточно кредитов" },
  "sp.neutral": { en: "neutral", ru: "нейтрально" },
  "sp.hostile": { en: "hostile", ru: "враждебно" },
  "sp.friendly": { en: "friendly", ru: "дружественно" },

  /* world map locked region */
  "world.locked": { en: "LOCKED · LICENCE REQUIRED", ru: "ЗАКРЫТО · НУЖНА ЛИЦЕНЗИЯ" },
  "world.buyHint": { en: "buy the uplink licence in STATUS → NETWORK UPGRADES", ru: "купите лицензию в СТАТУС → СЕТЕВЫЕ АПГРЕЙДЫ" },
  "t.regionLocked": { en: "route refused :: {code} licence not held", ru: "маршрут отклонён :: нет лицензии на {code}" },

  /* notifications */
  "nf.NEW CODEX ENTRY": { en: "NEW CODEX ENTRY", ru: "НОВАЯ ЗАПИСЬ КОДЕКСА" },
  "nf.CODEX UPDATED": { en: "CODEX UPDATED", ru: "КОДЕКС ОБНОВЛЁН" },
  "nf.NEW CONTACT MESSAGE": { en: "NEW CONTACT MESSAGE", ru: "НОВОЕ СООБЩЕНИЕ" },
  "nf.NEW CONTRACT": { en: "NEW CONTRACT", ru: "НОВЫЙ КОНТРАКТ" },
  "nf.CONTRACT COMPLETED": { en: "CONTRACT COMPLETED", ru: "КОНТРАКТ ЗАВЕРШЁН" },
  "nf.NODE UNLOCKED": { en: "NODE UNLOCKED", ru: "УЗЕЛ РАЗБЛОКИРОВАН" },
  "nf.NEW REGION AVAILABLE": { en: "NEW REGION AVAILABLE", ru: "ДОСТУПЕН НОВЫЙ РЕГИОН" },
  "nf.REP INCREASED": { en: "REP INCREASED", ru: "РЕПУТАЦИЯ ВЫРОСЛА" },
  "nf.FACTION RELATIONS CHANGED": { en: "FACTION RELATIONS CHANGED", ru: "ОТНОШЕНИЯ ИЗМЕНИЛИСЬ" },
  "nf.DATA ACQUIRED": { en: "DATA ACQUIRED", ru: "ДАННЫЕ ПОЛУЧЕНЫ" },
  "nf.SYSTEM RECOVERY REQUIRED": { en: "IDENTITY RESET REQUIRED", ru: "ТРЕБУЕТСЯ СБРОС ЛИЧНОСТИ" },

  /* ---- session control ---- */
  "top.logout": { en: "DISCONNECT", ru: "ОТКЛЮЧИТЬСЯ" },
  "top.logoutTip": { en: "disconnect — return to the login terminal", ru: "отключиться — вернуться к терминалу входа" },
  "t.logout": { en: "session closed :: operator {op} disconnected", ru: "сеанс закрыт :: оператор {op} отключился" },
  "logout.title": { en: "CLOSE SESSION?", ru: "ЗАКРЫТЬ СЕАНС?" },
  "logout.body": {
    en: "You will return to the login terminal. Progress, CODEX and contracts stay saved.",
    ru: "Вы вернётесь к терминалу входа. Прогресс, КОДЕКС и контракты сохранятся.",
  },
  "logout.confirm": { en: "DISCONNECT", ru: "ОТКЛЮЧИТЬСЯ" },
  "logout.cancel": { en: "STAY ONLINE", ru: "ОСТАТЬСЯ" },

  /* ---- progress wipe ---- */
  "wipe.label": { en: "WIPE ALL PROGRESS", ru: "УДАЛИТЬ ВЕСЬ ПРОГРЕСС" },
  "wipe.hint": {
    en: "erases handle, REP, credits, CODEX, contracts and node states",
    ru: "стирает позывной, REP, кредиты, КОДЕКС, контракты и состояния узлов",
  },
  "wipe.confirm": { en: "CONFIRM — DELETE EVERYTHING", ru: "ПОДТВЕРДИТЬ — УДАЛИТЬ ВСЁ" },
  "wipe.cancel": { en: "cancel", ru: "отмена" },
  "wipe.warn": {
    en: "this cannot be undone. the grid will not remember you.",
    ru: "действие необратимо. сеть вас не вспомнит.",
  },
  "wipe.done": { en: "cold boot :: all operator data erased", ru: "холодный старт :: все данные оператора стёрты" },

  /* ---- breach mini-game ---- */
  "bg.title": { en: "GENIUS BREACH", ru: "ВЗЛОМ GENIUS" },
  "bg.abort": { en: "ABORT", ru: "ПРЕРВАТЬ" },
  "bg.dial1": { en: "ATDT {code} …", ru: "ATDT {code} …" },
  "bg.dial2": { en: "CONNECT 9600/ARQ/V.42", ru: "CONNECT 9600/ARQ/V.42" },
  "bg.dial3": { en: "negotiating X.25/PAD … ok", ru: "согласование X.25/PAD … ok" },
  "bg.dial4": { en: "WARDEN tier {w} detected — passive", ru: "обнаружен WARDEN уровня {w} — пассивен" },
  "bg.dial5": { en: "mapping internal topology …", ru: "построение внутренней топологии …" },
  "bg.dialHint": { en: "injecting intrusion stack — hold the line", ru: "внедрение стека проникновения — не бросайте линию" },
  "bg.entry": { en: "ENTRY", ru: "ВХОД" },
  "bg.access": { en: "ACCESS", ru: "ДОСТУП" },
  "bg.kind.RELAY": { en: "relay", ru: "ретранс" },
  "bg.kind.JUNCTION": { en: "junction", ru: "развязка" },
  "bg.kind.BUFFER": { en: "buffer", ru: "буфер" },
  "bg.kind.GATEWAY": { en: "gateway", ru: "шлюз" },
  "bg.quiet": { en: "WARDEN idle — move while it sleeps", ru: "WARDEN спит — двигайтесь, пока тихо" },
  "bg.traceWarn": { en: "trace in progress — reach ACCESS", ru: "идёт трассировка — дойдите до ДОСТУПА" },
  "bg.hops": { en: "hops {a}/{b}", ru: "переходов {a}/{b}" },
  "bg.hint": {
    en: "click a lit neighbour to route into it · one hop at a time",
    ru: "нажмите подсвеченный соседний элемент · по одному переходу за раз",
  },
  "bg.granted": { en: "ACCESS GRANTED", ru: "ДОСТУП ПОЛУЧЕН" },
  "bg.grantedSub": { en: "host compromised", ru: "узел взломан" },
  "bg.lockout": { en: "TRACED", ru: "ОБНАРУЖЕН" },
  "bg.lockoutSub": { en: "warden ejected you · -{n} REP", ru: "warden вышвырнул вас · -{n} REP" },

  /* breach console / notifications */
  "t.bgStart": { en: "GENIUS :: breach interface opened on {code}", ru: "GENIUS :: открыт интерфейс взлома {code}" },
  "t.bgAbort": { en: "breach aborted :: line dropped by operator", ru: "взлом прерван :: оператор сбросил линию" },
  "t.bgTimeout": { en: "WARDEN LOCKOUT :: trace completed, session ejected", ru: "БЛОКИРОВКА WARDEN :: трассировка завершена, сеанс сброшен" },
  "t.bgRepLoss": { en: "-{n} REP :: burned on a failed intrusion", ru: "-{n} REP :: потеряно на неудачном проникновении" },
  "nf.WARDEN LOCKOUT": { en: "WARDEN LOCKOUT", ru: "БЛОКИРОВКА WARDEN" },
  "e.bgTimeout": { en: "{code} traced the intrusion — operator ejected", ru: "{code} отследил проникновение — оператор выброшен" },

  /* ---- data vault (file system mini-game) ---- */
  "dv.title": { en: "FILE SYSTEM", ru: "ФАЙЛОВАЯ СИСТЕМА" },
  "dv.disconnect": { en: "LOG OFF", ru: "ВЫЙТИ" },
  "dv.dirs": { en: "{n} dirs", ru: "каталогов: {n}" },
  "dv.scanned": { en: "scanned {a}/{b}", ru: "просканировано {a}/{b}" },
  "dv.colName": { en: "filename", ru: "имя файла" },
  "dv.colSize": { en: "size", ru: "размер" },
  "dv.colDate": { en: "date", ru: "дата" },
  "dv.colScan": { en: "scan", ru: "скан" },
  "dv.scanBtn": { en: "scan", ru: "скан" },
  "dv.scanning": { en: "scanning…", ru: "сканирую…" },
  "dv.hit": { en: "◆ data", ru: "◆ данные" },
  "dv.read": { en: "read", ru: "текст" },
  "dv.clean": { en: "nothing", ru: "пусто" },
  "dv.hint": {
    en: "click a file to scan it for anything of value",
    ru: "нажмите на файл, чтобы просканировать его на ценность",
  },
  "dv.remaining": { en: "{n} target file(s) still hidden", ru: "скрыто целевых файлов: {n}" },
  "dv.allFound": { en: "all target data recovered", ru: "все целевые данные извлечены" },
  "dv.document": { en: "DOCUMENT", ru: "ДОКУМЕНТ" },
  "dv.recovered": { en: "DATA RECOVERED", ru: "ДАННЫЕ ИЗВЛЕЧЕНЫ" },
  "dv.stored": { en: "copied to DATA STORAGE", ru: "скопировано в ХРАНИЛИЩЕ ДАННЫХ" },
  "dv.close": { en: "close", ru: "закрыть" },
  "dv.logOpen": { en: "mounting volume on {code} :: file system online", ru: "монтирую том на {code} :: файловая система доступна" },
  "dv.logScan": { en: "scanning {name} …", ru: "сканирую {name} …" },
  "dv.logEmpty": { en: "{name} :: no value — discarded", ru: "{name} :: без ценности — отброшен" },
  "dv.logText": { en: "{name} :: readable document recovered", ru: "{name} :: восстановлен читаемый документ" },
  "dv.logOff": { en: "volume unmounted :: logged off the host", ru: "том размонтирован :: выход с узла" },
  "dos.enter": { en: "enter file system", ru: "войти в файловую систему" },
  "dos.vaultHint": {
    en: "data on this host must be located by hand — enter and scan the volume",
    ru: "данные на этом узле нужно искать вручную — войдите и просканируйте том",
  },
  "dos.recovered": { en: "Recovered from this host", ru: "Извлечено с этого узла" },

  /* ---- splash ---- */
  "sp.presents": { en: "CYBERTHING!  presents:", ru: "CYBERTHING!  представляет:" },
  "sp.tag": {
    en: "a modern hacking interface for operators who were never invited",
    ru: "современный хакерский интерфейс для операторов, которых никто не приглашал",
  },
  "sp.enter": { en: "press any key to continue", ru: "нажмите любую клавишу" },

  /* ---- breach v2 ---- */
  "bg.kind.CIPHER": { en: "cipher", ru: "шифр" },
  "bg.solve": { en: "solve {expr} = {n}s", ru: "решить {expr} = {n}с" },
  "bg.cost": { en: "{n}s", ru: "{n}с" },
  "bg.alarmSoon": { en: "WARDEN dormant — it wakes on its own", ru: "WARDEN дремлет — проснётся сам" },
  "bg.depth": { en: "depth {a}/{b}", ru: "глубина {a}/{b}" },
  "bg.hintHex": {
    en: "each cell shows a hex sum — its value is the seconds it costs",
    ru: "на каждом узле шестнадцатеричная сумма — её значение равно секундам",
  },
  "bg.scripts": { en: "scripts", ru: "скрипты" },
  "bg.frozen": { en: "TRACE STALLED", ru: "ТРАССИРОВКА ВСТАЛА" },
  "bg.cooldown": { en: "{n}s", ru: "{n}с" },
  "bg.noScripts": { en: "no scripts installed", ru: "скриптов нет" },

  /* ---- sabotage ---- */
  "dos.sabotage": { en: "RUN SABOTAGE", ru: "ЗАПУСТИТЬ ДИВЕРСИЮ" },
  "dos.sabotaged": { en: "HOST DISABLED", ru: "УЗЕЛ ВЫВЕДЕН ИЗ СТРОЯ" },
  "dos.sabHint": {
    en: "corporate host — it can be wrecked instead of robbed",
    ru: "корпоративный узел — его можно разрушить вместо ограбления",
  },
  "t.sabotage": { en: "SABOTAGE :: {code} logging stack burned down", ru: "ДИВЕРСИЯ :: стек журналирования {code} выжжен" },
  "e.sabotage": { en: "{code} disabled by operator", ru: "{code} выведен из строя оператором" },
  "cs.SABOTAGED": { en: "SABOTAGED", ru: "ДИВЕРСИЯ ВЫПОЛНЕНА" },
  "cs.FAILED": { en: "FAILED", ru: "ПРОВАЛЕН" },
  "co.confirm": { en: "REPORT DONE", ru: "ДОЛОЖИТЬ: ГОТОВО" },
  "co.kind.DATA": { en: "DATA RETRIEVAL", ru: "ДОБЫЧА ДАННЫХ" },
  "co.kind.SABOTAGE": { en: "SABOTAGE", ru: "ДИВЕРСИЯ" },

  /* ---- black market ---- */
  "bm.title": { en: "BLACK MARKET", ru: "ЧЁРНЫЙ РЫНОК" },
  "bm.open": { en: "BLACK MARKET", ru: "ЧЁРНЫЙ РЫНОК" },
  "bm.tab.sell": { en: "SELL", ru: "ПРОДАТЬ" },
  "bm.tab.buy": { en: "BUY", ru: "КУПИТЬ" },
  "bm.tab.jobs": { en: "JOBS", ru: "ЗАКАЗЫ" },
  "bm.locked": { en: "ACCESS NOT PURCHASED", ru: "ДОСТУП НЕ КУПЛЕН" },
  "bm.lockedBody": {
    en: "The kingdom does not advertise. Buy a standing introduction and the board opens — fencing, scripts and work the corporations will never post.",
    ru: "Королевство не рекламируется. Купи постоянную рекомендацию, и доска откроется: сбыт, скрипты и работа, которую корпорации никогда не выложат.",
  },
  "bm.buyAccess": { en: "BUY ACCESS · {n}cr", ru: "КУПИТЬ ДОСТУП · {n}cr" },
  "bm.needCr": { en: "insufficient credits", ru: "недостаточно кредитов" },
  "bm.sellEmpty": { en: "nothing to fence", ru: "сбывать нечего" },
  "bm.sell": { en: "SELL", ru: "ПРОДАТЬ" },
  "bm.owed": { en: "PROMISED TO {who}", ru: "ОБЕЩАНО: {who}" },
  "bm.spent": { en: "already fenced", ru: "уже сбыт" },
  "bm.spentWarn": {
    en: "this copy is already circulating — the board pays scrap for it",
    ru: "эта копия уже гуляет по сети — доска платит за неё гроши",
  },
  "bm.owedWarn": {
    en: "fencing this breaks the contract — the client will remember",
    ru: "сбыт сорвёт контракт — заказчик это запомнит",
  },
  "bm.owned": { en: "INSTALLED", ru: "УСТАНОВЛЕН" },
  "bm.buy": { en: "BUY · {n}cr", ru: "КУПИТЬ · {n}cr" },
  "bm.cd": { en: "cooldown {n}s", ru: "откат {n}с" },
  "bm.jobsEmpty": { en: "no underworld work at your standing", ru: "работы для вашего уровня нет" },
  "bm.jobsHint": {
    en: "crew contracts are posted here, never in the corporate channels",
    ru: "контракты группировок висят здесь, в корпоративных каналах их не бывает",
  },
  "bm.sold": { en: "sold for {n}cr", ru: "продано за {n}cr" },
  "bm.footer": { en: "unlisted services", ru: "нелегальные услуги" },
  "bm.inContacts": { en: "job running — report in CONTACTS", ru: "заказ в работе — отчёт в КОНТАКТАХ" },
  "t.jobTaken": { en: "job taken from the board :: {title}", ru: "заказ снят с доски :: {title}" },
  "bm.motto": { en: "no refunds · no names · no second chances", ru: "без возвратов · без имён · без второго шанса" },
  "t.marketOpen": { en: "black market introduction purchased :: board online", ru: "куплена рекомендация на чёрный рынок :: доска открыта" },
  "t.sold": { en: "fenced {name} :: +{n} credits", ru: "сбыт {name} :: +{n} кредитов" },
  "t.betray": { en: "CONTRACT BURNED :: {title}", ru: "КОНТРАКТ СОЖЖЁН :: {title}" },
  "t.script": { en: "script installed :: {name}", ru: "скрипт установлен :: {name}" },
  "t.scriptUse": { en: "script fired :: {name}", ru: "скрипт применён :: {name}" },

  /* ---- scripts in status ---- */
  "sp.scripts": { en: "INSTALLED SCRIPTS", ru: "УСТАНОВЛЕННЫЕ СКРИПТЫ" },
  "sp.noScripts": { en: "no scripts — buy them on the black market", ru: "скриптов нет — купите на чёрном рынке" },
  "sp.sold": { en: "data fenced", ru: "данных сбыто" },
  "sp.sabotage": { en: "sabotage runs", ru: "диверсий" },
  "sp.failed": { en: "contracts burned", ru: "сорвано контрактов" },

  /* ---- notifications ---- */
  "nf.CONTRACT FAILED": { en: "CONTRACT FAILED", ru: "КОНТРАКТ ПРОВАЛЕН" },
  "nf.DATA SOLD": { en: "DATA SOLD", ru: "ДАННЫЕ ПРОДАНЫ" },
  "nf.SCRIPT ACQUIRED": { en: "SCRIPT ACQUIRED", ru: "СКРИПТ ПОЛУЧЕН" },
  "nf.BLACK MARKET ONLINE": { en: "BLACK MARKET ONLINE", ru: "ЧЁРНЫЙ РЫНОК ОТКРЫТ" },
  "nf.SABOTAGE COMPLETE": { en: "SABOTAGE COMPLETE", ru: "ДИВЕРСИЯ ВЫПОЛНЕНА" },

  /* ---- hacker exchange ---- */
  "ex.title": { en: "HACKER EXCHANGE — REGISTRY", ru: "БАЗА ДАННЫХ ХАКЕРОВ" },
  "ex.indexing": { en: "indexing handles …", ru: "индексация позывных …" },
  "ex.listed": { en: "entry written", ru: "запись внесена" },
  "ex.you": { en: "YOU", ru: "ВЫ" },
  "ex.statusLabel": { en: "status", ru: "статус" },
  "ex.rookie": { en: "ROOKIE", ru: "НОВИЧОК" },

  /* ---- routing mini-game ---- */
  "rt.title": { en: "NETWORK ROUTING", ru: "СЕТЕВАЯ МАРШРУТИЗАЦИЯ" },
  "rt.hint": {
    en: "click a segment to rotate it — close the line from inlet to outlet",
    ru: "нажимайте на сегмент, чтобы повернуть — замкните линию от входа до выхода",
  },
  "rt.ready": { en: "CIRCUIT CLOSED", ru: "ЦЕПЬ ЗАМКНУТА" },
  "rt.broken": { en: "CIRCUIT BROKEN", ru: "ЦЕПЬ РАЗОРВАНА" },
  "rt.run": { en: "RUN", ru: "ЗАПУСК" },
  "rt.running": { en: "SIGNAL …", ru: "СИГНАЛ …" },
  "rt.inlet": { en: "inlet", ru: "вход" },
  "rt.outlet": { en: "outlet", ru: "выход" },
  "rt.linked": { en: "ROUTE OPEN", ru: "МАРШРУТ ОТКРЫТ" },
  "rt.linkedSub": { en: "relay under control", ru: "ретранслятор под контролем" },
  "t.rtStart": { en: "GENIUS :: routing layer exposed on {code}", ru: "GENIUS :: вскрыт слой маршрутизации {code}" },
  "t.rtWin": { en: "route committed :: {code} relays for you now", ru: "маршрут записан :: {code} теперь ретранслирует вам" },
  "dos.routing": { en: "connect · reroute relay", ru: "подключиться · перенастроить ретранслятор" },

  /* ---- WARDEN PASS ---- */
  "wp.banner": { en: "WARDEN PASS", ru: "СИСТЕМА ЗАЩИТЫ WARDEN PASS" },
  "wp.sub": { en: "host sealed · key required", ru: "узел запечатан · требуется ключ" },
  "wp.prompt": { en: "access key", ru: "ключ доступа" },
  "wp.ph": { en: "TYPE THE KEY", ru: "ВВЕДИТЕ КЛЮЧ" },
  "wp.submit": { en: "UNLOCK", ru: "ОТКРЫТЬ" },
  "wp.checking": { en: "verifying …", ru: "проверка …" },
  "wp.denied": { en: "ACCESS DENIED", ru: "ДОСТУП ЗАКРЫТ" },
  "wp.granted": { en: "ACCESS GRANTED", ru: "ДОСТУП ОТКРЫТ" },
  "wp.tries": { en: "{n} attempts logged", ru: "попыток в журнале: {n}" },
  "wp.foot": {
    en: "the key is never stored on the host it protects",
    ru: "ключ никогда не хранится на узле, который он защищает",
  },
  "t.wpDenied": { en: "WARDEN PASS :: key rejected on {code}", ru: "WARDEN PASS :: ключ отклонён на {code}" },
  "t.wpOk": { en: "WARDEN PASS :: key accepted, {code} open", ru: "WARDEN PASS :: ключ принят, {code} открыт" },
  "t.wpFound": { en: "KEY RECOVERED :: {code} — {key}", ru: "НАЙДЕН ПАРОЛЬ :: {code} — {key}" },
  "kb.copy": { en: "copy the key", ru: "скопировать ключ" },
  "kb.dismiss": { en: "dismiss", ru: "скрыть" },
  "nf.KEY RECOVERED": { en: "KEY RECOVERED", ru: "НАЙДЕН ПАРОЛЬ" },
  "dos.sealed": { en: "connect · WARDEN PASS", ru: "подключиться · WARDEN PASS" },

  /* ---- archive ---- */
  "arc.title": { en: "PERSONNEL ARCHIVE", ru: "КАДРОВЫЙ АРХИВ" },
  "arc.scanBtn": { en: "SCAN AND RESTORE ACCESS", ru: "ПРОСКАНИРОВАТЬ И ВОССТАНОВИТЬ ДОСТУП" },
  "arc.scanning": { en: "scanning spools …", ru: "сканирование катушек …" },
  "arc.sealed": { en: "sealed record found", ru: "обнаружена закрытая запись" },
  "arc.termTitle": {
    en: "CONFIDENTIAL. Staff termination order for the next 30 years.",
    ru: "Конфиденциально. Очередность увольнения сотрудников на ближайшие 30 лет.",
  },
  "arc.save": { en: "SAVE THE LIST", ru: "СОХРАНИТЬ СПИСОК" },
  "arc.saved": { en: "copied to DATA STORAGE", ru: "сохранено в ХРАНИЛИЩЕ ДАННЫХ" },
  "arc.restored": { en: "access restored — report back to the client", ru: "доступ восстановлен — доложите заказчику" },
  "arc.logScan": { en: "archive scan running …", ru: "идёт сканирование архива …" },
  "arc.logRestore": { en: "archive access restored on {code}", ru: "доступ к архиву восстановлен на {code}" },
  "arc.logTake": { en: "sealed record copied :: termination schedule", ru: "закрытая запись скопирована :: график увольнений" },
  "dos.archive": { en: "open archive", ru: "открыть архив" },
};

/* ================================================================== */

const interpolate = (s: string, p?: Record<string, string | number>) =>
  p ? s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? `{${k}}`)) : s;

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const e = DICT[key];
  if (!e) return key;
  return interpolate(e[lang], params);
}

/* ---------------------------------------------------------------- */

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LangCtx = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => store.get<Lang>("lang", "en"));

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    store.set("lang", l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);
