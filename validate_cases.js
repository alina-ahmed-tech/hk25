const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Load schema
const schema = JSON.parse(fs.readFileSync('./data/case.schema.json', 'utf-8'));
const CASES_DIR = './data/cases';

// Setup AJV
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// Validate all JSON files in the directory
const files = fs.readdirSync(CASES_DIR).filter(f => f.endsWith('.json'));

let validCount = 0;
let invalidCount = 0;

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), 'utf-8'));
  const valid = validate(data);
  if (valid) {
    validCount++;
  } else {
    invalidCount++;
    console.log(`❌ ${file} is INVALID:`);
    console.log(validate.errors);
  }
}

console.log(`\nValidation complete. Valid: ${validCount}, Invalid: ${invalidCount}`);
