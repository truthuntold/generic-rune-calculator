import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { exit } from 'process';

const ajv = new Ajv();

function validate(schemaPath, dataPath) {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    console.error(`Validation failed for ${dataPath}:`);
    console.error(validate.errors);
    return false;
  }

  console.log(`Validation successful for ${dataPath}`);
  return true;
}

const gameConfigRawResult = validate('schemas/game.config.schema.json', 'public/game.config.raw.json');
const gameConfigDerivedResult = validate('schemas/game.config.schema.json', 'public/game.config.derived.json');
const runesResult = validate('schemas/runes.schema.json', 'public/runes.json');

if (!gameConfigRawResult || !gameConfigDerivedResult || !runesResult) {
  exit(1);
}
