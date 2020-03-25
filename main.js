const Discord = require("discord.js");
const r = require("./control.js");
const c = require("./config.js");

const newdata = require("./data/newdata.js");
const enemydata = require("./data/enemy.js");
const skilldata = require("./data/skill.js");
const itemdata = require("./data/item.js");

const escape = (a) => a();
const code = (text,lang) => "```" + `${lang||""}\n${text}\n` + "```";
const embed = _ => new Discord.RichEmbed(_);

const client = new Discord.Client();

const commanding = new Discord.Collection();

const itemget = async (table="item", user, item, amount) => {
    return new Promise(async (res) => {
        let check = await r.read(table, {
            id: user,
            item: item,
        }, "amount");

        if( check ){
            await r.write(table, {
                id: user,
                item: item,
            }, {
                amount: amount + check.amount,
            });
            res();
        }else{
            await r.replace(table, user, {
                item: item,
                amount: amount,
            });
            res();
        }
    });
}

const skillselect = (arr,nores) => {
    let ski = null;
    arr.forEach((s,i)=>{
        if( ski )return;
        if( Math.floor(Math.random() * 100 + 1)<=s.per ){
            ski = s.name;
        }
    });
    return ski || (nores ? null : skillselect(arr));
}

client.on("ready", () => {
  client.user.setPresence({
    game: {
      name: `${c.prefix}help｜SAMPLE`,
    },
  });
});

const result = async (message, channel, content) => {
  let inbattle = await r.read("inbattle", {
    channel: message.channel.id,
  }, "id", true);
  
  let enemy = enemydata.find(e => e.code==channel.code);
  let exp = channel.level;
  let resultlog = [`参加者は ${exp} の経験値を獲得した！`];
  let itemlog = [];
  
  if( inbattle ){
    for( let i=0;i<inbattle.length;i++ ){
      let player = await r.read("player", inbattle[i].id);
      let user = client.users.get(inbattle[i].id);
      
      if( !player || !user ) continue;
      
      player.hp = Math.floor(Math.sqrt(player.exp)) * 5 + 50;
      player.mp = Math.floor(Math.sqrt(player.exp)) + 5;
      
      if( Math.floor(Math.sqrt(player.exp+exp)) > Math.floor(Math.sqrt(player.exp)) ){
        resultlog.push(`${user}はレベルアップした！\`Lv.${Math.floor(Math.sqrt(player.exp))} -> Lv.${Math.floor(Math.sqrt(player.exp+exp))}\``);
      }
      player.exp += exp;
      
      let itemgetlog = [];
      for( let v=0;v<enemy.drop.length;v++ ){
        let item = enemy.drop[v];
        if( item[2] >= Math.floor(Math.random() * 100 + 1) ){
          itemgetlog.push([item[0], inbattle[i].id]);
          await itemget("item", inbattle[i].id, item[0], item[1]);
        }
      }
      if( itemgetlog.length ) itemlog = itemlog.concat(itemgetlog);
      
      await r.write("player", inbattle[i].id, player);
      await r.write("inbattle", inbattle[i].id, {
        channel: "0",
      });
    }
  }
  
  if( itemlog.length ){
    let items = itemlog.filter((l,i,s) => s.indexOf(s.find(x => x[0]==l[0])) === i).map(m => m[0]);
    console.log(itemlog);
    
    for( var i=0;i<items.length;i++ ){
      let base = itemlog.filter(l => l[0] == items[i]);
      let item = itemdata.find(d => d.id == items[i][0]);
      
      resultlog.push(`${base.map(m => `<@${m[1]}>`).join("")}は${item.name}を手に入れた！`);
    }
  }
  
  await message.channel.send(content, embed({
    title: "RESULT",
    description: resultlog.join("\n"),
  })).catch(() => message.channel.send(embed({
    title: "RESULT",
    description: `勝利メッセージが2000文字を超えているため表示できません。`
  })));
  
  let next = escape(() => {
    let list = enemydata.filter(e => e.rare==0);
    if( enemydata.find(e => e.rare==2) && Math.floor(Math.random() * 1000 + 1)==1000 ){
      list = enemydata.filter(e => e.rare==2);
    }else if( enemydata.find(e => e.rare==1) && Math.floor(Math.random() * 100 + 1)<=3 ){
      list = enemydata.filter(e => e.rare==1);
    }
    return list[Math.floor(Math.random() * list.length)];
  });
  
  channel.level += 1;
  channel.code = next.code;
  channel.hp = channel.level * 10 + 50;
  channel.mp = channel.level + 5;
  
  await r.write(`channel`, message.channel.id, channel);
  await message.channel.send(embed({
    title: `${next.name}が現れた！\nLv.${channel.level} HP:${channel.hp} MP:${channel.mp}`,
    image: {
      url: next.img,
    },
  }));
  
  commanding.set(message.channel.id, false);
}

