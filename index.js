require('dotenv').config();

const apifyToken = process.env.APIFY_TOKEN;

if (!apifyToken) {
  throw new Error('APIFY_TOKEN não está definido. Configure-o no arquivo .env.');
}

console.log('APIFY_TOKEN carregado com sucesso.');
