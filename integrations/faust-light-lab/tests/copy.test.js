import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('all shipped UI text is English and the document language is en',()=>{
  for(const file of ['index.html','src/main.js','src/engine.js','src/scene.js','src/behaviors.js','src/privacy.js']){
    const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.equal(/[\u3400-\u9fff]/u.test(text),false,`Untranslated text in ${file}`);
    if(file==='index.html')assert.match(text,/<html lang="en">/);
  }
});
