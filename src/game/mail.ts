/* ============================================================
   MAIL — почтовые ящики на личных станциях (PRV).
   Это не «лут»: игрок читает переписку живых людей, а в одном
   из писем лежит пароль, который открывает следующий шаг сюжета.
   ============================================================ */

export interface L3 {
  en: string;
  ru: string;
  /** Если перевода нет — интерфейс откатывается на английский. */
  zh?: string;
}

export interface MailMsg {
  id: string;
  /** me — владелец ящика, them — собеседник. */
  who: "me" | "them";
  at: string;
  text: L3;
  /** Вложение: файл можно скачать и потом продать на чёрном рынке. */
  attach?: string;
}

export interface MailThread {
  id: string;
  with: string;
  role: L3;
  subject: L3;
  msgs: MailMsg[];
  /** Прочтение письма открывает пароль этого узла. */
  revealsKeyOf?: string;
  /** Автор письма просит его удалить. */
  deleteAsked?: boolean;
  /** Прочтение письма выставляет флаг (двигает сюжет). */
  setsFlag?: string;
}

export interface Mailbox {
  owner: string;
  address: string;
  /** Корпорация владельца — показывается в шапке клиента. */
  corp?: string;
  threads: MailThread[];
}

const T = (en: string, ru: string, zh?: string): L3 => ({ en, ru, zh });

