import { Page, expect } from '@playwright/test';

export class FeedPage {
  constructor(private page: Page) {}

  // Selectores mejorados (localizadores claros y reutilizables)
  get navHomeButton() {
    return this.page.locator('[data-test="sidenav-home"]');
  }

  get transactionList() {
    return this.page.locator('[data-test="transaction-list"]');
  }

  get firstTransaction() {
    // Primer elemento dentro de la lista de transacciones
    return this.transactionList.first();
  }

  get loadMoreButton() {
    // Botón que carga más transacciones (texto "Load more")
    return this.page.getByText(/load more/i);
  }

  get emptyState() {
    // Texto que indica que no hay transacciones
    return this.page.getByText(/no transactions/i);
  }

  get filterButtons() {
    // Botones/ pestañas de filtrado (pueden contener "filter" o "tab")
    return this.page.locator('[data-test*="filter"], [data-test*="tab"]');
  }

  get personalTab() {
    return this.page.locator('[data-test="nav-personal-tab"]');
  }

  get publicTab() {
    return this.page.locator('[data-test="nav-public-tab"]');
  }

  get contactsTab() {
    return this.page.locator('[data-test="nav-contacts-tab"]');
  }

  // ==== Acciones / métodos ====

  async navigateToHome() {
    // Ir al feed principal y esperar que cargue
    await this.navHomeButton.click();
    await this.expectFeedLoaded();
  }

  async expectFeedLoaded() {
    // Verifica que la lista de transacciones esté visible y que no haya tráfico de red pendiente
    await expect(this.transactionList).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  async expectTransactionVisible(amount: number, note?: string) {
    // Buscar una transacción por monto y opcionalmente por nota
    const amountSelector = this.page.getByText(`$${amount}`, { exact: false });
    await expect(amountSelector).toBeVisible({ timeout: 10000 });

    if (note) {
      const noteSelector = this.page.getByText(note, { exact: false });
      await expect(noteSelector).toBeVisible();
    }

    // Asegura que estemos en el home al terminar la verificación
    await this.navigateToHome();
  }

  async expectTransactionInList(transactionData: {
    amount: number;
    note?: string;
    sender?: string;
    receiver?: string;
    status?: string;
  }) {
    // Navega al home y busca la transacción por los campos provistos
    await this.navigateToHome();

    // Monto (requerido)
    const amountText = `$${transactionData.amount}`;
    await expect(this.page.getByText(amountText)).toBeVisible();

    // Verificaciones opcionales
    if (transactionData.note) {
      await expect(this.page.getByText(transactionData.note)).toBeVisible();
    }

    if (transactionData.sender) {
      await expect(this.page.getByText(transactionData.sender)).toBeVisible();
    }

    if (transactionData.receiver) {
      await expect(this.page.getByText(transactionData.receiver)).toBeVisible();
    }
  }

  async getTransactionCount(): Promise<number> {
    // Devuelve la cantidad de items en la lista (después de asegurarse que cargó)
    await this.expectFeedLoaded();
    return await this.transactionList.count();
  }

  async getFirstTransactionDetails() {
    // Obtiene detalles textuales y monto del primer item del feed
    await this.expectFeedLoaded();

    const firstItem = this.firstTransaction;
    await expect(firstItem).toBeVisible();

    return {
      text: await firstItem.textContent(),
      amount: await this.extractAmountFromTransaction(firstItem),
      visible: await firstItem.isVisible()
    };
  }

  async clickFirstTransaction() {
    // Clic en la primera transacción y esperar que se abra su detalle (URL contenga /transaction)
    await this.expectFeedLoaded();
    await expect(this.firstTransaction).toBeVisible();
    await this.firstTransaction.click();

    await expect(this.page.url()).toContain('/transaction');
  }

  async switchToPersonalFeed() {
    // Cambia a la pestaña personal y espera carga
    await this.navigateToHome();
    await this.personalTab.click();
    await this.expectFeedLoaded();
  }

  async switchToPublicFeed() {
    // Cambia a la pestaña pública y espera carga
    await this.publicTab.click();
    await this.expectFeedLoaded();
  }

  async switchToContactsFeed() {
    // Cambia a la pestaña de contactos y espera carga
    await this.contactsTab.click();
    await this.expectFeedLoaded();
  }

  async loadMoreTransactions() {
    // Si existe botón "Load more", hacer click y verificar que aumente la cantidad
    const initialCount = await this.getTransactionCount();

    if (await this.loadMoreButton.isVisible()) {
      await this.loadMoreButton.click();
      await this.page.waitForLoadState('networkidle');

      const newCount = await this.getTransactionCount();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  }

  async searchTransaction(searchTerm: string) {
    // Busca una transacción cuyo texto incluya el término provisto dentro de la lista actual
    const transactions = this.transactionList;
    const count = await transactions.count();

    for (let i = 0; i < count; i++) {
      const transaction = transactions.nth(i);
      const text = await transaction.textContent();

      if (text && text.includes(searchTerm)) {
        return transaction;
      }
    }

    return null;
  }

  async expectEmptyFeed() {
    // Verifica que el feed esté vacío mostrando el estado correspondiente
    await this.expectFeedLoaded();
    await expect(this.emptyState).toBeVisible();
  }

  async expectTransactionsPresent() {
    // Comprueba que exista al menos una transacción visible
    await this.expectFeedLoaded();
    await expect(this.transactionList.first()).toBeVisible();
  }

  async waitForNewTransaction(amount: number, timeout: number = 15000) {
    // Espera que aparezca una nueva transacción con el monto especificado
    const amountText = `$${amount}`;
    await expect(this.page.getByText(amountText)).toBeVisible({ timeout });
  }

  private async extractAmountFromTransaction(transactionElement: any): Promise<number | null> {
    // Extrae el monto del texto de la transacción usando regex (ej. $12.34)
    const text = await transactionElement.textContent();
    if (!text) return null;

    const amountMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
    return amountMatch ? parseFloat(amountMatch[1]) : null;
  }

  async refreshFeed() {
    // Recarga la página y espera que el feed vuelva a cargar
    await this.page.reload();
    await this.expectFeedLoaded();
  }

  async expectTransactionNotVisible(amount: number, note?: string) {
    // Verifica que una transacción (por monto y opcionalmente nota) NO sea visible
    await this.navigateToHome();

    const amountSelector = this.page.getByText(`$${amount}`, { exact: false });
    await expect(amountSelector).not.toBeVisible();

    if (note) {
      const noteSelector = this.page.getByText(note, { exact: false });
      await expect(noteSelector).not.toBeVisible();
    }
  }
}
