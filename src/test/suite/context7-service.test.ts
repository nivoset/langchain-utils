import * as assert from 'assert';
import { suite, test } from 'mocha';
import { Context7Service } from '../../services/context7-service';

suite('Context7Service Test Suite', () => {
  const context7Service = new Context7Service();

  test('Should return mock libraries', () => {
    const libraries = context7Service.getMockLibraries();
    assert.ok(libraries.length > 0);
    assert.ok(libraries[0].id);
    assert.ok(libraries[0].name);
    assert.ok(libraries[0].description);
  });

  test('Should have React library in mock data', () => {
    const libraries = context7Service.getMockLibraries();
    const reactLibrary = libraries.find(lib => lib.name === 'React');
    assert.ok(reactLibrary);
    assert.strictEqual(reactLibrary?.id, '/react/react');
  });

  test('Should have Next.js library in mock data', () => {
    const libraries = context7Service.getMockLibraries();
    const nextjsLibrary = libraries.find(lib => lib.name === 'Next.js');
    assert.ok(nextjsLibrary);
    assert.strictEqual(nextjsLibrary?.id, '/vercel/next.js');
  });
}); 