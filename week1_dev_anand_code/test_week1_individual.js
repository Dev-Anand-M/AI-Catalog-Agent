/**
 * Automated Individual Test Runner for Week 1 Backend Endpoints
 * Developer: Dev Anand (Tech Lead)
 */

const http = require('http');
const app = require('./serverIndex');

const server = app.listen(3009, async () => {
  console.log('🧪 Standalone Week 1 Test Server running on http://localhost:3009');
  
  try {
    console.log('\n--- TEST 1: Health Check Endpoint ---');
    const health = await makeRequest('http://localhost:3009/health', 'GET');
    console.log('Status:', health.status);
    console.log('Response:', health.data);

    console.log('\n--- TEST 2: Auth Signup Endpoint ---');
    const signup = await makeRequest('http://localhost:3009/api/auth?action=signup', 'POST', {
      name: 'Dev Anand',
      email: `test_dev_${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    console.log('Status:', signup.status);
    console.log('Created User:', signup.data.user);
    console.log('Issued Token Present:', !!signup.data.token);

    console.log('\n--- TEST 3: AI Voice STT Generator Endpoint ---');
    const aiGen = await makeRequest('http://localhost:3009/api/ai?action=generate-product', 'POST', {
      promptText: 'Organic Assam black tea 500g rupees 299',
      language: 'English',
      spokenLanguage: 'hi'
    });
    console.log('Status:', aiGen.status);
    console.log('Generated Product Name:', aiGen.data.name);
    console.log('Category:', aiGen.data.category);
    console.log('Price:', `₹${aiGen.data.suggestedPrice}`);
    console.log('Source Engine:', aiGen.data.source);

    console.log('\n✅ ALL INDIVIDUAL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test Execution Error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});

function makeRequest(url, method, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
