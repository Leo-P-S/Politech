/* eslint-disable security/detect-object-injection */
const axios = require('axios');
const { JSDOM } = require('jsdom');

async function testDDG() {
    try {
        const query = encodeURIComponent('Keiko Fujimori noticias');
        const url = `https://html.duckduckgo.com/html/?q=${query}`;
        console.log('Fetching', url);
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const dom = new JSDOM(res.data);
        const items = dom.window.document.querySelectorAll('.result__url');
        
        for (let i = 0; i < 3 && i < items.length; i++) {
            console.log(`Link: ${items[i].href}`);
        }
    } catch (e) {
        console.error(e.message);
    }
}

testDDG();
