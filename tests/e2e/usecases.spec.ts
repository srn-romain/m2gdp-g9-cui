import { test, expect, type Page } from '@playwright/test';

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function seConnecterEnDemo(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Votre e-mail').fill('bernard.martin@example.fr');
  await page.getByRole('button', { name: 'Recevoir mon lien magique' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /Bonjour bernard/ })).toBeVisible();
}

test('US#1 : accueil liste les tablées à venir', async ({ page }) => {
  await seConnecterEnDemo(page);
  await expect(page.getByText('Gratin chez Léonie')).toBeVisible();
});

test('US#4 : connexion par lien magique (mode démo)', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Votre e-mail').fill('bernard.martin@example.fr');
  await page.getByRole('button', { name: 'Recevoir mon lien magique' }).click();
  await expect(page).toHaveURL('/');
});

test('US#2 : profil affiche le prénom et accepte une photo', async ({ page }) => {
  await seConnecterEnDemo(page);
  await page.goto('/profil');
  await expect(page.getByText('bernard Martin')).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_1PX, 'base64'),
  });
  await expect(page.getByText('Photo de profil mise à jour.')).toBeVisible();
});

test('US#9 : créer et publier une tablée', async ({ page }) => {
  await seConnecterEnDemo(page);
  await page.goto('/creer');
  await page.getByLabel('Titre de la tablée').fill('Tarte aux pommes');
  await page.getByRole('button', { name: 'Publier ma tablée' }).click();
  await expect(page).toHaveURL(/\/tables\/demo-nouvelle/);
});

test('US#10 : explorer et ouvrir les filtres', async ({ page }) => {
  await seConnecterEnDemo(page);
  await page.goto('/explorer');
  await page.getByRole('button', { name: /Filtrer dans un rayon/ }).click();
  await expect(page.getByRole('heading', { name: 'Filtres' })).toBeVisible();
});

test('US#11 : rejoindre une tablée avec contribution', async ({ page }) => {
  await seConnecterEnDemo(page);
  await page.goto('/tables/demo-libre');
  await page.getByRole('link', { name: 'Participer à la tablée' }).click();
  await expect(page).toHaveURL(/\/tables\/demo-libre\/participer/);
  await page.getByRole('button', { name: 'Confirmer ma participation' }).click();
  await expect(page).toHaveURL(/\/tables\/demo-libre\/confirme/);
});

test('US#21 : ouvrir une conversation et voir les messages', async ({ page }) => {
  await seConnecterEnDemo(page);
  await page.goto('/messages');
  await expect(page.getByText('Gratin chez Léonie')).toBeVisible();
  await page.getByText('Gratin chez Léonie').first().click();
  await expect(page.getByText('Bienvenue ! Merci pour vos contributions.')).toBeVisible();
});

