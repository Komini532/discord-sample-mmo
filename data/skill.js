// デフォルト値
const def = {
  id: Infinity,
  name: "-",
  atk: 0,
  mp: 0,
  type: 0,
  learn: Infinity,
};

// スキルデータ
const skill = [
  {
    id: "wt",
    name: "何もしない",
    type: 2,
    learn: 1,
  },
  {
    id: "at",
    name: "攻撃",
    atk: 25,
    type: 0,
    learn: 1,
  },
  {
    id: "fb",
    name: "ファイアボール",
    msg: "ファイアボール！",
    noreturn: true,
    atk: 5,
    type: 1,
  },
];

skill.forEach((s,i) => {
  for( let key in def ){
    if( !s[key] ) s[key] = def[key];
  }
  skill[i] = s;
});

module.exports = skill;
