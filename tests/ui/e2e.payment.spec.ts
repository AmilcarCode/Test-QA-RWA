import { test, expect } from '@playwright/test'; 
import { LoginPage } from './pages/login.page';
import { ContactsPage } from './pages/contacts.page';
import { PaymentPage } from './pages/payment.page';
import { FeedPage } from './pages/feed.page';
import { testUsers, getTestData } from '../../config/test-data';
import { DatabaseHelper } from '../../config/database-helper';

// Grupo de pruebas end-to-end centrado en el flujo completo de pago
test.describe('E2E Flujo de Pago Robusto', () => {
  let loginPage: LoginPage;
  let contactsPage: ContactsPage;
  let paymentPage: PaymentPage;
  let feedPage: FeedPage;

  // Antes de cada test, inicializa las páginas necesarias
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    contactsPage = new ContactsPage(page);
    paymentPage = new PaymentPage(page);
    feedPage = new FeedPage(page);
  });

  // Test principal: ejecuta el flujo de pago con distintos usuarios
  test('flujo de pago con diferentes tipos de usuarios', async ({ page }) => {
    const users = [testUsers.primary, testUsers.secondary, testUsers.tertiary];
    
    for (const user of users) {
      if (!user.username) continue; // salta si falta el username
      
      const amount = getTestData.randomAmount(); // genera monto aleatorio
      const note = getTestData.uniqueNote(`Test for ${user.username}`); // genera nota única
      
      // Iniciar sesión con cada usuario
      await loginPage.goto();
      await loginPage.login(user.username, process.env.TEST_PASSWORD!);
      
      // Seleccionar un contacto y enviar un pago
      await contactsPage.selectFirstContact();
      await paymentPage.sendPayment(amount, note);
      
      // Verificar que la transacción aparece en el feed
      await feedPage.expectTransactionVisible(amount, note);
      
      // Cerrar sesión para probar el siguiente usuario
      await loginPage.logout();
    }
  });

  // Test secundario: verifica la navegación entre diferentes secciones del feed
  test('navegación entre diferentes vistas del feed', async ({ page }) => {
    const user = testUsers.primary;
    const amount = getTestData.randomAmount(); // monto aleatorio
    const note = getTestData.uniqueNote('Feed Navigation Test'); // nota identificadora

    // Inicia sesión con el usuario principal
    await loginPage.goto();
    await loginPage.login(user.username, process.env.TEST_PASSWORD!);
    
    // Realiza una transacción
    await contactsPage.selectFirstContact();
    await paymentPage.sendPayment(amount, note);
    
    // Cambia entre los distintos feeds y verifica que haya transacciones
    await feedPage.switchToPersonalFeed();
    await feedPage.expectTransactionsPresent();
    
    await feedPage.switchToPublicFeed();
    await feedPage.expectTransactionsPresent();
    
    await feedPage.switchToContactsFeed();
    await feedPage.expectTransactionsPresent();
  });
});
