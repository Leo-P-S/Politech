const http = require('https');

function fetchGdelt(url) {
  return new Promise((resolve, reject) => {
    http.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({status: res.statusCode, data}));
    }).on('error', reject);
  });
}

async function runTests() {
  const queries = [
    `"Keiko Fujimori"`, // Exact phrase
    `Keiko Fujimori`, // AND operator by default
  ];

  const startDT = "20230101000000";
  const endDT = "20230301235959";

  for (const q of queries) {
    const queryStr = encodeURIComponent(q);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${queryStr}&mode=artlist&maxrecords=50&format=json&startdatetime=${startDT}&enddatetime=${endDT}`;
    console.log(`\nTesting query: ${q}`);
    console.log(`URL: ${url}`);
    
    try {
      const result = await fetchGdelt(url);
      console.log(`Status: ${result.status}`);
      if (result.status === 200) {
        try {
          const parsed = JSON.parse(result.data);
          if (parsed.articles) {
            console.log(`Found ${parsed.articles.length} articles.`);
          } else {
            console.log(`Parsed JSON, no articles array found. Data:`, result.data.substring(0, 200));
          }
        } catch(e) {
          console.log(`Error parsing JSON:`, result.data.substring(0, 200));
        }
      } else {
        console.log(`Response text:`, result.data.substring(0, 200));
      }
    } catch(e) {
      console.log(`Error:`, e.message);
    }
    
    console.log('Sleeping 8 seconds to avoid 429...');
    await new Promise(r => setTimeout(r, 8000));
  }
}

runTests();
