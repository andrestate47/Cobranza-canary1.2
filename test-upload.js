const fs = require('fs');

async function testUpload() {
  const formData = new FormData();
  // We can just send a text file as a dummy image
  fs.writeFileSync('dummy.jpg', 'dummy image data');
  const blob = new Blob([fs.readFileSync('dummy.jpg')], { type: 'image/jpeg' });
  formData.append('logo', blob, 'dummy.jpg');

  try {
    const res = await fetch('http://localhost:3000/api/configuracion/logo', {
      method: 'POST',
      body: formData,
      headers: {
        // Next-auth session cookie is needed! Ah! 
        // I can't easily simulate an authenticated request because I need a valid session cookie.
      }
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (err) {
    console.error(err);
  }
}

testUpload();
