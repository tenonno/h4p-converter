'use strict'

console.clear();



// ステージ ID

// data-target 属性
const namespace = 'download_content';

// ダウンロード時のファイル名
const downloadFileName = 'h4p.html';

// h4p.js の URL
// const h4pURL = 'https://raw.githubusercontent.com/teramotodaiki/h4p/master/dist/h4p.js';
const h4pURL = 'https://raw.githubusercontent.com/teramotodaiki/h4p/master/dist/h4p-alpha-16.js';

// 読み込めないファイルの対策
const alias = {

    'https://connect.soundcloud.com/sdk/sdk-3.0.0.js': 'https://gist.githubusercontent.com/tenonno/cddf3504d09b60e5321c2817beda6b40/raw/48b86c040966e24836bc01b001033f0fe1ff6898/soundcloud.js',

};


const requireAlias = {

};


const gameOnLoadMOD = 'game-onload';

// game.onload のファイルに require を移植するか
const onLoadRequire = false;






// 重複チェック用
const loadedFiles = [];
const loadedNames = [];

// コレクション
const scripts = [];
const resources = [];


const emojiCollection = [];





const option = {

    onLoad: true,

};




// String.insert
const stringInsert = function(string, index, insert) {
    return string.slice(0, index) + insert + string.slice(index, string.length);
};


const escapeRegExp = function(text) {
    return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};


const beautify = function(text) {
    return js_beautify(text, {
        // "indent_size": 4,
        // "indent_char": " ",
        "eol": "\n",
        "indent_level": 0,
        "indent_with_tabs": true,
        "preserve_newlines": true,
        "max_preserve_newlines": 10,
        "jslint_happy": false,
        "space_after_anon_function": false,
        "brace_style": "collapse",
        "keep_array_indentation": false,
        "keep_function_indentation": false,
        "space_before_conditional": true,
        "break_chained_methods": false,
        "eval_code": false,
        "unescape_strings": false,
        "wrap_line_length": 0,
        "wrap_attributes": "auto",
        "wrap_attributes_indent_size": 4,
        "end_with_newline": true
    });
};


