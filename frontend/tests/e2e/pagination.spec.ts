import { expect, test } from '@playwright/test';

// Locks in two shared-DataTable behaviors that apply to every admin list
// screen (see frontend/src/admin/DataTable.tsx and useList.ts): the
// default page size is 10 (not MUI's own default of 10... this was
// explicitly changed from 20), and first/last page jump buttons exist.
test.describe('Table pagination', () => {
  test('defaults to 10 rows per page and the first/last buttons jump to the ends', async ({ page }) => {
    await page.goto('/admin/products/products');

    const rowsPerPageControl = page.getByRole('combobox', { name: 'Rows per page:' });
    await expect(rowsPerPageControl).toBeVisible();
    await expect(rowsPerPageControl).toHaveText('10');

    const bodyRows = page.locator('table tbody tr');
    await expect(bodyRows.first()).toBeVisible();
    expect(await bodyRows.count()).toBeLessThanOrEqual(10);

    const rangeLabel = page.locator('.MuiTablePagination-displayedRows');
    const initialRange = (await rangeLabel.textContent())?.trim() ?? '';
    const total = Number(initialRange.match(/of\s+(\d+)/)?.[1] ?? 0);
    test.skip(total <= 10, 'Fewer than 11 products in this catalog — nothing to page through.');

    await page.getByRole('button', { name: /last page/i }).click();
    await expect(rangeLabel).not.toHaveText(initialRange);
    const lastRange = (await rangeLabel.textContent())?.trim() ?? '';
    expect(lastRange).toContain(`of ${total}`);

    await page.getByRole('button', { name: /first page/i }).click();
    await expect(rangeLabel).toHaveText(initialRange);
  });
});
