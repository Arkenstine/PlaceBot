// ==UserScript==
// @name         PlaceNL Bot (Czech Edition)
// @namespace    https://github.com/PlaceCZ/Bot
// @version      19
// @description  Bot pro r/place, puvodem od NL, predelan pro CZ
// @author       NoahvdAa, GravelCZ, MartinNemi03, Wavelink
// @match        https://www.reddit.com/r/place/*
// @match        https://new.reddit.com/r/place/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @require	     https://cdn.jsdelivr.net/npm/toastify-js
// @resource     TOASTIFY_CSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @updateURL    https://github.com/PlaceCZ/Bot/raw/master/tampermonkey/placenlbot.user.js
// @downloadURL  https://github.com/PlaceCZ/Bot/raw/master/tampermonkey/placenlbot.user.js
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @connect      reddit.com
// @connect      r-placeczechbot.onrender.com
// ==/UserScript==

// Sorry voor de rommelige code, haast en clean gaatn iet altijd samen ;)
// Překlad: Omlouváme se za chaotický kód, spěch a čistota nejdou vždy dohromady. ;)

const VERSION = 19;
const BACKEND_URL = 'r-placeczechbot.onrender.com';
const BACKEND_API_WS_URL = `wss://${BACKEND_URL}/api/ws`;
const BACKEND_API_MAPS = `https://${BACKEND_URL}/maps`;

let socket;
let order;
let accessToken;
let pixelsPlaced = 0;
let currentOrderCanvas = document.createElement('canvas');
let currentOrderCtx = currentOrderCanvas.getContext('2d');
let currentPlaceCanvas = document.createElement('canvas');

const DEFAULT_TOAST_DURATION_MS = 10000;
const COLOR_MAPPINGS = {
    '#6D001A': 0,
    '#BE0039': 1,
    '#FF4500': 2,
    '#FFA800': 3,
    '#FFD635': 4,
    '#FFF8B8': 5,
    '#00A368': 6,
    '#00CC78': 7,
    '#7EED56': 8,
    '#00756F': 9,
    '#009EAA': 10,
    '#00CCC0': 11,
    '#2450A4': 12,
    '#3690EA': 13,
    '#51E9F4': 14,
    '#493AC1': 15,
    '#6A5CFF': 16,
    '#94B3FF': 17,
    '#811E9F': 18,
    '#B44AC0': 19,
    '#E4ABFF': 20,
    '#DE107F': 21,
    '#FF3881': 22,
    '#FF99AA': 23,
    '#6D482F': 24,
    '#9C6926': 25,
    '#FFB470': 26,
    '#000000': 27,
    '#515252': 28,
    '#898D90': 29,
    '#D4D7D9': 30,
    '#FFFFFF': 31
};

const UA_PREFIXES = [
    "firefox",
    "chrome",
    "edg"
];

const getRealWork = rgbaOrder => {
    let order = [];
    for (var i = 0; i < 1000 * 1000; i++) {
        if (rgbaOrder[(i * 4) + 3] !== 0) {
            order.push(i);
        }
    }
    return order;
};

const getPendingWork = (work, rgbaOrder, rgbaCanvas) => {
    let pendingWork = [];
    for (const i of work) {
        if (rgbaOrderToHex(i, rgbaOrder) !== rgbaOrderToHex(i, rgbaCanvas)) {
            pendingWork.push(i);
        }
    }
    return pendingWork;
};

(async function () {
    GM_addStyle(GM_getResourceText('TOASTIFY_CSS'));

    currentOrderCanvas.width = 1000;
    currentOrderCanvas.height = 1000;
    currentOrderCanvas.style.display = 'none';
    currentOrderCanvas = document.body.appendChild(currentOrderCanvas);

    currentPlaceCanvas.width = 1000;
    currentPlaceCanvas.height = 1000;
    currentPlaceCanvas.style.display = 'none';
    currentPlaceCanvas = document.body.appendChild(currentPlaceCanvas);

    Toastify({
        text: 'Získávám přístupový token...',
        duration: DEFAULT_TOAST_DURATION_MS
    }).showToast();
    accessToken = await getAccessToken();
    Toastify({
        text: 'Přístupový token obdržen!',
        duration: DEFAULT_TOAST_DURATION_MS
    }).showToast();

    connectSocket();
    attemptPlace();

    setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify({ type: 'ping' }));
    }, 5000);

    setInterval(async () => {
        accessToken = await getAccessToken();
    }, 30 * 60 * 1000);
})();

