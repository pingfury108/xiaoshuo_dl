const  CryptoJS = require("crypto-js");
const cheerio = require('cheerio');
const  acorn = require("acorn");
const walk = require('acorn-walk');

function d(a, b) {
  b = CryptoJS.MD5(b).toString();
  var d = CryptoJS.enc.Utf8.parse(b.substring(0, 16));
  var e = CryptoJS.enc.Utf8.parse(b.substring(16));
  return CryptoJS.AES.decrypt(a, e, {
    iv: d,
    padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Utf8)
}

async function fetchHTML(url) {
  try {
    const  data = await fetch(url);
    return await data.text();
   } catch (error) {
    console.error('获取 HTML 失败:', error);
  }
}

function parseTextAndKey(code){
  const ast = acorn.parse(code, { ecmaVersion: 2020 });
  let arg = [];
  walk.simple(ast, {
      CallExpression(node) {
        if (node.callee.name === 'd') {
          const args = node.arguments.map(arg => {
            if (arg.type === 'Literal') {
              return arg.value; // 获取字面量值
            }
            return null; // 处理其他类型的参数
          }).filter(arg => arg !== null); // 过滤掉 null 值
          //console.log('d() 调用的参数:', args);
          arg = args;
        }
      }
  });
  return arg
}

// 解析 HTML 的函数
function parseHTML(html) {
   const $ = cheerio.load(html);
  let content = "";
  $('script').each(function(i, elem) {
    const scriptContent = $(this).html();// 获取 <script> 标签中的内容
    if (i === 11){
      //  console.log(`Script ${i + 1}:`, scriptContent);
      let arg = parseTextAndKey(scriptContent);
      let text = d(arg[0], arg[1]);
      let text_$ = cheerio.load(text);
      text_$('br').replaceWith('\n\n');
      text_$('p').each(function() {
        text_$(this).replaceWith(text_$(this).text() + '\n\n');
      });
      //console.log(text_$.text());
      content = text_$.text();
    }
  });
  return content
}

const host = "https://www.po52.cc";

async function parseCatalog() {
  let url = "https://www.po52.cc/book/306178300649542/catalog/";
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  let data = [];
  $('.BCsectionTwo-top li a').each(function(i, elem) {
    let item = $(this);
    //  console.log(item.html());
    let h = item.attr('href');
    let name = item.text();
    data.push({"link": host + h, "name": name})
  });
  return data
}

async function main() {
  /*
  const url = 'https://www.po52.cc/book/306178300649542/415679148912710.html'; // 替换为你想要获取的 URL
  const html = await fetchHTML(url);
  if (html) {
    console.log(parseHTML(html));
  }
   */
  let data = await parseCatalog();
  let texts = [];
  //console.log(data);

  for (let i = 0; i < data.length; i++) {
    let name = data[i].name;
    //console.log("fetch text: ", data[i].name);
    const html = await fetchHTML(data[i].link);
    if (html) {
      let t = parseHTML(html);
      data[i]["text"] = t;
      texts.push(`${name}\n\n${t}`);
    }
    //console.log()
  }

  //console.log(data);
  console.log(texts.join('\n\n\n'));
}

main();
