import { expect, test } from '@playwright/test';

// No data mutation here — this only exercises the Store selector's
// enabled/disabled state, so there's nothing for global-teardown to clean
// up from this spec.
test.describe('Bulk Update Prices — Store selector', () => {
  test('disables while "Apply new prices to all stores" is checked, re-enables when unchecked', async ({ page }) => {
    await page.goto('/admin/products/prices');

    const storeCombobox = page.getByRole('combobox').first();
    await storeCombobox.click();
    await page.getByRole('option').first().click();

    const applyAllCheckbox = page.getByRole('checkbox', { name: /apply new prices to all stores/i });
    await expect(applyAllCheckbox).toBeVisible();
    await expect(storeCombobox).toBeEnabled();

    await applyAllCheckbox.check();
    await expect(storeCombobox).toBeDisabled();

    await applyAllCheckbox.uncheck();
    await expect(storeCombobox).toBeEnabled();
  });
});
