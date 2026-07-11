import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('walk route sight cards open their selected sight description', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('<sc-for list="{{ walkDaySights }}"');
  const end = html.indexOf('</sc-for>', start);
  const cards = html.slice(start, end);

  assert.match(cards, /onClick="\{\{ onOpenSightInfo \}\}"/);
  assert.match(cards, /data-id="\{\{ st\.id \}\}"/);
});