export const MARROW_MAILBOX: Mailbox = {
  owner: "J. MARROW",
  corp: "Slayer Incorporated",
  address: "j.marrow@sly-northline.net",
  threads: [
    {
      id: "kessler",
      with: "D. KESSLER",
      role: T("sector manager · Northline", "управляющий сектора · Northline", "扇区经理 · Northline"),
      subject: T("Virtuality — update check", "Virtuality — проверка обновления", "Virtuality —— 更新验证"),
      revealsKeyOf: "w1n_crp",
      deleteAsked: true,
      msgs: [
        {
          id: "k1", who: "them", at: "09:12",
          text: T(
            "Marrow, the staff are asking how to test the latest Virtuality update. Nobody has a login for the construct since the audit reset everything. You are the only one with the access string and you are on leave. Can you send it?",
            "Марроу, сотрудники спрашивают, как проверить последнее обновление Virtuality. Ни у кого нет входа в конструкт с тех пор, как аудит всё сбросил. Строка доступа только у тебя, а ты в отпуске. Можешь прислать?",
            "Marrow，员工问怎么测试 Virtuality 的最新更新。自从审计把一切重置后，没人有进入构造体的登录。访问串只有你有，而你在休假。能发过来吗？"
          ),
        },
        {
          id: "k2", who: "me", at: "09:40",
          text: T(
            "Fine. I set a NEW password for Virtuality, give it to the staff so they can check the latest update:\n\nNL-VR-4471\n\nThen you MUST change it right afterwards — I mean it, Dennis. Send the new one back to me in a reply, and DELETE this letter. Do not forward it, do not print it. If it leaks, the whole Northline construct is open.",
            "Хорошо. Я поставил НОВЫЙ пароль от Virtuality, раздай его сотрудникам, чтобы они проверили последнее обновление:\n\nNL-VR-4471\n\nПотом ОБЯЗАТЕЛЬНО смени его — я серьёзно, Деннис. Новый пришли мне в ответном письме, а это письмо УДАЛИ. Не пересылай, не печатай. Если утечёт — весь конструкт Northline открыт.",
            "行。我给 Virtuality 设了个新密码，发给员工，让他们验证最新更新：\n\nNL-VR-4471\n\n之后你必须马上改掉——我是认真的，Dennis。把新密码在回信里发给我，然后把这封信删掉。别转发，别打印。一旦泄露，整个 Northline 构造体就敞开了。"
          ),
        },
        {
          id: "k3", who: "them", at: "09:44",
          text: T(
            "Understood. Will rotate it by the end of the day. Enjoy the sun.",
            "Понял. К концу дня сменю. Грейся на солнце.",
            "明白。今天下班前就换。好好晒太阳。"
          ),
        },
      ],
    },
    {
      id: "ops",
      with: "OPS-DESK",
      role: T("Slayer Incorporated · operations", "Slayer Incorporated · операции", "Slayer Incorporated · 行动处"),
      subject: T("Re: Takamuri hall incident", "Re: инцидент в зале Takamuri", "Re: Takamuri 大厅事件"),
      msgs: [
        {
          id: "o1", who: "them", at: "Yesterday",
          attach: "f_mail_marrow_roster",
          text: T(
            "Takamuri's people are telling their board that the blackout in their hall came from us. It did not. Someone walked through a loophole in their own Virtuality and pulled the breaker. Do not confirm anything, do not deny anything. Keep it quiet.",
            "Люди Takamuri говорят своему совету, что блэкаут в их зале устроили мы. Это не мы. Кто-то зашёл через лазейку в их собственный Virtuality и дёрнул рубильник. Ничего не подтверждайте и ничего не отрицайте. Тихо.",
            "Takamuri 的人对他们董事会说，他们大厅的停电是我们搞的。不是我们。有人从他们自家 Virtuality 的漏洞钻进去拉了闸。什么都别承认，什么都别否认。低调。"
          ),
        },
        {
          id: "o2", who: "me", at: "Yesterday",
          text: T(
            "Copy. I am on leave until the cast comes off. Call Kessler.",
            "Принял. Я в отпуске, пока не снимут швы. Звоните Кесслеру.",
            "收到。我休假到拆线为止。找 Kessler。"
          ),
        },
      ],
    },
    {
      id: "elena",
      with: "ELENA",
      role: T("home", "дом", "家人"),
      subject: T("Clinic follow-up", "Повторный приём в клинике", "诊所复查"),
      msgs: [
        {
          id: "e1", who: "them", at: "Mon",
          text: T(
            "The clinic in Northline called the house again. Gexogen says the port looks good. They want you back in six weeks. Please do not skip it because of work.",
            "Из клиники в Northline опять звонили домой. В Gexogen говорят, порт выглядит хорошо. Ждут тебя через шесть недель. Пожалуйста, не пропускай из-за работы.",
            "Northline 的诊所又往家里打电话了。Gexogen 说接口状态不错，六周后让你回去。别又因为工作跳过。"
          ),
        },
        {
          id: "e2", who: "me", at: "Mon",
          text: T(
            "I will go. I read my mail from the porch now, the signal is good.",
            "Схожу. Сейчас читаю почту с веранды, там хороший сигнал.",
            "我会去的。我现在在门廊上看邮件，信号不错。"
          ),
        },
      ],
    },
    {
      id: "paco",
      with: "PACO",
      role: T("neighbour", "сосед", "邻居"),
      subject: T("Saturday", "Суббота", "周六"),
      msgs: [
        {
          id: "p1", who: "them", at: "Sun",
          text: T(
            "River is low, the fish are lazy. Saturday? I bring the beer, you bring the good chair. Your generator is still making that sound.",
            "Река мелкая, рыба ленивая. В субботу? Я беру пиво, ты — то самое хорошее кресло. Твой генератор всё ещё издаёт этот звук.",
            "河水浅，鱼懒。周六去？我带啤酒，你带那把好椅子。你家发电机还在发那种怪声。"
          ),
        },
      ],
    },
    {
      id: "it",
      with: "NL-IT",
      role: T("Slayer Incorporated · IT", "Slayer Incorporated · ИТ", "Slayer Incorporated · IT"),
      subject: T("Policy reminder", "Напоминание о политике", "政策提醒"),
      msgs: [
        {
          id: "i1", who: "them", at: "Fri",
          text: T(
            "Reminder: access strings must never be sent by mail. This is an automated message. Nobody reads the replies.",
            "Напоминание: строки доступа нельзя отправлять по почте. Это автоматическое сообщение. Ответы никто не читает.",
            "提醒：访问串绝对不得通过邮件发送。此为自动消息，没人看回信。"
          ),
        },
      ],
    },
  ],
};

