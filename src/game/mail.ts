/* ============================================================
   MAIL — почтовые ящики на личных станциях (PRV).
   Это не «лут»: игрок читает переписку живых людей, а в одном
   из писем лежит пароль, который открывает следующий шаг сюжета.
   ============================================================ */

export interface L3 {
  en: string;
  ru: string;
  zh: string;
}

export interface MailMsg {
  id: string;
  /** me — владелец ящика, them — собеседник. */
  who: "me" | "them";
  at: string;
  text: L3;
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
}

const T = (en: string, ru: string, zh: string): L3 => ({ en, ru, zh });

export const MARROW_MAILBOX: { owner: string; address: string; threads: MailThread[] } = {
  owner: "J. MARROW",
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

/** Какие личные станции открывают почтовый клиент. */
export const MAILBOX_OF: Record<string, typeof MARROW_MAILBOX> = {
  wlp_prv: MARROW_MAILBOX,
};
