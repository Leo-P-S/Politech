const axios = require('axios');
const { JSDOM } = require('jsdom');

async function testDDG() {
    const candidateName = "Pedro Castillo";
    const query = encodeURIComponent(`${candidateName} noticias politica`);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
    
    console.log(`Querying: ${searchUrl}`);
    const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    const dom = new JSDOM(response.data);
    const items = dom.window.document.querySelectorAll('.result__url');
    console.log(`Found ${items.length} items.`);
    
    for (let i = 0; i < Math.min(items.length, 10); i++) {
        const rawHref = items[i].href;
        const match = rawHref.match(/[?&]uddg=([^&]+)/);
        if (match && match[1]) {
            const finalUrl = decodeURIComponent(match[1]);
            console.log(`[${i}] ${finalUrl}`);
        }
    }
}
testDDG();
