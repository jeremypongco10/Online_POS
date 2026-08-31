import { expect, test } from '@playwright/test';
import { uniqueTag } from './support/testData';

// Read-only by design: this only checks what the *preview* table renders
// after parsing a CSV, so it deliberately never clicks the actual "Import"
// button — nothing is written to the database, so there's nothing for
// global-teardown to need to clean up here.
test.describe('Add New Products — CSV Import preview', () => {
  test('preview table shows Active and Track Inv. columns matching the parsed CSV values', async ({ page }) => {
    const skuA = uniqueTag('csva');
    const skuB = uniqueTag('csvb');
    const csv = [
      'sku,name,barcode,category,unit,tax_rate,minimum_stock,is_active,track_inventory',
      `${skuA},QA CSV Active Untracked,,,,,0,yes,no`,
      `${skuB},QA CSV Inactive Tracked,,,,,0,no,yes`,
    ].join('\n');

    await page.goto('/admin/products/add');
    await page.getByText('Import from File', { exact: true }).click();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'qa-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    const headerRow = page.locator('table thead tr');
    await expect(headerRow.getByText('Active', { exact: true })).toBeVisible();
    await expect(headerRow.getByText('Track Inv.', { exact: true })).toBeVisible();

    const rowA = page.locator('table tbody tr', { hasText: skuA });
    const rowB = page.locator('table tbody tr', { hasText: skuB });
    await expect(rowA).toBeVisible();
    await expect(rowB).toBeVisible();

    const cellsA = rowA.locator('td');
    const cellsB = rowB.locator('td');
    const headerCells = await headerRow.locator('th').allTextContents();
    const activeCol = headerCells.findIndex((h) => h.trim() === 'Active');
    const trackCol = headerCells.findIndex((h) => h.trim() === 'Track Inv.');
    expect(activeCol).toBeGreaterThanOrEqual(0);
    expect(trackCol).toBeGreaterThanOrEqual(0);

    await expect(cellsA.nth(activeCol)).toHaveText('Yes');
    await expect(cellsA.nth(trackCol)).toHaveText('No');
    await expect(cellsB.nth(activeCol)).toHaveText('No');
    await expect(cellsB.nth(trackCol)).toHaveText('Yes');
  });
});
