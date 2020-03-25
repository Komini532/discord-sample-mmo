// デフォルト値、パラメータの追加以外の変更はしないでください
const def = {
  code: "-", // 敵識別用コード
  name: "-", // 敵の名前
  rare: 0,   // レアリティ (0=通常, 1=レア, 2=超激レア)
  skills: [
    { name:"at", per:100 }, // { name:スキルID, per:抽選確率 }
  ],
  drop: [["f", 1, 5], ["i", 1, 5], ["t", 1, 5], ["e", 1, 1]], // 敵のドロップアイテム [ID, 個数, 確率]
  img: null, // 画像
};

// 敵データ
const enemy = [ // りんごをコピペして増やしてください
  {
    code: "apple",
    name: "りんご",
    img: "https://2.bp.blogspot.com/-oTqVMb3zbQ4/UgSMNNLY2wI/AAAAAAAAW-o/4nxDWnz7YsQ/s800/fruit_apple.png",
  },
  {
    code: "sudachi",
    name: "すだち",
    drop: [["f", 1, 100]],
    img: "https://4.bp.blogspot.com/--QpKczA5B4k/XGjyqjIrYwI/AAAAAAABRio/yn6NidsEc2c_qMAfreQsjVMl7wSVrIAyQCLcBGAs/s800/fruit_sudachi.png",
  },
];

enemy.forEach((e,i) => {
  for( let key in def ){
    if( !e[key] ) e[key] = def[key];
  }
  enemy[i] = e;
});

module.exports = enemy;
