

export interface Line {
  en: string;
  ru: string;
  zh?: string;
}

export interface Beat {
  id: string;
  /** 结算金额，会在消息下方以醒目的方式显示。 */
  payout?: number;

  from: string;
  line: Line;

  choices?: { id: string; en: string; ru: string; zh?: string }[];

  contract?: string;
  action?: "offer" | "deliver" | "done";
}

export const L = (en: string, ru: string, zh?: string): Line => ({ en, ru, zh });

export const OP17_INTRO: Beat[] = [
  {
    id: "q1",
    from: "op17",
    line: L(
      "Hello. I have a small job. It is easy work and it pays badly, which is exactly why I am bringing it to a rookie. Interested?",
      "Привет. Есть небольшая работа. Работа легкая, плачу мало, потому и обращаюсь к новичку. Заинтересован?",
      "你好。手上有个小活。活不难，钱不多，所以才轮到新人头上。有兴趣吗？"
    ),
    choices: [{ id: "listen", en: "I am listening.", ru: "Я слушаю.", zh: "我听着。" }],
  },
];

export const OP17_BRIEF: Beat[] = [
  {
    id: "q2",
    from: "op17",
    line: L(
      "One of our people lost access to the archive on a corporate terminal. They installed the latest WARDEN PASS — no idea where they found the budget for that. Anyway: the access needs restoring.",
      "Один из наших сотрудников потерял доступ к архиву на корпоративном терминале. Они установили последнюю версию WARDEN PASS, не знаю откуда у них хватило на это денег. В общем, нужно восстановить доступ.",
      "我们有个同事把企业终端上的档案权限弄丢了。他们居然装上了最新版 WARDEN PASS —— 也不知道这笔预算是哪来的。总之：权限得恢复。"
    ),
    choices: [{ id: "accept", en: "Taking the contract.", ru: "Принимаю контракт.", zh: "这单我接了。" }],
  },
];

export const OP17_ACCEPTED: Beat[] = [
  {
    id: "q3",
    from: "op17",
    line: L(
      "Good. He works in the **NORTHLINE** sector. And please — do not get caught. I would rather management never learned we hired a hacker to clean up our own mess.",
      "Хорошо. Он работает в секторе **NORTHLINE**. И пожалуйста, не попадись. Не хочу, чтобы начальство узнало что мы наняли хакера закрывать наши косяки.",
      "很好。他在 **NORTHLINE** 扇区上班。还有 —— 千万别被抓。我可不想让上面知道我们雇了黑客来擦自己的屁股。"
    ),
  },
];

/* 玩家在接单之前就自己撬开了档案库：接单时直接摊牌。 */
export const OP17_PREBREACHED: Beat[] = [
  {
    id: "q2b",
    from: "OP",
    line: L(
      "Already did it. Your archive is open — I cracked it before you asked. Wait.",
      "Уже взломал. Твой архив открыт — я вскрыл его ещё до твоей просьбы. Жди.",
      "已经办了。你那档案库我早撬开了 —— 在你开口之前。等着。"
    ),
  },
  {
    id: "q2c",
    from: "op17",
    line: L(
      "You... what? Before I even sent the job? How did you know which terminal?",
      "Ты... что? Ещё до того, как я отправил заказ? Откуда ты знал, какой терминал?",
      "你……什么？在我派单之前？你怎么知道是哪台终端？"
    ),
  },
  {
    id: "q2d",
    from: "op17",
    line: L(
      "Never mind. I do not want to know. The index is wrecked, but access is access — go pull the key and send it over.",
      "Хотя нет. Знать не хочу. Индекс разворочен, но доступ есть доступ — забери ключ и пришли мне.",
      "算了，我不想知道。索引是毁了，但权限到底是权限 —— 去把密钥取出来发我。"
    ),
  },
];

