const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN;

async function callDocumentsAPIFix() {
  console.log('Calling Documents API fix endpoint repeatedly...\n');

  let totalProcessed = 0;
  let round = 0;

  while (true) {
    round++;
    console.log(`\nRound ${round}:`);

    try {
      const response = await axios.post(
        `${PRODUCTION_URL}/api/questions/fix-topickey-documents-api`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const data = response.data;
      const processed = data.results?.length || 0;
      const successful = data.results?.filter(r => r.success).length || 0;

      console.log(`  Processed: ${processed}`);
      console.log(`  Successful: ${successful}`);

      totalProcessed += processed;

      // If processed less than 50, we're done
      if (processed < 50) {
        console.log(`\n✅ Finished! Total processed: ${totalProcessed}`);
        break;
      }

      // Wait before next batch
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.log(`  ❌ Error:`, error.response?.data || error.message);
      break;
    }
  }
}

callDocumentsAPIFix().catch(console.error);
