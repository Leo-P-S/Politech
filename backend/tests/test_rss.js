/* eslint-disable security/detect-object-injection */
const axios = require('axios');
const { JSDOM } = require('jsdom');

async function testRSS() {
    try {
        const query = encodeURIComponent('Keiko Fujimori');
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=es-PE&gl=PE&ceid=PE:es-419`;
        console.log('Fetching', rssUrl);
        const res = await axios.get(rssUrl);
        const dom = new JSDOM(res.data, { contentType: "text/xml" });
        const items = dom.window.document.querySelectorAll('item');
        console.log(`Found ${items.length} items`);
        
        for (let i = 0; i < 3 && i < items.length; i++) {
            const title = items[i].querySelector('title').textContent;
            const link = items[i].querySelector('link').textContent;
            const pubDate = items[i].querySelector('pubDate').textContent;
            const source = items[i].querySelector('source').textContent;
            console.log(`- ${title} (${source})`);
            console.log(`  Link: ${link}`);
            console.log(`  Date: ${pubDate}`);
        }
    } catch (e) {
        console.error(e);
    }
}

testRSS();