// js ファイル
class Script {
    constructor(name, text) {

        this.name = name;
        this.text = text;

        console.warn(name);


        const a1 = 'define(function (require, exports, module) {';
        const a2 = '});'

        const e1 = new RegExp(`^\\s*${escapeRegExp(a1)}`);
        const e2 = new RegExp(`${escapeRegExp(a2)}\\s*$`);


        // 暗黙の define を削除する
        if (this.text.match(e1)) {

            this.text = this.text.replace(e1, '');
            this.text = this.text.replace(e2, '');

        }




        // sessionStorage 対策
        this.text = this.text.replace(/sessionStorage/g, '({getItem:function(){}})');


        // ui.enchant が先に呼ばれる対策
        // require.config から修正できる？
        if (name === 'enchantjs/ui.enchant') {
            this.text = `require('enchantjs/enchant');\n` + this.text;
        }


        // emoji 対策
        const emoji = 'require(\'https://cdn.jsdelivr.net/emojione';

        if (this.text.includes(emoji)) {

            const index = this.text.indexOf(emoji);
            this.text = stringInsert(this.text, index, 'window.emojione = ');
            this.text = this.text.replace('element.src.substr(33)', 'element.getAttribute(\'src\').substr(27).replace(/\\?v\\=(\\d\\.?){3}/,\'\')');

        }

        // 1.e-5 のような数値の対策
        this.text = this.text.replace(/\d+\.e[\+|\-]\d+/g, function(v) {
            return `'${v}' * 1.0`;
        });


        // game.onload を別ファイルにする
        if (name === 'game') {
            (function() {

                const text = this.text;

                const e1 = /^game\.onload \= function\(.*\) \{/gm;

                const e2 = /^\}\;/gm;


                const begins = [];
                const ends = [];

                while (true) {
                    var begin = e1.exec(text);
                    if (!begin) break;
                    begins.push(begin);
                }

                while (true) {
                    const end = e2.exec(text);
                    if (!end) break;
                    ends.push(end);
                }

                const onloads = [];

                begins.forEach(begin => {

                    var end = ends.filter(v => begin.index < v.index)[0];

                    end.index += 2;

                    const value = text.substr(begin.index, end.index - begin.index);

                    onloads.push({
                        begin: begin.index,
                        end: end.index,
                        value: value,
                        length: value.length
                    });



                });

                // game.onload がないステージ
                if (!onloads.length) return;


                var onload = onloads.sort((a, b) => b.length - a.length)[0];


                var t2 = `
                const $onLoad = require('game-onload');
                ` + text.substr(0, onload.begin) + 'game.onload = $onLoad;\n' + text.substr(onload.end);

                const onloadFile = onload.value.replace(/^game\.onload/, 'module.exports');

                //let file2 =

                let onLoadText = onloadFile;

                // require を移植する
                if (onLoadRequire) {

                    const requireFiles = text.match(/(?<=require\([\'|\"]).+(?=[\'|\"]\))/g);
                    const requires = requireFiles.map(v => `require('${v}');\n`).join('');

                    onLoadText = requires + onLoadText;

                }




                this.text = beautify(t2);

                new Script(gameOnLoadMOD, onLoadText);




            }).call(this);
        }


        // this.text = beautify(this.text);


        scripts.push(this);
    }

    dom() {
        return `
            <script class="${namespace}" name="${this.name}.js" data-type="text/javascript" author-name="" author-url="" type="hack">
                ${this.text}
            <\/script>
    	`;
    }

}

// 画像とか音楽とか
class Resource {

    constructor(name, text, url, type = 'image/png') {


        this.name = name;
        this.text = text;

        this.type = getResourceType(url);


        resources.push(this);
    }

    dom() {
        return `

        <script
  class="${namespace}"
  name="${this.name}"
  data-type="${this.type}"


  author-name=""
  author-url=""
  type="hack"
>
${this.text}
            <\/script>
    	`;
    }



}


// 闇
const getResourceType = function(url) {

    const imageTypes = ['png', 'gif', 'jpg', 'gif'];

    for (let type of imageTypes) {

        if (url.endsWith(`.${type}`)) return `image/${type}`;

    }



    const audioTypes = ['mp3'];

    for (let type of audioTypes) {

        if (url.endsWith(`.${type}`)) return `audio/${type}`;

    }


    // emojione とか
    // *.png?v=1.0 など
    if (url.match(/\.png\?.+/)) return `image/png`;



    throw new Error(`ファイルのタイプが不明です ${url}`);
};



// h4p.js を script タグに変換して取得する
const getH4P = async function() {

    const url = h4pURL;

    const response = await fetch(url);
    const text = await response.text();

    const encodedText = encodeURIComponent(text);

    return `
    	<!-- h4p.js -->
    	<script type="text/javascript">

        const script = document.createElement('script');

        script.textContent = decodeURIComponent("${encodedText};h4p();")

        document.body.appendChild(script);

    	<\/script>
    `;

};



// コピペ
const blobToBase64 = async function(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const {
                result
            } = event.target;
            resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
    });
};


// MOD 名から実際の URL を取得する
const modToURL = function(mod) {

    //
    if (mod in alias) return alias[mod];

    // mod 名が URL ならそのまま使う
    if (mod.match(/^https?\:/)) {
        return mod;
    }


    return `https://hackforplay.xyz/api/mods/${mod}.js`;

};



class H4PConverter {

    // mod 名からファイルを見つけて H4PConverter.text に投げる
    static async mod(mod) {

        // 例外
        if (mod === gameOnLoadMOD) return;


        const url = modToURL(mod);


        if (loadedFiles.includes(url)) {
            // console.error('既に読み込んだファイルです', url, loadedFiles);
            return;
        }

        loadedFiles.push(url);

        if (localStorage.getItem(url)) {


            const text = localStorage.getItem(url);

            await H4PConverter.text(mod, text);

            console.info('... from local storage');

            return;

        }

        const response = await fetch(url);
        const text = await response.text();

        localStorage.setItem(url, text);

        await H4PConverter.text(mod, text);

    }

    // 使用している mod とリソースを見つけて変換する
    // mod があった場合は、その mod を H4PConverter.mod する
    static async text(mod, text, ignore = false) {


        const requireFiles = text.match(/(?<=require\([\'|\"]).+(?=[\'|\"]\))/g);

        if (!mod.includes('emojione.min.js')) {
            const emoji = text.match(/[\'|\"]\:\S+\:[\'|\"]/g);
            if (emoji) {
                emojiCollection.push(...emoji);
            }
        }




        let preload = text.match(/(?<=game\.preload\(\[).+(?=\]\))/g);

        if (!preload) {
            preload = text.match(/(?<=game\.preload\().+(?=\))/g);
        }

        // 複数行のパターン
        if (!preload) {
            preload = text.match(/(?<=game\.preload\(\[)[\s\S]+(?=\]\))/g);
        }





        // enchant.ui とか
        // asset: ['file1', 'file2'] の形式
        const preloadEx = text.match(/(?<=assets\: *\[).+(?=\])/g);


        // game.load('enchantjs/~.png')
        const preloadD = text.match(/(?<=load\([\'|\"])enchantjs\/.+\.png(?=[\'|\"])/g);



        let preloadFiles = [];


        if (preloadD) {

            preloadD.forEach(value => {
                preloadFiles.push(...value.split(','));
            });
        }

        if (preload) {

            preload.forEach(value => {
                preloadFiles.push(...value.split(','));
            });
        }

        if (preloadEx) {

            preloadEx.forEach(value => {
                preloadFiles.push(...value.split(','));
            });
        }

        if (preloadFiles.length) {



            preloadFiles = preloadFiles.map(file => {
                return file.replace(/\'/g, '').trim();
            });



            for (let file of preloadFiles) {

                let url = `https://embed.hackforplay.xyz/hackforplay/${file}`;

                // if (file.startsWith('http')) {
                if (file.match(/^https?\:/)) {
                    url = file;
                }


                if (loadedFiles.includes(url) && loadedNames.includes(file)) {
                    console.error('既に読み込んでいます', url, loadedFiles);
                    break;
                }

                console.info(file);

                loadedFiles.push(url);
                loadedNames.push(name);

                if (localStorage.getItem(url)) {


                    const base64 = localStorage.getItem(url);

                    new Resource(file, base64, url);

                    console.info('... from cache');

                    continue;

                }



                const response = await fetch(url);
                const blob = await response.blob();
                const base64 = await blobToBase64(blob);

                localStorage.setItem(url, base64);

                new Resource(file, base64, url);


            }





        }



        if (!ignore) {

            new Script(mod, text);

            console.info(mod);

        }

        if (!requireFiles) return;

        for (let file of requireFiles) {

            await H4PConverter.mod(file);

        }



    }


}



//const stageID = 17511;

const $ = selector => document.querySelector(selector);


(async function() {


    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));

    await new Promise(resolve => $('#start').addEventListener('click', resolve));

    const stageID = $('#stage').value.match(/\d/g).join('');

    console.info(stageID);

    // ステージ API の URL
    const url = `https://hackforplay.xyz/api/stages/${stageID}`;

    loadedFiles.push(url);


    await new Promise(resolve => {
        const script = document.createElement('script');
        script.onload = resolve;

        script.src = 'https://cdn.rawgit.com/beautify-web/js-beautify/master/js/lib/beautify.js';
        document.body.appendChild(script);

    });




    console.info('start');




    let stage;


    try {

        let response = await fetch(url);
        let _stage = await response.json();

        stage = _stage;


    } catch (e) {

        console.info('このステージは変換できません');

        return;
    }


    console.log(stage);


    // ブラウザ版 H4P で書いてるコード
    const gameMainScript = new Script('game', `

define(function (require, exports, module) {
require('${stage.implicit_mod}');
${stage.script.raw_code}
});

    `);

    // implicit_mod を読み込む
    await H4PConverter.mod(stage.implicit_mod);

    // implicit_mod 以外の MOD を検索する
    // 検索するだけなのでファイル化はしない
    await H4PConverter.text('', gameMainScript.text, true);





    await new Promise(function(resolve) {
        const script = document.createElement('script');
        script.onload = resolve;
        script.src = 'https://cdn.jsdelivr.net/emojione/2.2.5/lib/js/emojione.min.js';
        document.body.appendChild(script);
    });


    var emojiSet = new Set();

    var b = emojiCollection.forEach(e => {

        var e2 = emojione.toImage(e);


        var w = e2.match(/(?<=src=\").+(?=\")/);

        if (!w) return;

        emojiSet.add(w[0]);

    });

    Array.from(emojiSet).map(url => {
        return 'https:' + url;
    }).forEach(async function(url) {


        let file = `/hackforplay/emojione${url.substr(33)}`;


        file = file.replace(/\?v\=(\d\.?){3}/, '');

        console.error(file);

        if (localStorage.getItem(url)) {
            const base64 = localStorage.getItem(url);
            return new Resource(file, base64, url);
        }


        const response = await fetch(url);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        localStorage.setItem(url, base64);

        new Resource(file, base64, url);

    });



    const h4p = await getH4P();

    let dom = '';


    dom = [...scripts, ...resources].map(value => value.dom()).reduce((a, b) => a + b);

    dom += h4p;


    const html = `

<!DOCTYPE html>
<html>

<head>
	<meta charset="utf-8">
    <title>HackforPlay</title>
</head>

<body>
	<!-- Config of the app -->
    <div class="h4p__app" data-target=".${namespace}"></div>


	<script>

// iframe を生成するときに sandbox を書き換える
const setAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(key) {
    if (key === 'sandbox') {
    	return setAttribute.apply(this, ['sandbox', 'allow-popups allow-scripts']);
    }
    setAttribute.apply(this, arguments);
};


    <\/script>

    <!-- File as a <script> -->



    <script class="${namespace}" name="main.js" data-type="text/javascript" is-entry-point author-name="" author-url="" type="hack">

require('stage-info');
require('fetch-loader');
require('game');

Hack._exportJavascriptHint = function() {};

const env = require('env');
env.VIEW = enchant.Core.instance.rootScene._layers.Canvas._element;

Hack.start();

    <\/script>


    <script class="${namespace}" name="stage-info.js" data-type="text/javascript" author-name="" author-url="" type="hack">

require('enchantjs/enchant');

window.Hack = new enchant.EventTarget();

Hack.stageInfo = {
	width: 480,
	height: 320
};

    <\/script>



    <script class="${namespace}" name="fetch-loader.js" data-type="text/javascript" author-name="" author-url="" type="hack">

require('enchantjs/enchant');

enchant.Surface.load = function(src, callback, onerror) {
    const image = new Image();
    const surface = Object.create(enchant.Surface.prototype, {
        context: {
            value: null
        },
        _css: {
            value: 'url(' + src + ')'
        },
        _element: {
            value: image
        }
    });
    enchant.EventTarget.call(surface);
    onerror = onerror || function() {};
    surface.addEventListener('load', callback);
    surface.addEventListener('error', onerror);
    image.onerror = function() {
        var e = new enchant.Event(enchant.Event.ERROR);
        e.message = 'Cannot load an asset: ' + image.src;
        enchant.Core.instance.dispatchEvent(e);
        surface.dispatchEvent(e);
    };
    image.onload = function() {
        surface.width = image.width;
        surface.height = image.height;
        surface.dispatchEvent(new enchant.Event('load'));
    };

    fetch(src).then(function(response) {
        return response.blob();
    }).then(function(blob) {

        image.src = URL.createObjectURL(blob);

        // 一部の MOD の為に元画像の情報を残す
        image.originalSource = src;

    });


    return surface;
};




enchant.WebAudioSound.load = function(src, type, callback, onerror) {
    var canPlay = (new Audio()).canPlayType(type);
    var sound = new enchant.WebAudioSound();
    callback = callback || function() {};
    onerror = onerror || function() {};
    sound.addEventListener(enchant.Event.LOAD, callback);
    sound.addEventListener(enchant.Event.ERROR, onerror);

    function dispatchErrorEvent() {
        var e = new enchant.Event(enchant.Event.ERROR);
        e.message = 'Cannot load an asset: ' + src;
        enchant.Core.instance.dispatchEvent(e);
        sound.dispatchEvent(e);
    }
    var actx, xhr;
    if (canPlay === 'maybe' || canPlay === 'probably') {
        actx = enchant.WebAudioSound.audioContext;



        fetch(src).then(function(response) {
            return response.arrayBuffer();
        }).then(function(arrayBuffer) {

            actx.decodeAudioData(arrayBuffer, function(buffer) {
                sound.buffer = buffer;
                sound.dispatchEvent(new enchant.Event(enchant.Event.LOAD));
            }, dispatchErrorEvent);

        }).catch(dispatchErrorEvent);



    } else {
        setTimeout(dispatchErrorEvent, 50);
    }
    return sound;
};


    <\/script>



    ${dom}



<x-exports class="${namespace}__exports">
{
    "env": [["DEBUG", true, "A flag means test mode"]],
    "palette": {}
}
</x-exports>

</body>

</html>


    `;

    const htmlBlob = new Blob([html], {
        'type': 'text/html'
    });

    const download = document.createElement('a');

    download.download = stage.Title + '.html' || downloadFileName;
    download.href = window.URL.createObjectURL(htmlBlob);

    download.click();




})();
