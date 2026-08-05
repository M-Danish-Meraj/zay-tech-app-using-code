const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting Integration Tests...');
  let successCount = 0;
  let failCount = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      successCount++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failCount++;
    }
  };

  try {
    console.log('\n--- Test 1: Health Check ---');
    const health = await axios.get(`${BASE_URL}/health`);
    assert(health.status === 200, 'Health endpoint status is 200');
    assert(health.data.status === 'ok', 'Health status is ok');
    assert(health.data.mode, `App runs in mode: ${health.data.mode}`);

    console.log('\n--- Test 2: Generate Post Validation ---');
    try {
      await axios.post(`${BASE_URL}/generate`, {});
      assert(false, 'Should fail without prompt');
    } catch (err) {
      assert(err.response.status === 400, 'Fails with 400 when prompt is empty');
    }

    console.log('\n--- Test 3: Generate Post Success ---');
    const genResponse = await axios.post(`${BASE_URL}/generate`, {
      prompt: 'Write a modern tech workspace promotion'
    });
    assert(genResponse.status === 200, 'Generate responds with 200');
    const genData = genResponse.data;
    assert(genData.success === true, 'Response success is true');
    assert(genData.generationId, `Created generation ID: ${genData.generationId}`);
    assert(genData.imageUrl, `Created image URL: ${genData.imageUrl}`);
    assert(genData.caption, 'Caption is generated');

    console.log('\n--- Test 4: Approve Post ---');
    const approveResponse = await axios.post(`${BASE_URL}/approve`, {
      generationId: genData.generationId,
      imageUrl: genData.imageUrl,
      imageName: genData.imageName,
      caption: genData.caption
    });
    assert(approveResponse.status === 200, 'Approve responds with 200');
    assert(approveResponse.data.success === true, 'Response success is true');

    console.log('\n--- Test 5: Reject & Regenerate ---');
    const rejectResponse = await axios.post(`${BASE_URL}/reject`, {
      generationId: genData.generationId
    });
    assert(rejectResponse.status === 200, 'Reject responds with 200');
    assert(rejectResponse.data.success === true, 'Response success is true');
    assert(rejectResponse.data.generationId !== genData.generationId, 'Returned a new generation ID');
    assert(rejectResponse.data.caption, 'New caption generated');

    console.log('\n--- Test 6: Get History ---');
    const historyResponse = await axios.get(`${BASE_URL}/history`);
    assert(historyResponse.status === 200, 'History responds with 200');
    assert(Array.isArray(historyResponse.data.posts), 'History returns an array of posts');
    assert(historyResponse.data.posts.length > 0, `History contains approved posts (Count: ${historyResponse.data.posts.length})`);

    console.log('\n--- Test 7: Download PDF ---');
    const pdfResponse = await axios.post(`${BASE_URL}/download/pdf`, {
      imageName: genData.imageName,
      imageUrl: genData.imageUrl,
      caption: genData.caption
    }, { responseType: 'arraybuffer' });
    assert(pdfResponse.status === 200, 'PDF download endpoint status is 200');
    assert(pdfResponse.headers['content-type'] === 'application/pdf', 'PDF returns valid pdf content-type');

    console.log('\n--- Test 8: Download DOCX ---');
    const docxResponse = await axios.post(`${BASE_URL}/download/docx`, {
      imageName: genData.imageName,
      imageUrl: genData.imageUrl,
      caption: genData.caption
    }, { responseType: 'arraybuffer' });
    assert(docxResponse.status === 200, 'DOCX download endpoint status is 200');
    assert(docxResponse.headers['content-type'] === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'DOCX returns valid word content-type');

    console.log(`\n🏁 Test Results: ${successCount} PASSED, ${failCount} FAILED.`);
    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal testing error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