function connectSocket() {
    Toastify({
        text: 'Připojuji se na server PlaceCZ..',
        duration: DEFAULT_TOAST_DURATION_MS
    }).showToast();

    socket = new WebSocket(BACKEND_API_WS_URL);

    const errorTimeout = setTimeout(() => {
        Toastify({
            text: 'Chyba při pokusu o připojení na server PlaceCZ!',
            duration: DEFAULT_TOAST_DURATION_MS
        }).showToast();
        console.error('Chyba při pokusu o připojení na server PlaceCZ!');
    }, 5000);

    socket.onopen = function () {
        clearTimeout(errorTimeout);
        Toastify({
            text: 'Připojeno na server PlaceCZ!',
            duration: DEFAULT_TOAST_DURATION_MS
        }).showToast();
        socket.send(JSON.stringify({ type: 'getmap' }));
        socket.send(JSON.stringify({ type: "brand", brand: `userscript${getPrefix()}V${VERSION}` }));
    };

    socket.onmessage = async function (message) {
        var data;
        try {
            data = JSON.parse(message.data);
        } catch (e) {
            return;
        }

        switch (data.type.toLowerCase()) {
            case 'map':
                Toastify({
                    text: `Nové rozkazy připraveny!${data?.reason ? "\nDůvod: " + data.reason : ""}${data?.uploader ? "\nNahrál: " + data.uploader : ""}`,
                    duration: DEFAULT_TOAST_DURATION_MS
                }).showToast();
                currentOrderCtx = await getCanvasFromUrl(`${BACKEND_API_MAPS}/${data.data}`, currentOrderCanvas);
                order = getRealWork(currentOrderCtx.getImageData(0, 0, 1000, 1000).data);
                Toastify({
                    text: `Načtena nová mapa, celkem ${order.length} pixelů!`,
                    duration: DEFAULT_TOAST_DURATION_MS
                }).showToast();
                break;
            case 'toast':
                Toastify({
                    text: `Zpráva ze serveru: ${data.message}`,
                    duration: data.duration || DEFAULT_TOAST_DURATION_MS,
                    style: data.style || {}
                }).showToast();
                break;
            default:
                break;
        }
    };

    socket.onclose = function (e) {
        Toastify({
            text: `Odpojen od PlaceCZ serveru${e?.reason ? ": " + e.reason : "."}`,
            duration: DEFAULT_TOAST_DURATION_MS
        }).showToast();
        console.error('Chyba socketu: ', e.reason);

        socket.close();
        setTimeout(connectSocket, 1000);
    };
}

