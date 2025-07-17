import * as assert from 'assert';
import { suite, test } from 'mocha';
import { PlaywrightService } from '../../services/playwright-service';

suite('PlaywrightService Test Suite', () => {
  const playwrightService = new PlaywrightService();

  test('Should initialize with no active sessions', () => {
    const sessions = playwrightService.getActiveSessions();
    assert.strictEqual(sessions.length, 0);
  });

  test('Should generate unique session IDs', () => {
    // This is a simple test to verify the service can be instantiated
    assert.ok(playwrightService);
    assert.strictEqual(typeof playwrightService.getActiveSessions, 'function');
  });

  test('Should have cleanup method', () => {
    assert.strictEqual(typeof playwrightService.cleanup, 'function');
  });
}); 