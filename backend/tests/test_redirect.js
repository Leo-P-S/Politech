const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const url = 'https://news.google.com/rss/articles/CBMiygFBVV95cUxQTlRUM3BaeG51UDdwbW5ySVJQZ0hoUERwLU92UWlZbUxuYTIwM0tZUkNVRFpacXp5cTVWMHNIbW91UUVzeUlFcm1MOEE1SUU2aE40OVltUFVvWUlucEZvb05lbzVsdlVwRHBOUHZqQW92WUZKS082WHNWeTB3bnBZQnVuWTliTjNQRWtnaUU3M0J1ejd5YjVUcENrTE9vdkNJZE1aV1hUQ2syUHNHY0hRcFVvdnBzQ3JYZmptN0NIZHA5c0FkR3FtZTNn?oc=5';
axios.get(url).then(res => {
    const doc = new JSDOM(res.data, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    if (article) {
        console.log('Title:', article.title);
        console.log('Excerpt:', article.excerpt);
        console.log('Content snippet:', article.textContent.substring(0, 300));
    } else {
        console.log("Readability couldn't parse it.");
        console.log(res.data.substring(0, 1000));
    }
}).catch(console.error);
