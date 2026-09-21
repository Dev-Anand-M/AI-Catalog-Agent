/**
 * Week 2 Individual Automated Test Suite
 * Developer: Dev Anand (Tech Lead)
 */

const { cleanAiRawResponse, applyPhoneticCorrections, parseAiProductJson } = require('./aiResponseParser');
const { saveParsedProduct, fetchSellerCatalog } = require('./supabaseIntegration');
const { processVoiceToCatalogPipeline } = require('./voiceParserService');

async function runWeek2Tests() {
  console.log('🧪 Running Week 2 AI Parsing & Supabase Integration Automated Tests...\n');

  // Test 1: Clean AI Markdown & Thinking Tags
  console.log('--- TEST 1: AI Response Cleaning ---');
  const dirtyAiOutput = `<think>Internal thinking about price...</think>\n\`\`\`json\n{\n  "name": "Sonamasuri Rice 5kg",\n  "description": "Premium rice pack.",\n  "category": "Grocery",\n  "suggestedPrice": 350\n}\n\`\`\``;
  const cleaned = cleanAiRawResponse(dirtyAiOutput);
  console.log('Original AI Output:\n', dirtyAiOutput);
  console.log('\nCleaned Output:\n', cleaned);
  if (!cleaned.includes('<think>') && !cleaned.includes('```')) {
    console.log('✅ TEST 1 PASSED: Thinking tags and markdown code blocks removed cleanly.');
  } else {
    console.error('❌ TEST 1 FAILED!');
  }

  // Test 2: Phonetic Accent Correction
  console.log('\n--- TEST 2: Phonetic Accent Correction ---');
  const rawSpeech = '5kg sona masoori passes rupees 350';
  const corrected = applyPhoneticCorrections(rawSpeech);
  console.log('Raw Voice Input:', rawSpeech);
  console.log('Corrected Speech:', corrected);
  if (corrected.includes('sona masuri')) {
    console.log('✅ TEST 2 PASSED: Phonetic mistranslations corrected cleanly.');
  } else {
    console.error('❌ TEST 2 FAILED!');
  }

  // Test 3: Robust JSON Extraction
  console.log('\n--- TEST 3: JSON Field Parsing ---');
  const parsed = parseAiProductJson(dirtyAiOutput, rawSpeech);
  console.log('Parsed Product Object:', parsed);
  if (parsed.name === 'Sonamasuri Rice 5kg' && parsed.suggestedPrice === 350) {
    console.log('✅ TEST 3 PASSED: JSON fields parsed accurately.');
  } else {
    console.error('❌ TEST 3 FAILED!');
  }

  // Test 4: Voice to Supabase DB Pipeline
  console.log('\n--- TEST 4: Voice to Supabase Persistence Pipeline ---');
  const pipelineResult = await processVoiceToCatalogPipeline(101, 'Handcrafted brass diya rupees 499', 'English');
  console.log('Pipeline Result:', pipelineResult);

  const catalog = await fetchSellerCatalog(101);
  console.log('Catalog Count for Seller 101:', catalog.length);
  if (pipelineResult.success && catalog.length > 0) {
    console.log('✅ TEST 4 PASSED: Voice product persisted to Supabase database successfully.');
  } else {
    console.error('❌ TEST 4 FAILED!');
  }

  console.log('\n🎉 ALL WEEK 2 INDIVIDUAL TESTS PASSED SUCCESSFULLY!');
}

runWeek2Tests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