const _channel = async (message, action) => {
  let player = await r.read("player", message.author.id);
  let channel = await r.read("channel", message.channel.id);
  
  if( !player ){
    await r.replace("player", message.author.id, newdata.player);
    player = await r.read("player", message.author.id);
  }
  if( !channel ){
    await r.replace("channel", message.channel.id, newdata.channel);
    channel = await r.read("channel", message.channel.id);
  }
  
  let enemy = enemydata.find(e => e.code==channel.code);
  
  switch(action.do || action){
    case "sk":
      escape(async () => {
        if( commanding.get(message.channel.id) ){ // 見ればわかると思う
          return message.channel.send(`\`攻撃失敗。\``);
        }
        
        let inbattle = await r.read("inbattle", message.author.id);
        if( inbattle ){
          let inchannel = client.channels.get(inbattle.channel);
          if( message.channel != inchannel && inchannel ){
            return message.channel.send(`${message.author}は${inchannel}で戦闘中だ。`);
          }
        }
        if( player.hp<=0 ){
          return message.channel.send(`${message.author}はもう倒れています！`);
        }
        
        let skill = skilldata.find(s => s.name==action.skill);
        if( !skill ){
          return message.channel.send(`そのスキルは存在しません！`);
        }
        if( skill.learn>Math.floor(Math.sqrt(player.exp)) && !action.absolute ){
          return message.channel.send(`そのスキルはまだ使用できません！`);
        }
        
        commanding.set(message.channel.id, true); // 攻撃停止状態移行
        
        await r.replace("inbattle", message.author.id, message.channel.id); // 戦闘中チャンネルを設定
        
        if( action.item ){
          let has = await r.read("item", {
            id: message.author.id,
            item: action.item,
          }, "amount");
          await r.write("item", {
            id: message.author.id,
            item: action.item,
          }, {
            amount: has.amount - 1,
          });
        }
        
        let battlelog = [];
        let attack = (a) => { // 攻撃、ダメージ処理
          let damage = Math.round((a.skill.atk*(a.level*10+50)/3) / (25) * (Math.floor(Math.random() * 85 + 15) / 100));
          let smessage = a.skill.msg || `${a.an}の${a.skill.name}！`;
          
          if( a.skill.mp <= a.attack.mp ){
            a.attack.mp -= a.skill.mp;
            if( damage ){
              battlelog.push(`${a.pre}${smessage}${a.an}は${a.dn}に${damage}ダメージ与えた！`);
            }else{
              if( a.skill.type!=2 ){
                battlelog.push(`${a.pre}${smessage}${a.dn}には効いていない！`);
              }else{
                battlelog.push(`${a.pre}${smessage}`);
              }
            }
            a.defence.hp -= damage;
          }else{
            battlelog.push(`${a.pre}${smessage}MPが足りない！`);
          }
          battlelog.push(`${a.pre}${a.dn}の残りHP: ${a.defence.hp}`);
          
          if( a.defence.hp<0 ) a.defence.hp = 0;
          
          return [a.attack, a.defence];
        }
        
        let count = 0;
        let round = (s) => { // 行動順調整
          if( channel.hp<=0 ){
            return battlelog.push(`! ${enemy.name}を倒した！`);
          }
          if( player.hp<=0 ){
            return battlelog.push(`! ${message.author.username}は倒されてしまった...`);
          }
          if( count>=2 ) return;
          if( count>=1 ) battlelog.push("");
          count++;
          
          let res;
          if( s ){
            res = attack({
              pre: "+ ",
              skill: skill,
              level: Math.floor(Math.sqrt(player.exp)),
              attack: player,
              defence: channel,
              an: message.author.username,
              dn: enemy.name,
            });
            
            player = res[0];
            channel = res[1];
            
            return round(!s);
          }else{
            let enemyskill = skilldata.find(s => s.id==skillselect(enemy.skills));
            res = attack({
              pre: "- ",
              skill: enemyskill,
              level: channel.level,
              attack: channel,
              defence: player,
              an: enemy.name,
              dn: message.author.username,
            });
            
            channel = res[0];
            player = res[1];
            
            return round(!s);
          }
        }
        
        let speed = Math.floor(Math.sqrt(player.exp)) >= channel.level;
        if( skill.noreturn ){
          speed = true;
          count++;
        }
        
        round(speed); // trueにすると強制的にプレイヤーが先制するようになります
        
        let content = code(battlelog.join("\n"), "DIFF");
        
        if( channel.hp<=0 ){ // 撃破 (リザルト移行)
          result(message, channel, content); 
          return;
        } 
        
        await message.channel.send(content);
        
        await r.write("channel", message.channel.id, channel);
        await r.write("player", message.author.id, player);

        commanding.set(message.channel.id, false); // 攻撃停止状態解除
      });
      break;
    case "re":
      escape(async () => {
        if( commanding.get(message.channel.id) && !action.absolute ){
          return; 
        }
        commanding.set(message.channel.id, true);
        
        let inbattle = await r.read("inbattle", {
          channel: message.channel.id,
        }, "id", true);
        
        if( inbattle ){
          for( let i=0;i<inbattle.length;i++ ){
            let player2 = await r.read("player", inbattle[i].id);

            player2.hp = Math.floor(Math.sqrt(player2.exp))*5 + 50;
            player2.mp = Math.floor(Math.sqrt(player2.exp))+5;

            await r.write("player", inbattle[i].id, player2);
            await r.write("inbattle", inbattle[i].id, {
              channel: "0",
            });
          }
        }else{
          commanding.set(message.channel.id, false);
          return message.channel.send(`このチャンネルでは戦闘は行われていません。`);
        }
        
        let next = action.absolute ? escape(() => {
          let list = enemydata.filter(e => e.rare==0);
          return list[Math.floor(Math.random() * list.length)];
        }) : enemy;
        
        channel.code = enemy.code;
        channel.hp = channel.level*10+50;
        channel.mp = channel.level+5;
        
        await r.write(`channel`, message.channel.id, channel);
        await message.channel.send(embed({
          title: `${next.name}が現れた！\nLv.${channel.level} HP:${channel.hp} MP:${channel.mp}`,
          image: {
            url: next.img,
          },
        }));
        
        commanding.set(message.channel.id, false);
      });
      break;
    case "fix":
      if( commanding.get(message.channel.id) ){
        commanding.set(message.channel.id, false);
        message.channel.send(`連続攻撃制限状態を解除しました。`);
      }
      break;
  }
}

