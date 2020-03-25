const sqlite = require("./db.js");
const db = sqlite.init("database");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS player(id text unique, exp int, g int, hp int, mp int)`);
  db.run(`CREATE TABLE IF NOT EXISTS channel(id text unique, code text, level int, hp int, mp int)`);
  
  db.run(`CREATE TABLE IF NOT EXISTS item(id text, item text, amount int)`);
  db.run(`CREATE TABLE IF NOT EXISTS inbattle(id text unique, channel text)`);
});

const r = {
    new: async (table, id, content) => {
        return new Promise((res) => {
            let objfix;
            if( Array.isArray(content) ){
                content = content.map(c => typeof c=="string" ? `"${c}"` : c).join("\n");
            }else if( typeof content == "object" ){
                objfix = ["id"];
                let re = [];
                for( let key in content ){
                    objfix.push(key);
                    re.push(typeof content[key]=="string" ? `"${content[key]}"` : content[key]);
                }
                content = re.join(", ");
                objfix = `(${objfix.join(", ")})`;
            }else{
                if( typeof content=="string" ){
                    content = `"${content}"`;
                }
            }
            db.serialize(() => {
                let text = `INSERT INTO ${table}${objfix||""} VALUES('${id}',${content})`;
                console.warn(text);
                db.run(text);
                res();
            });
        });
    },
    replace: async (table, id, content) => {
        return new Promise((res) => {
            let objfix;
            if( Array.isArray(content) ){
                content = content.map(c => typeof c=="string" ? `"${c}"` : c).join("\n");
            }else if( typeof content == "object" ){
                objfix = ["id"];
                let re = [];
                for( let key in content ){
                    objfix.push(key);
                    re.push(typeof content[key]=="string" ? `'${content[key]}'` : content[key]);
                }
                content = re.join(", ");
                objfix = `(${objfix.join(", ")})`;
            }else{
                if( typeof content=="string" ){
                    content = `"${content}"`;
                }
            }
            db.serialize(() => {
                let text = `REPLACE INTO ${table}${objfix||""} VALUES('${id}',${content})`;
                console.warn(text);
                db.run(text);
                res();
            });
        });
    },
    write: async (table, id, content) => {
        return new Promise((res) => {
            db.serialize(() => {
                if( typeof id!="string" ){
                    let re = [];
                    for( let key in id ) re.push(`${key} = ${typeof id[key]=="string" ? `"${id[key]}"` : id[key]}`);
                    id = re.join(" and ");
                }else{
                    id = `id = "${id}"`;
                }
                if( typeof content!="string" ){
                    let re2 = [];
                    for( let key in content ) re2.push(`${key} = ${typeof content[key]=="string" ? `"${content[key]}"` : content[key]}`);
                    content = re2.join(", ");
                }
    
                let text = `UPDATE ${table} SET ${content} WHERE ${id};`;
                console.log(text);
                db.run(text);
                res();
            });
        });
    },
    read: async (table, id, select, getall) => {
        return new Promise((res, rej) => {
            if( typeof id!="string" ){
                let re = [];
                for( let key in id ) re.push(`${key} = ${typeof id[key]=="string" ? `"${id[key]}"` : id[key]}`);
                id = re.join(" and ");
            }else{
                id = `id = "${id}"`;
            }
            if( typeof select!="string" ){
                if( Array.isArray(select) ){
                    select = select.join(", ")
                }else{
                    select = "*";
                }
            }
            db.serialize(() => {
                let text = `SELECT ${select} FROM ${table} WHERE ${id};`;
                console.log(text);
                if( !getall ){
                    db.get(text, (err, row) => {
                        if( err ) return rej(err);
                        res(row);
                    });
                }else{
                    db.all(text, (err, row) => {
                        if( err ) return rej(err);
                        res(row);
                    });
                }
            });
        });
    },
};

module.exports = r;