/* ============================================================
   Остальные личные станции (PRV). У каждого ящика один владелец
   и одна корпорация. Во вложениях лежат данные, которые можно
   утащить и продать на чёрном рынке.
   ============================================================ */

/** PRV-P04 — Marcus Hale, младший аудитор Intercell Synthetics. По вечерам держит варезную BBS. */
export const HALE_MAILBOX: Mailbox = {
  owner: "M. HALE",
  address: "m.hale@icx-pacific.net",
  corp: "Intercell Synthetics",
  threads: [
    {
      id: "hale_audit",
      with: "K. LUND",
      role: T("Intercell Synthetics · internal audit", "Intercell Synthetics · внутренний аудит"),
      subject: T("The subsidiary line — stop asking", "Дочерняя линия — хватит спрашивать"),
      msgs: [
        {
          id: "ha1", who: "me", at: "Tue 22:14",
          text: T(
            "Karin, I reconciled the Q4 routing twice. Forty million went to a company with no staff, no office and one phone number that rings in a laundromat. Who signs off on that?",
            "Карин, я дважды сверил маршрутизацию за Q4. Сорок миллионов ушли компании без сотрудников, без офиса и с единственным номером, который звонит в прачечной. Кто это подписывает?"
          ),
        },
        {
          id: "ha2", who: "them", at: "Wed 07:02",
          text: T(
            "Marcus. Delete your working copy. I mean it. I attached my draft only so you can see how deep this goes and why we do not touch it. Do NOT forward it, do NOT put it on that bulletin board of yours.",
            "Маркус. Удали рабочую копию. Я серьёзно. Свой черновик я прикладываю только затем, чтобы ты увидел, насколько глубоко это уходит и почему мы туда не лезем. НЕ пересылай, НЕ выкладывай на свою доску объявлений."
          ),
          attach: "f_mail_icx_audit",
        },
        {
          id: "ha3", who: "me", at: "Wed 07:30",
          text: T(
            "Understood. I am not a hero, Karin. Rent is due on the first.",
            "Понял. Я не герой, Карин. Аренда первого числа."
          ),
        },
      ],
    },
    {
      id: "hale_bbs",
      with: "LEECH_QUEEN",
      role: T("BBS user · ratio 0.02", "пользователь BBS · рейтинг 0.02"),
      subject: T("Please, just 200 MB of ratio", "Пожалуйста, хотя бы 200 МБ рейтинга"),
      msgs: [
        {
          id: "hb1", who: "them", at: "Mon 03:41",
          text: T(
            "Sysop, I got kicked from the board again. I seed all night but the modem eats half. Grant me some ratio and I will upload the whole 1991 ambient tape collection. Pinky promise.",
            "Сисоп, меня опять выкинуло с доски. Я раздаю всю ночь, но модем жрёт половину. Дай немного рейтинга, и я залью всю коллекцию эмбиент-лент 1991 года. Клянусь мизинцем."
          ),
        },
        {
          id: "hb2", who: "me", at: "Mon 09:12",
          text: T(
            "Rules are rules. Upload first, then we talk. I am exporting the ledger of who is currently on probation, check your name on it.",
            "Правила есть правила. Сначала заливка, потом разговоры. Выгружаю реестр тех, кто сейчас на испытательном, найди себя."
          ),
          attach: "f_mail_bbs_ledger",
        },
      ],
    },
    {
      id: "hale_scav",
      with: "SCAV//BUYER",
      role: T("Scavenger Kingdom · broker", "Scavenger Kingdom · брокер"),
      subject: T("Badge dump — name your price", "Дамп пропуска — назови цену"),
      msgs: [
        {
          id: "hs1", who: "them", at: "Thu",
          text: T(
            "Hale. We heard you carry an Intercell auditor badge. Photograph the chip, send the dump, and we pay in cash credits, no questions. Three times what the company pays you in a month.",
            "Хейл. Слышали, у тебя пропуск аудитора Intercell. Сфотографируй чип, пришли дамп, и мы платим живыми кредитами, без вопросов. В три раза больше, чем компания платит тебе за месяц."
          ),
        },
        {
          id: "hs2", who: "me", at: "Thu",
          text: T(
            "Not interested. Stop writing to this address.",
            "Не интересно. Больше не пишите на этот адрес."
          ),
        },
      ],
    },
    {
      id: "hale_mum",
      with: "MOM",
      role: T("home", "дом"),
      subject: T("Are you eating?", "Ты хоть ешь?"),
      msgs: [
        {
          id: "hm1", who: "them", at: "Sun",
          text: T(
            "Marcus, the landlord came again about the antenna on the roof. I told him it is for your radio hobby. Please eat something that is not a vending machine.",
            "Маркус, хозяин опять приходил из-за антенны на крыше. Я сказала, что это для твоего радиохобби. Пожалуйста, съешь что-нибудь, что не из автомата."
          ),
        },
      ],
    },
  ],
};

