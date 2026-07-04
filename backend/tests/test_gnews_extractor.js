const axios = require('axios');
const { JSDOM } = require('jsdom');

async function testGNewsRedirect() {
    const url = 'https://news.google.com/rss/articles/CBMiygFBVV95cUxQTlRUM3BaeG51UDdwbW5ySVJQZ0hoUERwLU92UWlZbUxuYTIwM0tZUkNVRFpacXp5cTVWMHNIbW91UUVzeUlFcm1MOEE1SUU2aE40OVltUFVvWUlucEZvb05lbzVsdlVwRHBOUHZqQW92WUZKS082WHNWeTB3bnBZQnVuWTliTjNQRWtnaUU3M0J1ejd5YjVUcENrTE9vdkNJZE1aV1hUQ2syUHNHY0hRcFVvdnBzQ3JYZmptN0NIZHA5c0FkR3FtZTNn?oc=5';
    try {
        const res = await axios.get(url);
        const dom = new JSDOM(res.data);
        
        // Google News usa un <c-wiz> con data-n-v-u para redirección a veces, 
        // o un meta refresh. Veamos si hay un c-wiz:
        const cwiz = dom.window.document.querySelector('c-wiz[data-n-v-u]');
        if (cwiz) {
            console.log('Found c-wiz data-n-v-u:', cwiz.getAttribute('data-n-v-u'));
        } else {
            console.log('c-wiz not found');
            const link = dom.window.document.querySelector('a');
            if (link) {
                console.log('Found link href:', link.href);
            }
        }
    } catch(e) {
        console.error(e.message);
    }
}
testGNewsRedirect();
