// ✅ QUICK API TEST - Test with fallback URLs
const axios = require('axios');

const testAPIs = [
  {
    name: 'Production Backend',
    url: 'https://trave-social-backend.onrender.com/api'
  },
  {
    name: 'Localhost Backend', 
    url: 'http://localhost:5000/api'
  }
];

const testEndpoint = async (apiBase, name) => {
  try {
    console.log(`🧪 Testing ${name}...`);
    
    // Test health first
    const healthResponse = await axios.get(`${apiBase}/health`, {
      timeout: 5000
    });
    
    if (healthResponse.status === 200) {
      console.log(`✅ ${name} - Health OK`);
      
      // Test posts
      const postsResponse = await axios.get(`${apiBase}/posts?limit=1`, {
        timeout: 5000
      });
      
      console.log(`✅ ${name} - Posts OK: ${postsResponse.data?.data?.length || 0} posts`);
      
      return { success: true, api: name, url: apiBase };
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.code || error.message}`);
    return { success: false, api: name, error: error.message };
  }
};

const runAPIConnectivityTest = async () => {
  console.log('🌐 API Connectivity Test...\n');
  
  for (const api of testAPIs) {
    const result = await testEndpoint(api.url, api.name);
    if (result.success) {
      console.log(`\n🎉 WORKING API: ${result.api}`);
      console.log(`📡 URL: ${result.url}`);
      console.log('\n✅ All API endpoints are accessible!');
      return result.url;
    }
  }
  
  console.log('\n⚠️ No working API found. Backend may be sleeping.');
  return null;
};

runAPIConnectivityTest();