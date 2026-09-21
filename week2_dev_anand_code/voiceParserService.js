/**
 * Week 2 Implementation: Complete Voice-to-Database Pipeline Service
 * Developer: Dev Anand (Tech Lead)
 * Assigned Task: AI Response Parsing & Supabase DB Integration
 * 
 * Flow:
 * Raw Voice Transcript ➔ Phonetic Correction ➔ AI Response Cleaner ➔ JSON Extraction ➔ Supabase DB Save
 */

const { applyPhoneticCorrections, parseAiProductJson } = require('./aiResponseParser');
const { saveParsedProduct, fetchSellerCatalog } = require('./supabaseIntegration');

/**
 * Full Pipeline Handler: Process raw voice transcript and persist product to database
 */
async function processVoiceToCatalogPipeline(userId, rawTranscript, language = 'English', rawAiResponse = null) {
  if (!rawTranscript || rawTranscript.trim() === '') {
    throw new Error('Transcript text cannot be empty');
  }

  // Step 1: Apply Regional Phonetic Correction
  const correctedTranscript = applyPhoneticCorrections(rawTranscript);

  // Step 2: Parse AI JSON Output (or construct from transcript if AI response is missing)
  const parsedProduct = parseAiProductJson(rawAiResponse || correctedTranscript, correctedTranscript);
  parsedProduct.language = language;

  // Step 3: Save to Supabase Database
  const savedRecord = await saveParsedProduct(userId, parsedProduct);

  return {
    success: true,
    originalTranscript: rawTranscript,
    correctedTranscript: correctedTranscript,
    product: savedRecord
  };
}

module.exports = {
  processVoiceToCatalogPipeline,
  fetchSellerCatalog
};