async function attemptPlace() {
    console.log(order) // -< printuje
    if (!order) {
        setTimeout(attemptPlace, 2000); // try again in 2sec.
        return;
    }

    let ctx;
    try {
        ctx = await getCanvasFromUrl(await getCurrentImageUrl('1'), currentPlaceCanvas, 0, 0);
        // ctx = await getCanvasFromUrl(await getCurrentImageUrl('1'), currentPlaceCanvas, 1000, 0); // Expanze 1
        // ctx = await getCanvasFromUrl(await getCurrentImageUrl('2'), currentPlaceCanvas, 0, 1000); // Expanze 2
        // ctx = await getCanvasFromUrl(await getCurrentImageUrl('3'), currentPlaceCanvas, 1000, 1000); // Expanze 3

        console.log(ctx) // <- neprintuje
    } catch (e) {
        console.warn('Chyba při načítání mapy: ', e);
        Toastify({
            text: 'Chyba při načítání mapy. Další pokus za 10 sekund...',
            duration: 10000
        }).showToast();
        setTimeout(attemptPlace, 10000);
        return;
    }

    const rgbaOrder = currentOrderCtx.getImageData(0, 0, 1000, 1000).data;
    const rgbaCanvas = ctx.getImageData(0, 0, 1000, 1000).data;
    const work = getPendingWork(order, rgbaOrder, rgbaCanvas);

    if (work.length === 0) {
        Toastify({
            text: `Všechny pixely jsou již na správném místě! Další pokus za 30 sekund...`,
            duration: 30000
        }).showToast();
        setTimeout(attemptPlace, 30000); // Zkuste to znovu za 30 sekund.
        return;
    }

    const percentComplete = 100 - Math.ceil(work.length * 100 / order.length);
    const workRemaining = work.length;
    const idx = Math.floor(Math.random() * work.length);
    const i = work[idx];
    const x = i % 1000;
    const y = Math.floor(i / 1000);
    const hex = rgbaOrderToHex(i, rgbaOrder);

    Toastify({
        text: `Pokus o umístění pixelů na ${x - 500}, ${y - 500}...\n${percentComplete}% dokončeno, ${workRemaining} zbývá.`,
        duration: DEFAULT_TOAST_DURATION_MS
    }).showToast();

    const res = await place(x - 500, y - 500, COLOR_MAPPINGS[hex]);
    const data = await res.json();
    try {
        if (data.errors) {
            const error = data.errors[0];
            const nextPixel = error.extensions.nextAvailablePixelTs + (3500 + Math.floor(Math.random() * 5000));
            const nextPixelDate = new Date(nextPixel);
            const delay = nextPixelDate.getTime() - Date.now();
            const toastDuration = delay > 0 ? delay : DEFAULT_TOAST_DURATION_MS;

            Toastify({
                text: `Příliš brzo umístěný pixel.\nDalší pixel bude položen v ${nextPixelDate.toLocaleTimeString('cs-CZ')}.`,
                duration: toastDuration
            }).showToast();
            setTimeout(attemptPlace, delay);
        } else {
            console.log(data.data)
            const nextPixel = data.data.act.data[0].data.nextAvailablePixelTimestamp + (3500 + Math.floor(Math.random() * 10000));
            // Přidejte náhodný čas mezi 0 a 10 s, abyste zabránili detekci a šíření po restartu serveru.
            const nextPixelDate = new Date(nextPixel);
            const delay = nextPixelDate.getTime() - Date.now();
            const toastDuration = delay > 0 ? delay : DEFAULT_TOAST_DURATION_MS;
            pixelsPlaced++;

            Toastify({
                text: `Pixel položen na ${x - 500}, ${y - 500}!\nPoložených pixelů: ${pixelsPlaced}\nDalší pixel bude položen v ${nextPixelDate.toLocaleTimeString('cs-CZ')}.`,
                duration: toastDuration
            }).showToast();
            setTimeout(attemptPlace, delay);
        }
    } catch (e) {
        console.warn('Chyba při zpracování odpovědi: ', e);
        Toastify({
            text: `Chyba při zpracování odpovědi: ${e}.`,
            duration: DEFAULT_TOAST_DURATION_MS
        }).showToast();
        setTimeout(attemptPlace, 10000);
    }
}

