async function testGdelt() {
  const query = encodeURIComponent(`"Keiko Fujimori"`);
  const startDT = "20230101000000";
  const endDT = "20230301235959";
  const searchUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json&startdatetime=${startDT}&enddatetime=${endDT}`;

  console.log('Fetching:', searchUrl);

  try {
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            if (data && data.articles) {
                console.log(`Found ${data.articles.length} articles.`);
                console.log(data.articles.slice(0, 2));
            } else {
                console.log('No articles found or different format:', data);
            }
        } catch (e) {
             console.log('Response is not JSON:', text.substring(0, 500));
        }
    } else {
        console.error('Error status:', response.status);
        console.error('Response text:', await response.text());
    }
  } catch (error) {
    console.error('Error fetching GDELT:', error.message);
  }
}

testGdelt();
