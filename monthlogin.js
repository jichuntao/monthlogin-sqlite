/**
 * Created with JetBrains WebStorm.
 * User: jichuntao
 * Date: 13-9-15
 * Time: 下午10:53
 * To change this template use File | Settings | File Templates.
 */
var query = require("querystring");
var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");
var dbDir = './';

function getdb(lang, uid, cb) {
    var dbPath = dbDir + lang + '.db';
    var db;
    if (fs.existsSync(dbPath)) {
        db = new sqlite3.Database(dbPath);
    } else {
        return cb(null, null);
    }
    db.serialize(function () {
        db.all("select name from sqlite_master", function (err, row) {
            if (err || row.length < 1) {
                db.close();
                return cb(null, null);
            }
            var readAcc = 0;
            var allTables = row.length;
            var result = [];
            for (var i = 0; i < row.length; i++) {
                var obj = row[i];
                db.all("select data from " + obj.name + " where uid=?", [uid], function (err, row) {
                    readAcc++;
                    if (err) {
                        if (allTables == readAcc) {
                            db.close();
                            cb(null, result);
                        }
                        return;
                    }
                    for (var k = 0; k < row.length; k++) {
                        try {
                            var obj = JSON.parse(row[k].data);
                            result.push(obj);
                        } catch (err) {
                            console.log('json:' + err);
                        }
                    }
                    if (allTables == readAcc) {
                        db.close();
                        cb(null, result);
                    }
                });
            }
        });
    });
}

function exe(req, res, rf, data) {
    var qu = query.parse(data);
    var lang = qu['lang'];
    var uid = qu['uid'];
    console.log(qu);
    res.writeHead(200, {"Content-Type": "text/html"});
    res.write('<html><head><meta charset="utf-8"/><title>monthlogin</title></head><body>');
    res.write('查询:' + lang + "_" + uid + "<br><br>");
    res.write('Waiting....<br><br>');
    if (!lang || !uid) {
        res.write('arguments error!');
        res.write('<a href="javascript:history.go(-1)">Back<a>');
        res.end('</body></html>');
        return 0;
    }
    getdb(lang, uid, function (err, data) {
        if (err) {
            console.log(err);
            return 0;
        }
        res.write('<a href="/">back<a><br><br>');
        if (!data) {
            res.write('nofound!');
        } else {
            var tarr = data;
            var resultStr = "";
            var sarr = sortBy(tarr, 'logtime', false);
            resultStr = '<table width="100%" border="1" bordercolor="#000000" cellspacing="0px" style="border-collapse:collapse">\n';
            resultStr += '<tr bordercolor="#FFFFFF" bgcolor="#ffffff">';
            resultStr += '<td width="150">当地时间：</td>';
            resultStr += '<td>动作：</td>';
            resultStr += '<td>登陆天数：</td>';
            resultStr += '<td>购买天数：</td>';
            resultStr += '<td>鼠标事件：</td>';
            resultStr += '</tr>';
            for (var i = 0; i < sarr.length; i++) {
                var rstr = '';
                if (sarr[i].action == 'open_panel') {
                    rstr += '<tr bordercolor="#FFFFFF" bgcolor="#dddddd">';
                } else {
                    rstr += '<tr bordercolor="#FFFFFF" bgcolor="#bbbbbb">';
                }

                rstr += '<td>' + sarr[i].servertime + '</td>';
                rstr += '<td>' + sarr[i].action + '</td>';
                if (sarr[i].data && sarr[i].data.hasOwnProperty('signdays')) {
                    rstr += '<td>' + getDisplay(sarr[i].data.signdays.toString(2), true) + '</td>';
                    rstr += '<td>' + getDisplay(sarr[i].data.rcsigndays.toString(2), false) + '</td>';
                } else {
                    rstr += '<td>0</td>';
                    rstr += '<td>0</td>';
                }
                if (sarr[i].mouse) {
                    rstr += '<td>' + JSON.stringify(sarr[i].mouse) + '</td>';
                } else {
                    rstr += '<td></td>';
                }
                rstr += '</tr>';
                resultStr += rstr;
            }
            resultStr += '</table>';
            res.write(resultStr);
        }
        res.end('</body></html>');
    });


}
var getDisplay = function (str, flag) {
    var sArr = str.split("");
    sArr.reverse();
    var rArr = [];
    for (var i = 0; i < sArr.length; i++) {
        if (sArr[i] == '1') {
            rArr.push(i + 1);
        } else {
            if (flag) {
                rArr.push('#');
            }
        }
    }
    return rArr.join(',');
};

var sortBy = function (arr, prop, desc) {
    var props = [],
        ret = [],
        i = 0,
        len = arr.length;
    if (typeof prop == 'string') {
        for (; i < len; i++) {
            var oI = arr[i];
            (props[i] = new String(oI && oI[prop] || ''))._obj = oI;
        }
    }
    else if (typeof prop == 'function') {
        for (; i < len; i++) {
            var oI = arr[i];
            (props[i] = new String(oI && prop(oI) || ''))._obj = oI;
        }
    }
    else {
        throw 'err';
    }
    props.sort();
    for (i = 0; i < len; i++) {
        ret[i] = props[i]._obj;
    }
    if (desc) ret.reverse();
    return ret;
};
exports.exe = exe;