/** PRV-C04 — Rosalind «Roz» Kemp, диспетчер Slayer Incorporated в Midland. CB-радио по ночам. */
export const KEMP_MAILBOX: Mailbox = {
  owner: "R. KEMP",
  address: "r.kemp@sly-midland.net",
  corp: "Slayer Incorporated",
  threads: [
    {
      id: "kemp_convoy",
      with: "DISPATCH-7",
      role: T("Slayer Incorporated · logistics", "Slayer Incorporated · логистика"),
      subject: T("Night run — no manifest", "Ночной рейс — без манифеста"),
      msgs: [
        {
          id: "kc1", who: "them", at: "Mon 23:50",
          text: T(
            "Kemp, three trucks leave the Midland yard at 0200. They do not exist on the board. If anyone calls on the radio, they are grain haulers. The real manifest is attached, memorise it and burn the mail.",
            "Кемп, три грузовика выходят со двора Midland в 02:00. На доске их нет. Если кто-то спросит по радио — это зерновозы. Настоящий манифест в приложении, запомни и сожги письмо."
          ),
          attach: "f_mail_convoy",
        },
        {
          id: "kc2", who: "me", at: "Tue 00:10",
          text: T(
            "I log what I am told to log. But the weight on those trucks is wrong for grain. I am not asking. I am just saying.",
            "Я записываю то, что мне велят записывать. Но вес этих грузовиков не сходится с зерном. Я не спрашиваю. Я просто говорю."
          ),
        },
      ],
    },
    {
      id: "kemp_cb",
      with: "KOMA",
      role: T("relay jockey · channel 19", "ретранслятор-болтун · 19-й канал"),
      subject: T("you hear that on 19 again??", "ты опять слышала это на 19-м??"),
      msgs: [
        {
          id: "kb1", who: "them", at: "Wed",
          text: T(
            "roz roz roz. the trucks were talking on 27.355 again at 3am, all in numbers, a woman's voice, reading numbers. i taped it. you still keep that frequency log? send it, i will trade you a good antenna.",
            "роз роз роз. грузовики опять болтали на 27.355 в три ночи, одни цифры, женский голос читает цифры. я записал. у тебя ещё ведётся журнал частот? скинь, обменяю на хорошую антенну."
          ),
        },
        {
          id: "kb2", who: "me", at: "Wed",
          text: T(
            "Here is the night log. Do not post it anywhere. If it ends up on a board, someone from the company will know whose log it is.",
            "Вот ночной журнал. Нигде не выкладывай. Если он окажется на какой-нибудь доске, в компании поймут, чей он."
          ),
          attach: "f_mail_cbfreq",
        },
      ],
    },
    {
      id: "kemp_hr",
      with: "SLY-HR",
      role: T("Slayer Incorporated · people ops", "Slayer Incorporated · кадры"),
      subject: T("Reminder: radio chatter is logged", "Напоминание: радиообмен записывается"),
      msgs: [
        {
          id: "kh1", who: "them", at: "Fri",
          text: T(
            "Dispatch staff are reminded that personal use of company-licensed CB channels is monitored. Repeat violations affect overtime allocation. Have a productive week.",
            "Диспетчерам напоминаем: личное использование лицензированных компанией каналов CB отслеживается. Повторные нарушения влияют на распределение сверхурочных. Продуктивной недели."
          ),
        },
      ],
    },
    {
      id: "kemp_teo",
      with: "TEO",
      role: T("brother", "брат"),
      subject: T("Dad's truck", "Папин грузовик"),
      msgs: [
        {
          id: "kt1", who: "them", at: "Sat",
          text: T(
            "Roz, the old truck finally died. Mechanic says the engine is fine, the problem is the chip that talks to the bank. Can your people look at it? Or tell me who to bribe.",
            "Роз, старый грузовик наконец сдох. Механик говорит, что мотор в порядке, проблема в чипе, который общается с банком. Твои могут глянуть? Или скажи, кому дать на лапу."
          ),
        },
      ],
    },
  ],
};