export const OP17_READY: Beat[] = [
  {
    id: "q3b",
    from: "op17",
    line: L(
      "You are in? Good. Push the access key over and I will close the ticket.",
      "Ты внутри? Хорошо. Перебрось ключ доступа, и я закрою заявку.",
      "进去了？好。把访问密钥丢过来，我就销单。"
    ),
    contract: "ct_archive",
    action: "deliver",
  },
];

export const OP17_DELIVER: Beat[] = [
  {
    id: "q4",
    from: "OP",
    line: L("Archive access restored.", "Доступ к архиву возвращен.", "档案权限已恢复。"),
  },
  {
    id: "q5",
    from: "op17",
    payout: 200,          // = ARCHIVE_PAY.base，金额随消息一起显示
    line: L(
      "Thank you. The payment is yours.",
      "Спасибо. Оплата твоя.",
      "谢了。钱归你。"
    ),
  },
];

export const OP17_FORK: Beat = {
  id: "q6",
  from: "op17",
  /* 没有台词——只留两个按钮让玩家自己决定。 */
  line: L("", "", ""),
  choices: [
    { id: "tell", en: "Tell him about the termination list", ru: "Рассказать о списках на увольнение", zh: "把裁员名单的事告诉他" },
    { id: "hide", en: "Say nothing", ru: "Ничего не говорить", zh: "什么都不说" },
  ],
};

export const ARCHIVE_REL = {

  toldCivic: 18,
  toldIntercell: -30,

  emptyCivic: -8,
};

export const OP17_TOLD: Beat[] = [
  {
    id: "q7",
    from: "OP",
    line: L("One more thing. Look at this.", "И еще кое-что. Посмотри на это.", "还有件事。看看这个。"),
  },
  {
    id: "q8",
    from: "op17",
    line: L(
      "That cannot be... How can they... I am not letting this go. Thank you.",
      "Не может быть... Как они могут... Я этого так просто не оставлю! Спасибо тебе!",
      "不可能……他们怎么敢……这事我不会就这么算了。谢谢你。"
    ),
  },
];

export const OP17_DISBELIEF: Beat[] = [
  {
    id: "q12",
    from: "OP",
    line: L(
      "There was a sealed list in that archive. Dismissal dates, thirty years out.",
      "В том архиве лежал закрытый список. Даты увольнений на тридцать лет вперёд.",
      "那个档案库里有一份封存名单。裁员日期都排到三十年后了。"
    ),
  },
  {
    id: "q13",
    from: "op17",
    line: L(
      "Show me, then. ... You have nothing. You walk into my archive, you take something you will not show me, and you expect me to believe the company schedules people to die? Do not write to me with this again.",
      "Тогда покажи. ... У тебя ничего нет. Ты залез в мой архив, взял что-то, что не можешь показать, и хочешь, чтобы я поверил, будто компания расписывает людей на смерть? Больше не пиши мне с этим.",
      "那就拿给我看。……你什么都没有。你进了我的档案库，拿了不敢给我看的东西，还想让我相信公司在给人排死期？这事以后别再找我。"
    ),
  },
];

export const SABLE_PUNISH: Beat = {
  id: "q9",
  from: "sablec",
  line: L("You have made a mistake.", "Ты совершил ошибку.", "你犯了个错误。"),
};

export const SABLE_REWARD: Beat = {
  id: "q10",
  from: "sablec",
  line: L(
    "The right choice. I will keep you in mind. Talk soon.",
    "Правильный выбор. Буду держать тебя на примере. До связи.",
    "选得对。我记住你了。回头聊。"
  ),
};

export const SABLE_OFFER: Beat = {
  id: "q11",
  from: "sablec",
  line: L(
    "The list. Send it over and the transfer goes out immediately.",
    "Список. Отправь его мне, и перевод уйдёт сразу же.",
    "名单。发过来，转账立刻到。"
  ),
  choices: [{ id: "sendsable", en: "Send the list to sable", ru: "Отправить список sable", zh: "把名单发给 sable" }],
};

export const ARCHIVE_PAY = {
  base: 200,        // operator_17：访问已恢复
  sable: 400,       // sable：购买名单
  repBase: 12,
  repSable: 8,
  relOp17Told: 18,
  relSable: 20,
  relOp17Hidden: 0,
  relSablePunish: -30,
};

