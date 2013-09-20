/**
 * Created with JetBrains WebStorm.
 * User: jichuntao
 * Date: 13-9-17
 * Time: 上午11:30
 * To change this template use File | Settings | File Templates.
 */
var fs = require('fs');
var lineReader = require('line-reader');
var util = require('util');
var sqlite3 = require('sqlite3').verbose();
var argumentsArr = process.argv.splice(2);
if (argumentsArr.length < 1) {
    console.log('arguments error!');
    return;
}
console.log(argumentsArr);
//var dir = '/Work/StromWorkSpace/alog-redis/logData/';
var dir = '/mnt/farmweblog3/monthlogin/';
var dateIndex = 0;
var dateDir;
var langs;
var timeo = getTimeoffset();
var acc = 0;
var i = 0;
var db;
var sleepacc = 0;
var allacc = 0;

dateIndex = 0;
start();
setInterval(debuginfo, 10000);
//开始执行
function start() {
    if (dateIndex == argumentsArr.length) {
        console.log('Over:' + new Date().toString());
        process.exit();
        return;
    }
    dateDir = argumentsArr[dateIndex];
    langs = fs.readdirSync(dir + dateDir + '/');
    langs = ignoreArr(langs);
    i = 0;
    nextfile();
}
function debuginfo() {
    console.log('dateDir:' + argumentsArr[dateIndex] + ' men:' + util.inspect(process.memoryUsage()) + ' - qps:' + Math.round(acc / 10) + ' -all:' + allacc);
    acc = 0;
}
function exec(strs, cb) {
    try {
        var data = strs.substr(strs.indexOf('{'));
        var key = strs.substring(0, strs.indexOf('{') - 1);
        var obj = JSON.parse(data);
        var logtime = key.split('-')[0];
        var lang = key.split('-')[2];
        var uid = obj.uid;
        var servertime = parseTime(obj.servertime * 1000, lang);
        var clienttime = obj.time;
        var action = obj.action;
        var ldata = obj.data;
        var mouse = obj.mouse;
        if (!logtime || !lang || !uid || !servertime || !clienttime || !action) {
            return 0;
        }

        var item = {
            'uid': uid,
            'action': action,
            'servertime': servertime,
            'clienttime': clienttime,
            'lang': lang,
            'logtime': logtime,
            'data': ldata,
            'mouse': mouse
        };
        db.run("INSERT INTO tb_" + dateDir + " VALUES (?,?)", [uid, JSON.stringify(item)]);
        acc++;
        sleepacc++;
        allacc++;
        if (sleepacc > 999) {
            sleepacc = 0;
            setTimeout(cb, 100);
        } else {
            cb();
        }
    }
    catch (err) {
        console.log(err + " # " + strs);
        cb();
    }
}


//下个文件
function nextfile() {
    if (i == langs.length) {
        dateIndex++;
        start();
        return 0;
    }
    if (db) {
        db.close();
    }
    db = new sqlite3.Database(langs[i] + '.db');
    var path = dir + dateDir + '/' + langs[i] + '/' + dateDir + '_monthlogin_' + langs[i] + '.log';
    allacc = 0;
    console.log("Start read:" + path);
    db.all("select * from sqlite_master where name=?", ['tb_' + dateDir], function (err, row) {
        if (err) {
            console.log('err1' + err);
            process.exit();
        }
        if (row.length == 0) {
            db.run("CREATE TABLE " + 'tb_' + dateDir + " (uid varchar(255), data text)");
            console.log('CREATE TABLE: tb_' + dateDir);
        }
        i++;
        openfile(path);

    });

}

//开始打开文件
function openfile(filename) {
    lineReader.eachLine(filename, function (line, last, cb) {
        acc++;
        exec(line, function () {
            if (last) {
                cb(false);
                setTimeout(nextfile, 1000);
                return;
            }
            cb();
        });
    });
}

//过滤数组
function ignoreArr(arr) {
    var ret = [];
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == '.DS_Store' || arr[i] == 'test' || arr[i] == 'err') {
            continue;
        }
        ret.push(arr[i]);
    }
    return ret;
}

//获取各语言的时间差
function getTimeoffset() {
    var ret = {};
    ret.am = -14400;
    ret.de = 7200;
    ret.fr = 7200;
    ret.nl = 7200;
    ret.it = 7200;
    ret.pl = 7200;
    ret.br = -10800;
    ret.th = 25200;
    ret.tw = 28800;
    return ret;
}

//转换服务器时间
function parseTime(num, lang) {
    num = num + (timeo[lang] * 1000);
    var date = new Date(num);
    var ret = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + " " + date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds();
    return ret;
}