/** PRV-G04 — Alan Whitlock, региональный директор по продажам Fusion Cybernetics (Gulf). Плавучий дом. */
export const WHITLOCK_MAILBOX: Mailbox = {
  owner: "A. WHITLOCK",
  address: "a.whitlock@fusion-gulf.net",
  corp: "Fusion Cybernetics",
  threads: [
    {
      id: "wh_restructure",
      with: "C. DAVENPORT",
      role: T("Fusion Cybernetics · HR partner", "Fusion Cybernetics · HR-партнёр"),
      subject: T("Q3 close — headcount actions (CONFIDENTIAL)", "Закрытие Q3 — кадровые решения (КОНФИДЕНЦИАЛЬНО)"),
      setsFlag: "kane_intel",
      msgs: [
        {
          id: "wr1", who: "them", at: "Thu 16:40",
          text: T(
            "Alan, finance signed off on the Q3 pool. The bonus tranche goes to your top three: Pierce, Okoye and you. Victor Kane is excluded. Per your note, his position moves to 'redundant' effective at quarter close. Notice letters go out the Friday after.",
            "Алан, финансы утвердили фонд Q3. Премиальный транш идёт твоей тройке: Пирс, Окойе и ты сам. Виктор Кейн исключён. Согласно твоей записке, его должность переводится в «избыточные» с закрытием квартала. Уведомления уйдут в пятницу после этого."
          ),
        },
        {
          id: "wr2", who: "me", at: "Thu 17:05",
          text: T(
            "Good. Kane keeps asking about his bonus. Tell him nothing, the committee is 'still deciding'. He is loud, he is expensive, and Pierce does the same work in half the time. He must not find out before the close — he holds too many client contacts.",
            "Хорошо. Кейн постоянно спрашивает про премию. Ничего ему не говори, комитет «ещё решает». Он шумный, дорогой, а Пирс делает ту же работу вдвое быстрее. До закрытия он не должен узнать — у него слишком много клиентских контактов."
          ),
        },
        {
          id: "wr3", who: "them", at: "Thu 17:12",
          text: T(
            "Understood. Redirecting his accounts to Pierce from Monday. Legal says severance is two weeks. I would call that generous.",
            "Принято. Его клиентов переводим на Пирс с понедельника. Юристы говорят, что выходное пособие — две недели. Я бы назвал это щедростью."
          ),
        },
      ],
    },
    {
      id: "wh_bonus",
      with: "FUS-FINANCE",
      role: T("Fusion Cybernetics · automated", "Fusion Cybernetics · автоматическая рассылка"),
      subject: T("Q3 bonus allocations — draft v4", "Распределение премий Q3 — черновик v4"),
      msgs: [
        {
          id: "wb1", who: "them", at: "Wed 11:00",
          text: T(
            "Attached is draft v4 of the Gulf region Q3 bonus allocation. Line items marked 0.00 will not be disbursed. Do not circulate outside the director group.",
            "Во вложении черновик v4 распределения премий Q3 по региону Gulf. Строки с пометкой 0.00 выплачиваться не будут. Не распространять за пределами директорской группы."
          ),
          attach: "f_mail_fus_bonus",
        },
      ],
    },
    {
      id: "wh_queue",
      with: "L. TRAN",
      role: T("Fusion Cybernetics · implant sales desk", "Fusion Cybernetics · отдел продаж имплантов"),
      subject: T("Priority overrides for the weekend", "Приоритетные подмены на выходные"),
      msgs: [
        {
          id: "wq1", who: "them", at: "Fri 18:20",
          text: T(
            "Mr Whitlock, three of your premium clients are impatient. Shall I move them ahead of the waiting list again? The queue will shift for roughly sixty people. I need your approval in writing.",
            "Мистер Уитлок, трое ваших премиальных клиентов нервничают. Снова поставить их впереди списка ожидания? Очередь сдвинется примерно у шестидесяти человек. Нужно ваше письменное согласие."
          ),
        },
        {
          id: "wq2", who: "me", at: "Fri 18:45",
          text: T(
            "Approved. Same as last time. The client list is attached — do not store it on the shared drive, and keep our names out of the log.",
            "Согласовано. Как в прошлый раз. Список клиентов во вложении — не хранить на общем диске, наши имена в журнал не вносить."
          ),
          attach: "f_mail_fus_priority",
        },
      ],
    },
    {
      id: "wh_dot",
      with: "DOT",
      role: T("home", "дом"),
      subject: T("The boat", "Лодка"),
      msgs: [
        {
          id: "wd1", who: "them", at: "Sun",
          text: T(
            "Alan, the houseboat generator is making that noise again and the neighbours' drone keeps filming our deck. Are you home for dinner Friday? The kids ask whether the promotion means you will finally stop travelling.",
            "Алан, генератор на плавучем доме опять шумит, а дрон соседей снова снимает нашу палубу. Ты дома на ужин в пятницу? Дети спрашивают, значит ли повышение, что ты наконец перестанешь разъезжать."
          ),
        },
        {
          id: "wd2", who: "me", at: "Sun",
          text: T(
            "Friday, yes. There is no promotion yet. Soon. One awkward quarter close and the regional chair is mine.",
            "В пятницу — да. Повышения пока нет. Скоро. Одно неприятное закрытие квартала, и региональное кресло моё."
          ),
        },
      ],
    },
    {
      id: "wh_doc",
      with: "DR. SUWA",
      role: T("private cybernetics clinic", "частная киберклиника"),
      subject: T("Left arm firmware — signed waiver", "Прошивка левой руки — подписанный отказ"),
      msgs: [
        {
          id: "wc1", who: "them", at: "Tue",
          text: T(
            "Mr Whitlock, the new firmware for your left arm improves grip response by eleven percent. It also reports usage telemetry to Fusion R&D. The waiver covers that. Same clause as your colleagues signed.",
            "Мистер Уитлок, новая прошивка вашей левой руки улучшает отклик хвата на одиннадцать процентов. Она также отправляет телеметрию использования в R&D Fusion. Отказ от претензий это покрывает. Тот же пункт подписывали ваши коллеги."
          ),
        },
      ],
    },
  ],
};

