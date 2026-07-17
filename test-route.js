const { GET } = require('./.next/server/app/api/informe-clientes/route.js');

async function test() {
  try {
    const req = {
      url: 'http://localhost:3000/api/informe-clientes'
    };
    const res = await GET(req);
    console.log(await res.json());
  } catch (e) {
    console.error("Test script error: ", e);
  }
}
test();