function place(x, y, color) {
    socket.send(JSON.stringify({ type: 'placepixel', x, y, color }));
    return fetch('https://gql-realtime-2.reddit.com/query', {
        method: 'POST',
        body: JSON.stringify({
            'operationName': 'setPixel',
            'variables': {
                'input': {
                    'actionName': 'r/replace:set_pixel',
                    'PixelMessageData': {
                        'coordinate': {
                            'x': x,
                            'y': y
                        },
                        'colorIndex': color,
                        'canvasIndex': '1'
                    }
                }
            },
            'query': 'mutation setPixel($input: ActInput!) {\n  act(input: $input) {\n    data {\n      ... on BasicMessage {\n        id\n        data {\n          ... on GetUserCooldownResponseMessageData {\n            nextAvailablePixelTimestamp\n            __typename\n          }\n          ... on SetPixelResponseMessageData {\n            timestamp\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n'
        }),
        headers: {
            'origin': 'https://hot-potato.reddit.com',
            'referer': 'https://hot-potato.reddit.com/',
            'apollographql-client-name': 'mona-lisa',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
}

async function getAccessToken() {
    const usingOldReddit = window.location.href.includes('new.reddit.com');
    const url = usingOldReddit ? 'https://new.reddit.com/r/place/' : 'https://www.reddit.com/r/place/';
    const response = await fetch(url);
    const responseText = await response.text();
    return responseText.split('\"accessToken\":\"')[1].split('"')[0];
}

async function getCurrentImageUrl(id = '0') {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://gql-realtime-2.reddit.com/query', 'graphql-ws');

        ws.onopen = () => {
            ws.send(JSON.stringify({
                'type': 'connection_init',
                'payload': {
                    'Authorization': `Bearer ${accessToken}`
                }
            }));
            ws.send(JSON.stringify({
                'id': '1',
                'type': 'start',
                'payload': {
                    'variables': {
                        'input': {
                            'channel': {
                                'teamOwner': 'GARLICBREAD',
                                'category': 'CANVAS',
                                'tag': id
                            }
                        }
                    },
                    'extensions': {},
                    'operationName': 'replace',
                    'query': 'subscription replace($input: SubscribeInput!) {\n  subscribe(input: $input) {\n    id\n    ... on BasicMessage {\n      data {\n        __typename\n        ... on FullFrameMessageData {\n          __typename\n          name\n          timestamp\n        }\n      }\n      __typename\n    }\n    __typename\n  }\n}'
                }
            }));
        };

        ws.onmessage = (message) => {
            const { data } = message;
            const parsed = JSON.parse(data);

            console.log(parsed)

            if (!parsed.payload || !parsed.payload.data || !parsed.payload.data.subscribe || !parsed.payload.data.subscribe.data) return;

            ws.close();
            resolve(parsed.payload.data.subscribe.data.name + `?noCache=${Date.now() * Math.random()}`);
        };

        ws.onerror = reject;
    });
}

function getCanvasFromUrl(url, canvas, x = 0, y = 0, clearCanvas = false) {
    return new Promise((resolve, reject) => {
        console.log(url)
        let loadImage = ctx => {
            GM.xmlHttpRequest({
                method: "GET",
                url: url,
                responseType: 'blob',
                onload: function(response) {
                    var urlCreator = window.URL || window.webkitURL;
                    var imageUrl = urlCreator.createObjectURL(this.response);
                    var img = new Image();
                    img.onload = () => {
                        if (clearCanvas) {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                        ctx.drawImage(img, x, y);
                        resolve(ctx);
                    };
                    img.onerror = () => {
                        Toastify({
                            text: 'Chyba při načítání mapy. Opakuji pokus za 3 sekundy..',
                            duration: 3000
                        }).showToast();
                        setTimeout(() => loadImage(ctx), 3000);
                    };
                    img.src = imageUrl;
                }
            });
        };
        loadImage(canvas.getContext('2d'));
    });
}

function getPrefix() {
    let ua = window.navigator.userAgent.toLowerCase();
    let prefix = "";

    UA_PREFIXES.forEach(uaPrefix => {
        if (ua.includes(uaPrefix)) prefix = `-${uaPrefix}-`;
    });

    return prefix;
}

function getCanvas(x, y) {
    if (x <= 999) return y <= 999 ? 0 : 2;
    else return y <= 999 ? 1 : 3;
}

function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

async function placePixel23(x, y, colorId, canvasIndex = 1) {
    const payload = `
    {
  "operationName": "setPixel",
  "variables": {
    "input": {
      "actionName": "r/replace:set_pixel",
      "PixelMessageData": {
        "coordinate": {
          "x": ${x},
          "y": ${y}
        },
        "colorIndex": ${colorId},
        "canvasIndex": ${canvasIndex}
      }
    }
  },
  "query": "mutation setPixel($input: ActInput!) {\n  act(input: $input) {\n    data {\n      ... on BasicMessage {\n        id\n        data {\n          ... on GetUserCooldownResponseMessageData {\n            nextAvailablePixelTimestamp\n            __typename\n          }\n          ... on SetPixelResponseMessageData {\n            timestamp\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
}`
    }

let rgbaOrderToHex = (i, rgbaOrder) =>
rgbToHex(rgbaOrder[i * 4], rgbaOrder[i * 4 + 1], rgbaOrder[i * 4 + 2]);
