/* ==================================================================
   "LOCKED OUT" — operator_17's archive job.
   A hand-written conversation: each beat is pushed when its trigger
   fires, and the operator answers through choice buttons.
   ================================================================== */

export interface Line {
  en: string;
  ru: string;
}

export interface Beat {
  id: string;
  from: "op17" | "sablec" | "OP";
  line: Line;
  /** reply buttons rendered under this message */
  choices?: { id: string; en: string; ru: string }[];
}

export const L = (en: string, ru: string): Line => ({ en, ru });

/* ---------------- operator_17 opening ---------------- */

export const OP17_INTRO: Beat[] = [
  {
    id: "q1",
    from: "op17",
    line: L(
      "Hello. I have a small job. It is easy work and it pays badly, which is exactly why I am bringing it to a rookie. Interested?",
      "Привет. Есть небольшая работа. Работа легкая, плачу мало, потому и обращаюсь к новичку. Заинтересован?"
    ),
    choices: [{ id: "listen", en: "I am listening.", ru: "Я слушаю." }],
  },
];

export const OP17_BRIEF: Beat[] = [
  {
    id: "q2",
    from: "op17",
    line: L(
      "One of our people lost access to the archive on a corporate terminal. They installed the latest WARDEN PASS — no idea where they found the budget for that. Anyway: the access needs restoring.",
      "Один из наших сотрудников потерял доступ к архиву на корпоративном терминале. Они установили последнюю версию WARDEN PASS, не знаю откуда у них хватило на это денег. В общем, нужно восстановить доступ."
    ),
    choices: [{ id: "accept", en: "Taking the contract.", ru: "Принимаю контракт." }],
  },
];

export const OP17_ACCEPTED: Beat[] = [
  {
    id: "q3",
    from: "op17",
    line: L(
      "Good. He works in the Northline sector. And please — do not get caught. I would rather management never learned we hired a hacker to clean up our own mess.",
      "Хорошо. Он работает в секторе Northline. И пожалуйста, не попадись. Не хочу, чтобы начальство узнало что мы наняли хакера закрывать наши косяки."
    ),
  },
];

/* ---------------- hand the access back ---------------- */

export const OP17_DELIVER: Beat[] = [
  {
    id: "q4",
    from: "OP",
    line: L("Archive access restored.", "Доступ к архиву возвращен."),
  },
  {
    id: "q5",
    from: "op17",
    line: L(
      "Thank you. The payment is yours.",
      "Спасибо. Оплата твоя."
    ),
  },
];

/* the fork: does the operator mention what else was in there? */
export const OP17_FORK: Beat = {
  id: "q6",
  from: "op17",
  line: L("Anything else I should know about?", "Что-нибудь ещё, что мне следует знать?"),
  choices: [
    { id: "tell", en: "Tell him about the termination list", ru: "Рассказать о списках на увольнение" },
    { id: "hide", en: "Say nothing", ru: "Ничего не говорить" },
  ],
};

export const ARCHIVE_REL = {
  /** telling him with the file in hand */
  toldCivic: 18,
  toldIntercell: -30,
  /** telling him with nothing to show */
  emptyCivic: -8,
};

export const OP17_TOLD: Beat[] = [
  {
    id: "q7",
    from: "OP",
    line: L("One more thing. Look at this.", "И еще кое-что. Посмотри на это."),
  },
  {
    id: "q8",
    from: "op17",
    line: L(
      "That cannot be... How can they... I am not letting this go. Thank you.",
      "Не может быть... Как они могут... Я этого так просто не оставлю! Спасибо тебе!"
    ),
  },
];

/** told him, but the file is already gone — he refuses to believe it */
export const OP17_DISBELIEF: Beat[] = [
  {
    id: "q12",
    from: "OP",
    line: L(
      "There was a sealed list in that archive. Dismissal dates, thirty years out.",
      "В том архиве лежал закрытый список. Даты увольнений на тридцать лет вперёд."
    ),
  },
  {
    id: "q13",
    from: "op17",
    line: L(
      "Show me, then. ... You have nothing. You walk into my archive, you take something you will not show me, and you expect me to believe the company schedules people to die? Do not write to me with this again.",
      "Тогда покажи. ... У тебя ничего нет. Ты залез в мой архив, взял что-то, что не можешь показать, и хочешь, чтобы я поверил, будто компания расписывает людей на смерть? Больше не пиши мне с этим."
    ),
  },
];

export const SABLE_PUNISH: Beat = {
  id: "q9",
  from: "sablec",
  line: L("You have made a mistake.", "Ты совершил ошибку."),
};

export const SABLE_REWARD: Beat = {
  id: "q10",
  from: "sablec",
  line: L(
    "The right choice. I will keep you in mind. Talk soon.",
    "Правильный выбор. Буду держать тебя на примере. До связи."
  ),
};

export const SABLE_OFFER: Beat = {
  id: "q11",
  from: "sablec",
  line: L(
    "The list. Send it over and the transfer goes out immediately.",
    "Список. Отправь его мне, и перевод уйдёт сразу же."
  ),
  choices: [{ id: "sendsable", en: "Send the list to sable", ru: "Отправить список sable" }],
};

/* ---------------- payouts ---------------- */

export const ARCHIVE_PAY = {
  base: 200,        // operator_17, access restored
  sable: 400,       // sable, for the list
  repBase: 12,
  repSable: 8,
  relOp17Told: 18,
  relSable: 20,
  relOp17Hidden: 0,
  relSablePunish: -30,
};