/** PRV-M03 — Dr. Inés Valcárcel, полевой биолог концессии Slayer Incorporated в джунглях. */
export const VALCARCEL_MAILBOX: Mailbox = {
  owner: "I. VALCARCEL",
  address: "i.valcarcel@sly-amazon.net",
  corp: "Slayer Incorporated",
  threads: [
    {
      id: "va_survey",
      with: "J. MARROW",
      role: T("Slayer Incorporated · security chief", "Slayer Incorporated · глава безопасности"),
      subject: T("Survey 7 — do not publish", "Изыскание 7 — не публиковать"),
      msgs: [
        {
          id: "vs1", who: "them", at: "Mon",
          text: T(
            "Doctor, the survey you filed shows the river corridor sitting on top of something that is not on our concession map. The board wants the findings sealed. Send me the full file, delete it from the field station and say nothing to the mission.",
            "Доктор, изыскание, которое вы сдали, показывает, что речной коридор лежит над чем-то, чего нет на карте нашей концессии. Совет хочет запечатать выводы. Пришлите мне полный файл, удалите его с полевой станции и ничего не говорите миссии."
          ),
        },
        {
          id: "vs2", who: "me", at: "Mon",
          text: T(
            "Attached. I kept the raw sensor data on the local drive as insurance. If something happens to my funding I will know why.",
            "Во вложении. Сырые данные датчиков я оставила на локальном диске — как страховку. Если что-то случится с моим финансированием, я буду знать почему."
          ),
          attach: "f_mail_amz_survey",
        },
      ],
    },
    {
      id: "va_mission",
      with: "FR. ANSELMO",
      role: T("mission radio keeper", "хранитель миссионерского радио"),
      subject: T("The tone on the old tapes", "Тон на старых лентах"),
      msgs: [
        {
          id: "vm1", who: "them", at: "Wed",
          text: T(
            "Inés, the carrier tone on the tapes is older than the backbone. I do not say it is a miracle. I say your instruments are wrong or the date is. Send me your field notes, I will compare them to what we recorded in '61.",
            "Инес, тон несущей на лентах старше магистрали. Я не говорю, что это чудо. Я говорю, что или ваши приборы врут, или дата. Пришлите полевые заметки, я сверю их с тем, что мы записали в 61-м."
          ),
        },
        {
          id: "vm2", who: "me", at: "Thu",
          text: T(
            "My notes, unedited. Please do not show them to the company's chaplain — he reports to Marrow.",
            "Мои заметки, без правок. Прошу, не показывайте их капеллану компании — он отчитывается перед Марроу."
          ),
          attach: "f_mail_amz_notes",
        },
      ],
    },
    {
      id: "va_lab",
      with: "SLY-BIOLAB",
      role: T("Slayer Incorporated · bio lab", "Slayer Incorporated · биолаборатория"),
      subject: T("Canopy sensors — power anomaly", "Датчики в кронах — аномалия питания"),
      msgs: [
        {
          id: "vl1", who: "them", at: "Tue",
          text: T(
            "Doctor, sensor nodes 14 to 19 report charging from the trees themselves. Voltage curve follows daylight. We marked it 'photosynthesis-powered (unverified)' and closed the ticket. Please do not reopen it.",
            "Доктор, датчики с 14 по 19 сообщают, что заряжаются от самих деревьев. Кривая напряжения следует за дневным светом. Мы пометили это как «питание от фотосинтеза (не подтверждено)» и закрыли заявку. Пожалуйста, не открывайте её снова."
          ),
        },
      ],
    },
    {
      id: "va_mama",
      with: "MAMÁ",
      role: T("home", "дом"),
      subject: T("When are you coming back?", "Когда ты вернёшься?"),
      msgs: [
        {
          id: "vh1", who: "them", at: "Sun",
          text: T(
            "Inés, mija, the neighbours saw company trucks on the river road again. Be careful out there. And eat something that did not come in a can.",
            "Инес, дочка, соседи опять видели грузовики компании на речной дороге. Береги себя там. И ешь что-нибудь, что не из банки."
          ),
        },
      ],
    },
  ],
};

/** Какие личные станции открывают почтовый клиент. */
export const MAILBOX_OF: Record<string, Mailbox> = {
  w1p_prv: HALE_MAILBOX,
  w1m_prv: KEMP_MAILBOX,
  w1g_prv: WHITLOCK_MAILBOX,
  wlz_prv: VALCARCEL_MAILBOX,
  wlp_prv: MARROW_MAILBOX,
};