const _player = async (message, action) => {
  let player = await r.read("player", message.author.id);
  
  if( !player ){
    await r.replace("player", message.author.id, newdata.player);
    player = await r.read("player", message.author.id);
  }
  
  switch(action.do || action){
    case "st":
      escape(() => {
        let lv = Math.floor(Math.sqrt(player.exp));
        let skills = skilldata.filter(s => s.learn <= lv);
        let status = [
          `${message.author}のステータス`,
          `Lv.${lv} (経験値:${player.exp})`,
          `次のレベルまで: ${(lv+1)**2-player.exp}`,
          `HP: ${player.hp} / ${lv*5+50}`,
          `MP: ${player.mp} / ${lv+5}`,
          `習得スキル数: ${skills.length}`,
        ];
        if( c.admins.indexOf(message.author.id)!=-1 ){
          status.push(`\nあなたは【運営】だ。`);
        }else{
          status.push(`\nあなたは【普通のプレイヤー】だ。`);
        }
        if(status.length) message.channel.send(status.join("\n"));
      });
      break;
    case "item":
      escape(async () => {
        let use = itemdata.find(i => [i.id, i.name].indexOf(action.use)!=-1);
        let target = action.target;
        
        if( use ){
          if( player.hp<=0 ){
            return message.channel.send(`${message.author}はもう倒れています！`);
          }
          commanding.set(message.channel.id, true);
          
          let has = await r.read("item", {
            id: message.author.id,
            item: use.id,
          }, "amount");
          
          if( !has ){
            commanding.set(message.channel.id, false);
            return message.channel.send(`そのアイテムは存在しません。`);
          }
          if( !has.amount ){
            commanding.set(message.channel.id, false);
            return message.channel.send(`${message.author}は${use.name}を持っていません。`);
          }
          
          if( use.skill ){
            commanding.set(message.channel.id, false);
            return _channel(message, {
              do: "sk",
              skill: use.skill,
              absolute: true,
              item: use.id,
            });
          }
          
          let player2 = await r.read("player", target.id);
          if( !player2 ){
            commanding.set(message.channel.id, false);
            return message.channel.send(`${target}はまだゲームを始めていません。`);
          }
          
          let uselog = [];
          let HPheal = 0;
          let MPheal = 0;
          let p2lv = Math.floor(Math.sqrt(player2.exp));
          if( use.pray ){
            if( player2.hp<=0 ){
              player2.hp = 1;
              uselog.push(`${target}は復活した！`);
            }
          }
          if( player2.hp>0 ){
            if( !isNaN(use.hp) ){
              HPheal = Math.round(p2lv * use.hp);
              uselog.push(`${target}のHPが${HPheal}回復した！`);
            }
            if( !isNaN(use.mp) ){
              MPheal = Math.round(p2lv * use.mp);
              uselog.push(`${target}のMPが${MPheal}回復した！`);
            }
          }else{
            if( !isNaN(use.hp) ){
              uselog.push(`${target}は倒れていてこのアイテムではHPを回復できない...`);
            }
            if( !isNaN(use.mp) ){
              uselog.push(`${target}は倒れていてこのアイテムではMPを回復できない...`);
            }
          }
          
          if( HPheal ){
            player2.hp += HPheal;
            if( player2.hp > p2lv*5+50 ) player2.hp = p2lv*5+50;
          }
          if( MPheal ){
            player2.mp += MPheal;
            if( player2.mp > p2lv+5 ) player2.mp = p2lv+5;
          }
          
          await r.write("player", target.id, player2);
          player = await r.read("player", message.author.id);
          
          await r.write("item", {
            id: message.author.id,
            item: use.id,
          }, {
            amount: has.amount - 1,
          });
          
          await r.write("player", message.author.id, player);
          if(uselog.length) await message.channel.send(uselog.join("\n"));
          commanding.set(message.channel.id, false);
        }else{
          commanding.set(message.channel.id, true);
          let items = (await r.read("item", message.author.id, "*", true)) || [];
          
          if( !items.length ){
            items.push(`何も持っていません。`);
          }else{
            items = items.sort((a,b) => itemdata.find(t => a.item==t.id).pos - itemdata.find(t => b.item==t.id).pos).map(i => {
              let em = itemdata.find(t => t.id==i.item);
              return `${em.name} (\`${em.id}\`) - ${i.amount}個`;
            });
          }
          await message.channel.send(`${message.author}のアイテム\n\n${items.join("\n")}`);
          commanding.set(message.channel.id, false);
        }
      });
      break;
  }
}

client.on("message", message => {
  if( !message.guild || message.author.bot || !message.content.startsWith(c.prefix) ) return;
  
  let args = message.content.slice(c.prefix.length).split(/\s+/);
  switch(args[0]){
    case "wait":
      _channel(message, {
        do: "sk",
        skill: "何もしない",
      });
      break;
    case "atk":
    case "attack":
      _channel(message, {
        do: "sk",
        skill: "攻撃",
      });
      break;
    case "sk":
    case "skill":
      _channel(message, {
        do: "sk",
        skill: args[1],
      });
      break;
    case "re":
    case "reset":
      _channel(message, "re");
      break;
    case "fix":
      _channel(message, "fix");
      break;
    case "st":
    case "status":
      _player(message, "st");
      break;
    case "i":
    case "item":
      _player(message, {
        do: "item",
        use: args[1],
        target: message.mentions.members.first() || message.member,
      });
      break;
  }
});

client.login(c.token);
