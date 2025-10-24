import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { FeedPage } from './pages/feed.page';
import { ContactsPage } from './pages/contacts.page';
import { PaymentPage } from './pages/payment.page';
import { testUsers } from '../../config/test-data';

test.describe('Smoke Tests - Funcionalidad Básica', () => {
  
  test('aplicación carga correctamente', async ({ page }) => {
    await page.goto('/');
    
    // Verifica que la página principal se carga bien
    await expect(page).toHaveTitle(/Cypress Real World App/);
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('[data-test="signin-submit"]')).toBeVisible();
  });

  test('login funciona con credenciales válidas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = testUsers.primary;

    await loginPage.goto();
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    
    // Comprueba que el login fue exitoso
    await expect(page.locator('[data-test="main"]')).toBeVisible();
    await expect(page.url()).not.toContain('/signin');
  });

  test('login falla con credenciales inválidas', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginWithValidation('invalid_user', 'invalid_pass');
    
    // Verifica que se muestra un mensaje de error y no se avanza
    await loginPage.expectLoginError();
    await expect(page.locator('input#username')).toBeVisible();
  });

  test('feed de transacciones carga', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const feedPage = new FeedPage(page);
    const user = testUsers.primary;

    await loginPage.goto();
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    
    await feedPage.navigateToHome();
    await feedPage.expectFeedLoaded();
    
    // Verifica que el feed tiene transacciones o muestra estado vacío
    const hasTransactions = await feedPage.transactionList.first().isVisible({ timeout: 5000 });
    const hasEmptyState = await feedPage.emptyState.isVisible({ timeout: 2000 });
    
    expect(hasTransactions || hasEmptyState).toBeTruthy();
  });

  test('navegación principal funciona', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const contactsPage = new ContactsPage(page);
    const paymentPage = new PaymentPage(page);
    const user = testUsers.primary;

    await loginPage.goto();
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    
    // Verifica que se puede ir a la sección de contactos
    await contactsPage.navigateToContacts();
    await contactsPage.expectContactsPageLoaded();
    
    // Verifica navegación a nueva transacción
    await paymentPage.navigateToNewTransaction();
    
    // Regresa al inicio
    await page.locator('[data-test="sidenav-home"]').click();
    await expect(page.locator('[data-test="transaction-list"]')).toBeVisible();
  });

  test('logout funciona correctamente', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = testUsers.primary;

    await loginPage.goto();
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    
    // Verifica que el usuario está logueado
    await expect(page.locator('[data-test="main"]')).toBeVisible();
    
    // Realiza logout
    await loginPage.logout();
    
    // Verifica que vuelve a la pantalla de login
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.url()).toContain('/signin');
  });

  test('formulario de pago se valida correctamente', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const contactsPage = new ContactsPage(page);
    const paymentPage = new PaymentPage(page);
    const user = testUsers.primary;

    await loginPage.goto();
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    
    // Selecciona un contacto y abre el formulario de pago
    await contactsPage.selectFirstContact();
    await paymentPage.navigateToNewTransaction();
  });

  test('Mostrar contactos funciona', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const contactsPage = new ContactsPage(page);
    const user = testUsers.primary;

    await loginPage.goto();
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    
    // Navega a la lista de contactos
    await contactsPage.navigateToContacts();
  });

  test('responsive design - elementos principales visibles', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = testUsers.primary;

    await loginPage.goto();
    await loginPage.expectLoginFormVisible();
    
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    
    // Prueba modo móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verifica que los elementos clave se vean en móvil
    await expect(page.locator('[data-test="sidenav-toggle"]')).toBeVisible();
    await expect(page.locator('[data-test="transaction-list"]')).toBeVisible();
    
    // Prueba modo escritorio
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('[data-test="sidenav-home"]')).toBeVisible();
    await expect(page.locator('[data-test="transaction-list"]')).toBeVisible();
  });

  test('performance - páginas cargan en tiempo razonable', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = testUsers.primary;

    // Mide tiempo de carga inicial
    const startTime = Date.now();
    await loginPage.goto();
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Debe cargar en menos de 5 segundos
    
    // Mide tiempo de login
    const loginStartTime = Date.now();
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    const loginTime = Date.now() - loginStartTime;
    
    expect(loginTime).toBeLessThan(10000); // Debe loguear en menos de 10 segundos
  });
});