export const FREDDY_IMPLANT: Beat[] = [
  {
    id: "fi1", from: "freddy",
    line: L("Hi — can you help me?", "Привет, вы можете мне помочь?", "嗨 —— 能帮个忙吗？"),
    choices: [{ id: "fi_what", en: "What do you need?", ru: "Что нужно?", zh: "你需要什么？" }],
  },
];

export const FREDDY_IMPLANT_2: Beat[] = [
  {
    id: "fi2", from: "freddy",
    line: L(
      "My sister was in the queue for a new implant. Her turn was coming up — she was due to get it this month. Then a notice arrived: force majeure, the queue is pushed back a year.",
      "Моя сестра стояла в очереди за новым имплантом. Её время подходило, в этом месяце должны были отдать новый. Но пришло уведомление, что из-за форс-мажорных обстоятельств очередь перенесена на год.",
      "我妹妹本来在排队等新植入体。眼看这个月就轮到她了。结果来了张通知：不可抗力，排队往后推一年。"
    ),
    choices: [{ id: "fi_ask", en: "What do you want from me?", ru: "От меня что требуется?", zh: "要我干嘛？" }],
  },
];

export const FREDDY_IMPLANT_3: Beat[] = [
  {
    id: "fi3", from: "freddy",
    line: L(
      "I want to crack the Fusion Cybernetics server and find the reason. I will pay!",
      "Я хочу вскрыть сервер Fusion Cybernetics и найти причину. Я заплачу!",
      "我想黑进 Fusion Cybernetics 的服务器查清原因。我给钱！"
    ),
    choices: [{ id: "fi_ok", en: "All right.", ru: "Хорошо.", zh: "行。" }],
  },
];

export const FREDDY_IMPLANT_4: Beat[] = [
  {
    id: "fi4", from: "freddy",
    line: L("Excellent! The server is somewhere in **GULF RELAY**!", "Отлично! Сервер где-то в **GULF RELAY**!", "太好了！服务器就在 **GULF RELAY** 一带！"),
  },
];

/* 玩家在接活之前就已经把备忘录搞到手了 */
export const FREDDY_IMPLANT_PRE: Beat[] = [
  {
    id: "fi4b", from: "OP",
    line: L(
      "Already have it. I was inside that server before you wrote.",
      "Он уже у меня. Я был в том сервере ещё до того, как ты написал.",
      "已经拿到了。你发消息之前我就进过那台服务器。"
    ),
  },
  {
    id: "fi4c", from: "freddy",
    line: L(
      "You... already? I have not even told you which company. Who are you?",
      "Ты... уже? Я ведь даже не сказал, какая компания. Ты вообще кто?",
      "你……已经拿到了？我连是哪家公司都还没说。你到底是谁？"
    ),
  },
  {
    id: "fi4d", from: "freddy",
    line: L(
      "Forget it. Just send it over, please. I need to see it.",
      "Неважно. Просто пришли, пожалуйста. Мне нужно это увидеть.",
      "算了。拜托，直接发我吧。我得亲眼看看。"
    ),
    choices: [{ id: "fi_send", en: "Send the memo", ru: "Отправить документ", zh: "把文件发过去" }],
  },
];

/* 备忘录早就被卖掉了——这单根本交不了 */
export const FREDDY_IMPLANT_SOLD: Beat[] = [
  {
    id: "fi4g", from: "OP",
    line: L(
      "I had that memo. I sold it before you wrote to me.",
      "Эта записка у меня была. Я продал её ещё до того, как ты написал.",
      "那份备忘我拿到过。在你联系我之前就卖掉了。"
    ),
  },
  {
    id: "fi4h", from: "freddy",
    line: L(
      "You sold it? To whom? That was my sister's place in the queue, and you sold it.",
      "Продал? Кому? Там была очередь моей сестры, а ты её продал.",
      "你卖了？卖给谁了？那是我妹妹的队位，你把它卖了。"
    ),
  },
  {
    id: "fi4i", from: "freddy",
    line: L(
      "Do not write to me again.",
      "Больше мне не пиши.",
      "别再联系我了。"
    ),
  },
];

