import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test } from 'mocha';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('context7-playwright-extension'));
  });

  test('Should activate', async () => {
    const extension = vscode.extensions.getExtension('context7-playwright-extension');
    if (extension) {
      await extension.activate();
      assert.ok(extension.isActive);
    }
  });

  test('Should register commands', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('context7-playwright.lookup'));
    assert.ok(commands.includes('context7-playwright.generate'));
    assert.ok(commands.includes('context7-playwright.browse'));
  });
}); 