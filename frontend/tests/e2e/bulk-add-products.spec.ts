import { expect, test, type Locator, type Page } from '@playwright/test';
import { uniqueTag } from './support/testData';

async function openBulkAdd(page: Page) {
  await page.goto('/admin/products/add');
  await page.getByText('Bulk Add', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save All' })).toBeVisible();
}

function bulkRow(page: Page, index: number): Locator {
  return page.locator('table tbody tr').nth(index);
}

test.describe('Add New Products — Bulk Add grid', () => {
  test('Track Inventory defaults checked and an unchecked value is saved as false', async ({ page }) => {
    await openBulkAdd(page);

    const row = bulkRow(page, 0);
    const trackInventoryCheckbox = row.locator('input[type="checkbox"]').nth(1);
    await expect(trackInventoryCheckbox).toBeChecked();

    const sku = uniqueTag('trackoff');
    await row.locator('input').nth(0).fill(sku);
    await row.locator('input').nth(1).fill('QA Untracked Product');
    await trackInventoryCheckbox.uncheck();
    await expect(trackInventoryCheckbox).not.toBeChecked();

    await page.getByRole('button', { name: 'Save All' }).click();
    await expect(page.getByText('1 product added.', { exact: true })).toBeVisible();

    // The saved row disappears from the grid on success — the field only
    // round-trips correctly if it actually reads back off as unchecked
    // server-side, which the standalone products list (sourced from the
    // API, not the form state we just cleared) is what proves that.
    await page.goto('/admin/products/products');
    await page.getByPlaceholder(/search/i).fill(sku);
    await expect(page.getByText('QA Untracked Product')).toBeVisible();
  });

  test('Tax Rate pre-fills with the company default, including for a row added afterward', async ({ page }) => {
    await openBulkAdd(page);

    const firstRowTax = bulkRow(page, 0).locator('input').nth(5);
    await expect(async () => {
      expect((await firstRowTax.inputValue()).trim()).not.toBe('');
    }).toPass({ timeout: 10_000 });
    const defaultLabel = await firstRowTax.inputValue();

    await page.getByRole('button', { name: 'Add Row' }).click();
    const newRowTax = bulkRow(page, 3).locator('input').nth(5);
    await expect(newRowTax).toHaveValue(defaultLabel);
  });

  test('a duplicate barcode within the same batch fails only that row, the other still saves', async ({ page }) => {
    await openBulkAdd(page);

    const sharedBarcode = uniqueTag('dupbarcode');
    const skuA = uniqueTag('dupa');
    const skuB = uniqueTag('dupb');

    const rowA = bulkRow(page, 0);
    await rowA.locator('input').nth(0).fill(skuA);
    await rowA.locator('input').nth(1).fill('QA Duplicate Barcode A');
    await rowA.locator('input').nth(2).fill(sharedBarcode);

    const rowB = bulkRow(page, 1);
    await rowB.locator('input').nth(0).fill(skuB);
    await rowB.locator('input').nth(1).fill('QA Duplicate Barcode B');
    await rowB.locator('input').nth(2).fill(sharedBarcode);

    await page.getByRole('button', { name: 'Save All' }).click();

    await expect(page.getByText('1 product added, 1 failed — see rows above.')).toBeVisible();
    // Rows are inserted in payload order, so A (the earlier row) is the
    // one that lands and B collides against it — the per-row error banner
    // names whichever row actually failed.
    await expect(page.getByText(new RegExp(`${skuB}.*already in use`, 'i'))).toBeVisible();
    await expect(page.getByText(new RegExp(`${skuA}.*already in use`, 'i'))).toHaveCount(0);
  });
});