/* 服务器已经被拿下，但文件还没到手 */
export const FREDDY_IMPLANT_BREACHED: Beat[] = [
  {
    id: "fi4e", from: "OP",
    line: L(
      "I am already inside that server. Give me a minute.",
      "Я уже внутри этого сервера. Дай минуту.",
      "我已经在那台服务器里了。给我一分钟。"
    ),
  },
  {
    id: "fi4f", from: "freddy",
    line: L(
      "Already inside? I did not even name it yet. Fine — find the sales memo, that is all I need.",
      "Уже внутри? Я ведь даже не назвал его. Ладно — найди записку отдела продаж, больше ничего не нужно.",
      "已经进去了？我都还没说是哪台。行吧 —— 找到销售部那份备忘就够了。"
    ),
  },
];

export const FREDDY_IMPLANT_HOLD: Beat[] = [
  {
    id: "fi5", from: "freddy",
    line: L(
      "Did you get anything? Send it over, I want to read it myself.",
      "Ты что-нибудь нашёл? Присылай, я хочу прочитать сам.",
      "查到东西了吗？发我，我要亲眼看。"
    ),
    choices: [{ id: "fi_send", en: "Send the memo", ru: "Отправить документ", zh: "把文件发过去" }],
  },
];

export const FREDDY_IMPLANT_DONE: Beat[] = [
  {
    id: "fi6", from: "OP",
    line: L("Here. This is why her slot moved.", "Вот. Из-за этого её очередь и сдвинули.", "拿去。她的队位就是因此被挪走的。"),
  },
  {
    id: "fi7", from: "freddy",
    line: L("Those absolute bastards!", "Вот же сволочи!", "这帮混蛋！"),
  },
  {
    id: "fi8", from: "freddy",
    line: L(
      "The colour. He did not like the COLOUR. And they went down the list looking for someone with nobody to stand up for them, and they picked her because she is nobody. Because she would not cause problems.",
      "Цвет. Ему не понравился ЦВЕТ. И они пошли по списку искать того, за кого некому заступиться, и выбрали её, потому что она никто. Потому что она не создаст проблем.",
      "颜色。他竟然嫌弃颜色。他们就照着名单专挑没人撑腰的下手，选中她是因为她什么也不是。因为她惹不起麻烦。"
    ),
  },
  {
    id: "fi9", from: "freddy",
    line: L(
      "She waited two years. Thank you for finding this. I do not know what I am going to do with it yet, but I am keeping it.",
      "Она ждала два года. Спасибо, что нашёл. Пока не знаю, что с этим делать, но я это так не оставлю.",
      "她等了整整两年。谢谢你查出来。我还没想好拿它怎么办，但这东西我留下了。"
    ),
  },
];

export const MARLA_PROJ: Beat[] = [
  {
    id: "mp1", from: "marla",
    line: L(
      "You take work, yes? Nothing heroic. I need a room to go dark.",
      "Ты ведь берёшь работу? Ничего героического. Мне нужно, чтобы один зал погас.",
      "你接活儿吧？不是什么英雄壮举。我要让一个厅黑下来。"
    ),
    choices: [{ id: "mp_which", en: "Which room?", ru: "Какой зал?", zh: "哪个厅？" }],
  },
];

export const MARLA_PROJ_2: Beat[] = [
  {
    id: "mp2", from: "marla",
    line: L(
      "The presentation hall booked through the Takamuri freight desk in **PACIFIC EXCHANGE**. My ex is on stage there today, and he has been rehearsing that slide deck for a month.",
      "Презентационный зал, который бронируют через грузовой отдел Takamuri в секторе **PACIFIC EXCHANGE**. Сегодня там на сцене мой бывший, он этот показ репетировал целый месяц.",
      "经 **PACIFIC EXCHANGE** 的 Takamuri 货运部订的那个演示厅。今天我前夫在那儿登台，那套幻灯他排了一个月。"
    ),
    choices: [{ id: "mp_why", en: "And you want the projectors down.", ru: "И ты хочешь, чтобы проекторы вырубились.", zh: "所以你想让投影全灭。" }],
  },
];

