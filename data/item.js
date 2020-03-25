const item = [
  {
    id: "f",
    name: "ファイアボール",
    skill: "ファイアボール",
  },
  {
    id: "i",
    name: "祈りの書",
    pray: true,
  },
  {
    id: "e",
    name: "エリクサー",
    pray: true,
    hp: 1,
  },
  {
    id: "t",
    name: "エーテル",
    mp: 0.25,
  },
  {
    id: "th",
    name: "thinking",
    msg: "🤔🤔🤔🤔🤔🤔",
  },
];

item.forEach((t,i) => {
  t.pos = i;
  item[i] = t;
})

module.exports = item;
