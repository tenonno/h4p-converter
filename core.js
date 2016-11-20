'use strict'

console.clear();

let isAP = null;

let cometSound = null;


// ステージ ID

// data-target 属性
const namespace = 'download_content';

// ダウンロード時のファイル名
const downloadFileName = 'h4p.html';

// h4p.js の URL
// const h4pURL = 'https://raw.githubusercontent.com/teramotodaiki/h4p/master/dist/h4p.js';
const h4pURL = 'https://raw.githubusercontent.com/teramotodaiki/h4p/master/dist/h4p-alpha-26.js';


// 読み込めないファイルの対策
const alias = {

    'https://connect.soundcloud.com/sdk/sdk-3.0.0.js': 'https://gist.githubusercontent.com/tenonno/cddf3504d09b60e5321c2817beda6b40/raw/48b86c040966e24836bc01b001033f0fe1ff6898/soundcloud.js',

};


const requireAlias = {
    'https://connect.soundcloud.com/sdk/sdk-3.0.0.js': 'soundcloud/sdk-3.0.0.js',
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



const option = {};


const hack_hint_collection = [];


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

        if (option.emoji) {

            // emoji 対策
            const emoji = 'require(\'https://cdn.jsdelivr.net/emojione';

            if (this.text.includes(emoji)) {

                const index = this.text.indexOf(emoji);
                // this.text = stringInsert(this.text, index, 'window.emojione = ');
                this.text = this.text.replace('element.src.substr(33)', 'element.getAttribute(\'src\').substr(27).replace(/\\?v\\=(\\d\\.?){3}/,\'\')');

            }

        }


        // 1.e-5 のような数値の対策
        if (option.number) {

            this.text = this.text.replace(/\d+\.e[\+|\-]\d+/g, function(v) {
                return `'${v}' * 1.0`;
            });

        }


        // game.onload を別ファイルにする
        if (option.onload && name === 'game') {
            (function() {

                const text = this.text;

                const e1 = /^game\.onload \= function *\(.*\) \{/gm;

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

                console.warn(begins, ends);

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
                const onLoad = require('game-onload');
                ` + text.substr(0, onload.begin) + 'game.onload = onLoad;\n' + text.substr(onload.end);

                const onloadFile = onload.value.replace(/^game\.onload \=/, 'export default');

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


        // SoundCloud は使えないから対策する
        this.text = this.text.replace(/Hack\.openSoundCloud\(/g, '(function(){})(');


        if (option.alias) {



            for (let [name, alias] of Object.entries(requireAlias)) {


                this.text = this.text.replace(name, alias);

                if (this.name === name) {
                    this.name = alias;
                }

                console.log(name, alias);
            }



        }




        scripts.push(this);
    }


    domConvert() {



        if (option.ap && isAP) {

            [
                'BGM',
                'input',
                'cam',
                'touchMode',
                'touchX',
                'touchY',
                'arrayframe',
                'makeCounter',
                'boolCollided'

            ].forEach(variable => {

                this.text = this.text.replace(variable, `window.${variable}`);

            });


        }


        // menuOpener を削除する
        if (option.menu && this.name === 'hackforplay/hack') {

            this.text = this.text.replace(/^.*var opener \=.+/gm, text => {

                return text + '\n\t\tvisible: false,';
            });


        }

        // ui.enchant が先に呼ばれる対策
        // require.config から修正できる？
        if (this.name === 'soundcloud/sdk-3.0.0.js') {
            this.text = `
export default {
    initialize() {
        console.log('soundcloud');
    }
}
            `;

        }

        this.text = this.text.replace(`this._element.type = 'textarea';`, '// @removed');


        if (option.import) {

            this.text = this.text.replace(/^.+\=.+require\(\'.+\'\)/gm, function(v) {

                const member = v.split('=')[0].split(' ').filter(t => t).pop();

                var name = member.split('.').pop();


                const module = v.match(/(?<=.+\').+(?=\')/)[0]

                var aaa = member.includes('.') ? `;\n${member} = ${name}` : '';

                console.log(member, name, module);

                return `import ${name} from '${module}'${aaa}`;

                //import myDefault from "my-module";


            });



            this.text = this.text.replace(/^.*require\(\'.+\'\)/gm, function(v) {


                const module = v.match(/(?<=.+\').+(?=\')/)[0]

                return `import '${module}'`;

            });

        }



        if (option.beautify) {

            this.text = beautify(this.text).replace(/^ /gm, '');

        }

        if (this.name !== 'hackforplay/rpg-kit-smartassets') {


            (function(t, n) {


                const getLine = (text, num, from) => {

                    var result = '';

                    for (num; num--;) {

                        const index = text.indexOf('\n', from) + 1;

                        if (!index) {

                            result += text.substr(from);
                            break;

                        } else {
                            //	console.log(index, from);
                            result += text.substr(from, index - from);

                            from = index;
                        }

                    }

                    return result;
                };

                const reg = /Hack\.hint\s*\=/g;

                let match = null;

                while (match = reg.exec(t)) {

                    // console.info(match);

                    for (let i = 1; i < 100; ++i) { //; i--;) {

                        let r = getLine(t, i, match.index);



                        r = r.replace(/Hack\.hint\s*\=/, 'window.hack_hint =');

                        //console.warn(r);

                        var error = null;

                        try {
                            eval(r);

                        } catch (e) {
                            error = e;
                        }

                        //console.error(error);
                        if (error) continue;

                        // console.info(r);
                        break;


                    }




                    let hack_hint = window.hack_hint;


                    if (typeof hack_hint === 'function') {

                        hack_hint = hack_hint.toString();

                        hack_hint = hack_hint.substr(13);
                        hack_hint = hack_hint.substr(0, hack_hint.length - 1);

                    }

                    console.log('111111111111111111111', n);
                    hack_hint_collection.push(
                        beautify(hack_hint)
                    );


                }



            })(this.text, this.name);




        }







    }


    dom() {

        this.domConvert();

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


        // yukison/birthday-song-cover.png

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
${this.text}<\/script>
    	`;
    }



}


// 闇
const getResourceType = function(url) {

    const imageTypes = ['png', 'gif', 'jpg', 'gif'];

    for (let type of imageTypes) {

        if (url.endsWith(`.${type}`)) return `image/${type}`;

    }



    const audioTypes = ['mp3', 'wav'];

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

            console.info('... from cache');


            await H4PConverter.text(mod, text);


            return;

        }

        const response = await fetch(url);
        const text = await response.text();


        try {
            localStorage.setItem(url, text);
        } catch (e) {
            // サイズが大きすぎて保存できない場合がある
            console.error(e);
        }
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


                // コメット対策

                if (file === 'Hack.coverImagePath') {

                    continue;
                    // file = 'yukison/birthday-song-cover.png';

                }

                if (file === 'Hack.soundEffectPath') {
                    continue;

                }


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

                try {
                    localStorage.setItem(url, base64);
                } catch (e) {
                    // サイズが大きすぎて保存できない場合がある
                    console.error(e);
                }

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
const $$ = selector => Array.from(document.querySelectorAll(selector));


(async function() {


    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));

    await new Promise(resolve => $('#start').addEventListener('click', resolve));


    option.emoji = $('#option-emoji').checked;
    option.onload = $('#option-onload').checked;
    option.number = $('#option-number').checked;
    option.file = $('#option-file').checked;
    option.env = $('#option-env').checked;
    option.alias = $('#option-alias').checked;
    option.import = $('#option-import').checked;
    option.menu = $('#option-menu').checked;
    option.fixMod = $('#option-fixMod').checked;
    option.ap = $('#option-ap').checked;

    $$('#options>input').forEach(input => {

        const id = input.id.split('-')[1];

        option[id] = input.checked;

    });


    console.log(option);


    const stageID = $('#stage').value.match(/\d/g).join('');


    // ステージ API の URL
    const url = `https://hackforplay.xyz/api/stages/${stageID}`;

    loadedFiles.push(url);


    await new Promise(resolve => {
        const script = document.createElement('script');
        script.onload = resolve;

        script.src = 'https://cdn.rawgit.com/beautify-web/js-beautify/master/js/lib/beautify.js';
        document.body.appendChild(script);

    });




    console.info(`start: ${stageID}`);




    let stage;


    try {

        let response = await fetch(url);
        let _stage = await response.json();

        stage = _stage;


    } catch (e) {

        console.info('このステージは変換できません');

        return;
    }

    const isRPG = stage.implicit_mod === 'hackforplay/rpg-kit-main';

    const isComet = stage.implicit_mod === 'hackforplay/commet-kit-main';


    let cometText = '';

    if (isComet) {

        const rawCode = stage.script.raw_code;

        const music = rawCode.match(/Hack\.music *\=[\s\S]+\}/)[0];
        const musicName = music.match(/(?<=name\: *\').+(?=\')/);

        const hitSE = rawCode.match(/(?<=Hack\.hitSE *\= *).+(?=;)/g).pop().trim();

        const seList = [
            'osa/bosu19.wav',
            'osa/clap00.wav',
            'osa/coin03.wav',
            'osa/metal03.wav',
            'osa/metal05.wav',
            'osa/on06.wav',
            'osa/pi06.wav',
            'osa/wood05.wav',
            'osa/swing14.wav',
            'osa/whistle00.wav'
        ];


        cometText = `
game.preload('yukison/${musicName}.mp3', 'yukison/${musicName}-cover.png', '${seList[hitSE]}');
        `;


        console.info(musicName);

    }

    isAP = stage.implicit_mod === 'hackforplay/ap-kit-main';




    console.log(stage);

    const env = `

<script
    class="${namespace}"
    name=".env"
    data-type="application/json"

    is-read-only
    author-name=""
    author-url=""
    type="hack"
>
{
    "DEBUG": [
        true,
        "boolean",
        "A flag means test mode"
    ],
    "TITLE": [
        "${stage.title}",
        "string",
        "title"
    ]
}
</script>
    `;



    const fixModText = `
require('tenonno/core-resize-v2');
require('tenonno/camera-fix-v2');
require('tenonno/player-input');
    `;



    // ブラウザ版 H4P で書いてるコード
    const gameMainScript = new Script('game', `

define(function (require, exports, module) {
require('${stage.implicit_mod}');
${option.fixMod && isRPG ? fixModText : ''}
${cometText}
${stage.script.raw_code}
});

    `);

    // implicit_mod を読み込む
    await H4PConverter.mod(stage.implicit_mod);

    // implicit_mod 以外の MOD を検索する
    // 検索するだけなのでファイル化はしない
    await H4PConverter.text('', gameMainScript.text, true);


    if (option.emoji) {





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


    }


    const h4p = await getH4P();

    let dom = '';


    dom = [...scripts, ...resources].map(value => value.dom()).reduce((a, b) => a + b);

    dom += h4p;

    const fetchRPG = `
RPGObject.prototype.fetch = function(name) {
    const object = this;
    enchant.Surface.load(name, function() {
        object.image = this;
        object.width = this.width;
        object.height = this.height;
    });
};
    `;










        let hack_hint_dom = '';

        const hack_hint_collection_2 = hack_hint_collection.map(hint => `
    \`\`\`
    ${hint}
    \`\`\`
            `).join('');

            console.dir(hack_hint_collection.length, hack_hint_collection_2);


        if (hack_hint_collection.length) {

            hack_hint_dom = `

    ## 魔導書
    ${hack_hint_collection_2}

            `;

        }





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
Element.prototype.setAttribute = function(key, value) {
    if (key === 'sandbox') {

        if (value.indexOf('allow-popups') === -1) {
            value += ' allow-popups';
        }
        if (value.indexOf('allow-scripts') === -1) {
            value += ' allow-scripts';
        }
    	return setAttribute.apply(this, ['sandbox', value]);
    }
    setAttribute.apply(this, arguments);
};


    <\/script>

    <!-- File as a <script> -->



    <script class="${namespace}" name="main.js" data-type="text/javascript" is-entry-point author-name="" author-url="" type="hack">

import 'browser-h4p/stage-info';
import 'browser-h4p/fetch-loader';
import 'browser-h4p/style';
import 'game';

import env from 'env';

env.VIEW = enchant.Core.instance.rootScene._layers.Canvas._element;
Hack._exportJavascriptHint = () => {};



Hack.start();

    <\/script>


    <script class="${namespace}" name="browser-h4p/stage-info.js" data-type="text/javascript" author-name="" author-url="" type="hack">

import 'enchantjs/enchant';

window.Hack = new enchant.EventTarget();

Hack.stageInfo = {
	width: 480,
	height: 320
};

    <\/script>


<script class="${namespace}" name="browser-h4p/style.js" data-type="text/javascript" author-name="" author-url="" type="hack">
const style = document.createElement('style');

style.textContent = \`

textarea.log {
    color: #fff;
    font: bold large PixelMplus, sans-serif;
    border: 3px solid #fff;
    border-radius: 10px;
    padding: 10px;
    margin: 3px;
}

\`;

document.body.appendChild(style);
    <\/script>

    <script class="${namespace}" name="browser-h4p/fetch-loader.js" data-type="text/javascript" author-name="" author-url="" type="hack">

import '${stage.implicit_mod}';

${stage.implicit_mod === 'hackforplay/rpg-kit-main' ? fetchRPG : ''}

// window._Promise = Promise;

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



    <script
      class="${namespace}"
      name=".babelrc"
      data-type="application/json"
      author-name=""
      author-url=""
      type="hack"
    >
    {
    	"presets": [
    		"es2015"
    	]
    }</script>



    <script
      class="${namespace}"
      name="README.md"
      data-type="text/x-markdown"


      author-name=""
      author-url=""
      type="hack"
    >
    # アプリのタイトル
    これは、こういうかんじのアプリです。←っていうのを、ここに書けます
${hack_hint_dom}

    ## 使い方
    1. まずは「はじめに」をクリック
    2. つぎに文字を書きかえます
    3. \`README\` というタブをとじます
    ## テクニック
    ふつうの文字にあきたら、 **あんなこと** とか *こんなこと* もやってみよう
    \`\`\`
    // なんと、コードも書けちゃう！
    alert('こんにちは！');
    \`\`\`
    > こういう記号の書き方を\`マークダウン\`って言うらしいよ。 ~~へんなの！~~
    - - -
    ## 謝辞
    - このアプリを作るとき、
    - おせわになった人がいたら、
    - ここに名前を書いてあげるといいよ。

    - - -

    ## オリジナル

    このステージは、ブラウザ版 HackforPlay から変換されました。

    [ブラウザ版で遊ぶ](https://hackforplay.xyz/s/?id=${stageID})

    <\/script>



    ${option.env ? env : ''}


</body>

</html>


    `;

    const htmlBlob = new Blob([html], {
        'type': 'text/html'
    });

    const download = document.createElement('a');

    download.download = downloadFileName;

    if (option.file) {
        download.download = stage.Title + '.html';
    }


    console.info(hack_hint_collection);


    download.href = window.URL.createObjectURL(htmlBlob);

    download.click();

    (async function() {


        const res = await fetch(stage.thumbnail);


        const d = await res.blob();




        const download = document.createElement('a');

        download.download = 'thumbnail.png';




        if (option.file) {
            download.download = stage.title + '.png';
        }

        download.href = window.URL.createObjectURL(d);

        download.click();

    })();



})();