export const MARLA_PROJ_3: Beat[] = [
  {
    id: "mp3", from: "marla",
    line: L(
      "The projector rigs hang off the same controller as the freight index. Knock it over and the hall is dark for a few hours. Petty? Completely. I am still paying.",
      "Проекторы висят на том же контроллере, что и грузовой индекс. Опрокинь его — зал погаснет на несколько часов. Мелочно? Абсолютно. Платить я всё равно буду.",
      "投影仪和货运索引挂在同一个控制器上。撂倒它，厅就黑几个小时。小家子气？十足的小家子气。可钱我照付。"
    ),
    choices: [{ id: "mp_ok", en: "Taking it.", ru: "Берусь.", zh: "接了。" }],
  },
];

export const MARLA_PROJ_READY: Beat[] = [
  {
    id: "mp4", from: "marla",
    line: L("CRP-P06. Today. Do not miss.", "CRP-P06. Сегодня. Только не промахнись.", "CRP-P06。今天。别失手。"),
  },
];

export const MARLA_PROJ_ALREADY: Beat[] = [
  {
    id: "mp5", from: "marla",
    line: L(
      "Wait — you are already inside that host? Even better. Then you only have to pull the plug.",
      "Погоди — ты уже внутри этого узла? Тогда ещё круче. Остаётся только дёрнуть рубильник.",
      "等等 —— 你已经在那台主机里了？更妙。那你只剩拉闸这一步。"
    ),
  },
];

/* 还没接活，机器就已经被砸了 */
export const MARLA_PROJ_WRECKED: Beat[] = [
  {
    id: "mp5b", from: "OP",
    line: L(
      "That controller is already dead. I wrecked it earlier.",
      "Тот контроллер уже мёртв. Я вывел его из строя раньше.",
      "那台控制器早就废了。我先前就把它砸了。"
    ),
  },
  {
    id: "mp5c", from: "marla",
    line: L(
      "You are joking. Before I even asked? ... I love this city. Confirm it and take the money.",
      "Шутишь. Ещё до моей просьбы? ... Обожаю этот город. Подтверди и забирай деньги.",
      "开玩笑吧。在我开口之前？……我爱死这座城了。确认一下，钱拿走。"
    ),
    contract: "sb_projector",
    action: "deliver",
  },
];

export const MARLA_PROJ_DONE: Beat[] = [
  {
    id: "mp6", from: "marla",
    line: L(
      "The hall is dark. I can hear it from the street. Worth every credit.",
      "Зал погас. Это слышно даже с улицы. Каждый кредит того стоил.",
      "厅黑了。我在街上都听见了。每个信用点都花得值。"
    ),
  },
];

export const OP17_SOLD_REFUSAL: Beat[] = [
  {
    id: "q14", from: "OP",
    line: L(
      "There was a sealed termination list in that archive.",
      "В том архиве лежал закрытый список на увольнение.",
      "那个档案库里有一份封存的裁员名单。"
    ),
  },
  {
    id: "q15", from: "op17",
    line: L(
      "What? Are you trying to shake me down? I have worked for them for fifteen years and I will never believe a thing like that. Think you are clever? Get lost.",
      "Что? Ты меня на бабки развести пытаешься? Я на них работаю уже 15 лет и никогда в жизни не поверю в такое. Думаешь ты такой умный? Вали к черту!",
      "什么？你想讹我钱？我给他们干了十五年，这种事我死也不信。觉得自己很聪明？一边凉快去！"
    ),
  },
];

export const FREDDY_PAY = { implant: 350 };
export const MARLA_PAY = { proj: 300 };
