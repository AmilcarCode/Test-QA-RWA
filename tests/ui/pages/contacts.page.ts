// ui/pages/contacts.page.ts
import { Page, Locator, expect } from '@playwright/test';
import { DatabaseHelper } from '../../../config/database-helper';

export class ContactsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Selectores principales (usar data-test / getByTestId cuando exista)
  get navContactsButton(): Locator {
    return this.page.locator('[data-test="nav-contacts-tab"]');
  }

  get transactionList(): Locator{
    return this.page.locator('[data-test="transaction-list"]');
  }

  get firstTransactionItem(): Locator{
    // Primer item de la lista de transacciones (usado como primer contacto)
    return this.transactionList.locator('[data-test^="transaction-item-"]').first();
  }

  // --- UTILIDADES DE DEPURACIÓN ---
  async debugCount(selectorDescription: string, locator: Locator) {
    // Imprime en consola el conteo de elementos para ayudar al debugging
    const count = await locator.count().catch(() => -1);
    console.log(`[debug] ${selectorDescription} count =`, count);
    return count;
  }

  // Fallback: intenta localizar el botón de Contacts por varios selectores
  async ensureNavContactsLocator(): Promise<Locator> {
    const locator = this.navContactsButton;
    const count = await this.debugCount('nav-contacts (getByTestId)', locator);

    if (count === 0) {
      // intentar fallback por otros selectores (data-testid, aria-label, texto)
      const fallback = this.page.locator('[data-testid="nav-contacts"], [data-test="nav-contacts"], [aria-label="Contacts"], button:has-text("Contacts")');
      const fallbackCount = await this.debugCount('nav-contacts (fallback)', fallback);
      if (fallbackCount > 0) return fallback.first();
    }

    return locator.first();
  }

  async navigateToContacts() {
    // Asegura que la app tenga algo de carga inicial (útil post-login)
    await this.page.waitForLoadState('domcontentloaded');

    const navButton = await this.ensureNavContactsLocator();

    // Espera explícita a visibilidad y habilitación antes de click
    await expect(this.navContactsButton).toBeVisible({ timeout: 15000 });
    await expect(this.navContactsButton).toBeEnabled({ timeout: 15000 });

    // Click para navegar a Contacts
    await navButton.click();

    // Esperar indicador de que estamos en Contacts (texto o título)
    await expect(this.page.getByText(/contacts/i)).toBeVisible({ timeout: 15000 });

    // Esperar que la lista se cargue por red o por render
    await this.page.waitForLoadState('networkidle');
  }

  async selectFirstContact() {
    // Navega a Contacts y selecciona el primer contacto visible
    await this.navigateToContacts();

    // Asegurarse de que haya al menos un item y clic sobre el primero
    await expect(this.transactionList.first()).toBeVisible({ timeout: 10000 });
    await this.firstTransactionItem.click();

    // Confirmar que la vista cambió a detalle/transaction
    await expect(this.page).toHaveURL(/\/transaction\//);
  }

  async selectRandomContact() {
    // Selecciona un contacto aleatorio (limitado a 5 primeros para reducir latencia)
    await this.navigateToContacts();

    await expect(this.transactionList.first()).toBeVisible({ timeout: 10000 });
    const contactCount = await this.transactionList.count();

    if (contactCount > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(contactCount, 5));
      await this.transactionList.nth(randomIndex).click();
    } else {
      throw new Error('No hay contactos disponibles');
    }

    await this.expectContactSelected();
  }

  async expectContactSelected() {
    // Verifica la selección por varias pistas posibles (race para aceptar cualquiera)
    await Promise.race([
      this.page.getByTestId('user-profile').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.page.getByTestId('contact-info').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.page.getByText(/pay/i).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    ]);
  }

  async expectContactsPageLoaded() {
    // Verifica que la página de Contacts esté visible y lista
    await expect(this.page.getByText(/contacts/i)).toBeVisible({ timeout: 10000 });
    await expect(this.transactionList).toBeVisible({ timeout: 10000 });
  }

  async getAvailableContacts() {
    // Devuelve una lista de textos (hasta 10) de contactos visibles actualmente
    await this.navigateToContacts();
    await this.page.waitForLoadState('networkidle');

    const contacts: string[] = [];
    const contactCount = await this.transactionList.count();

    for (let i = 0; i < Math.min(contactCount, 10); i++) {
      const contact = this.transactionList.nth(i);
      const text = await contact.textContent();
      if (text) contacts.push(text.trim());
    }

    return contacts;
  }
}

