import { Page, expect } from '@playwright/test';

export class PaymentPage {
  constructor(private page: Page) {}

  // Selectores mejorados (localizadores reutilizables)
  get navNewTransactionButton() {
    return this.page.locator('[data-test="nav-top-new-transaction"]');
  }

  get amountInput() {
    return this.page.locator('#amount');
  }

  get noteInput() {
    return this.page.locator('#transaction-create-description-input');
  }

  get submitButton() {
    return this.page.locator('[data-test="transaction-create-submit-payment"]');
  }

  get requestButton() {
    return this.page.locator('[data-test="transaction-create-submit-request"]');
  }

  get payButton() {
    return this.page.locator('[data-test="transaction-create-submit-payment"]');
  }

  get requestPaymentButton() {
    return this.page.getByText(/^request$/i); // botón identificado por texto "request" (case-insensitive)
  }

  get firstUserItem() {
    // primer usuario de la lista (selector que busca items que empiezan con "user-list-item-")
    return this.page
      .locator('[data-test="users-list"] [data-test^="user-list-item-"]')
      .first();
  }

  get transactionForm() {
    // botón/entrada para abrir el formulario de nueva transacción
    return this.page.locator('[data-test="nav-top-new-transaction"]');
  }

  get amountError() {
    return this.page.locator('#transaction-create-amount-input-helper-text');
  }

  get noteError() {
    return this.page.locator('#transaction-create-description-input-helper-text')
  }

  get successMessage() {
    // mensajes de éxito posibles: alert, clase genérica o role=alert
    return this.page.locator('[data-test*="alert"], .success-message, [role="alert"]');
  }

  // Acciones mejoradas (métodos que encapsulan pasos de usuario)
  async navigateToNewTransaction() {
    await this.navNewTransactionButton.click();
    await this.expectPaymentFormVisible();
  }

  async sendPayment(amount: number, note: string) {
    await this.navigateToNewTransaction();
    
    // Llenar formulario: monto y nota
    await this.amountInput.clear();
    await this.amountInput.fill(amount.toString());
    
    await this.noteInput.clear();
    await this.noteInput.fill(note);
    
    // Asegurarse de que los botones estén visibles antes de interactuar
    await this.submitButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.payButton.waitFor({ state: 'visible', timeout: 15000 });

    // Verificar que el botón principal esté habilitado
    await expect(this.submitButton).toBeEnabled();
    
    // Enviar pago
    await this.submitButton.click();
    
    // Esperar confirmación/éxito
    await this.expectPaymentSuccess();
  }

  async sendPaymentWithValidation(amount: number, note: string) {
    await this.navigateToNewTransaction();
    
    // Validar comportamiento del botón cuando el formulario está incompleto
    await expect(this.submitButton).toBeDisabled();
    
    // Llenar solo el monto -> botón sigue deshabilitado
    await this.amountInput.fill(amount.toString());
    await expect(this.submitButton).toBeDisabled();
    
    // Agregar nota -> ahora debería habilitarse
    await this.noteInput.fill(note);
    await expect(this.submitButton).toBeEnabled();
    
    // Enviar y verificar éxito
    await this.submitButton.click();
    await this.expectPaymentSuccess();
  }

  async requestPayment(amount: number, note: string) {
    await this.navigateToNewTransaction();
    
    // Completar formulario para solicitud (request)
    await this.amountInput.fill(amount.toString());
    await this.noteInput.fill(note);
    
    // Verificar y usar el botón de request
    await expect(this.requestButton).toBeEnabled();
    await this.requestButton.click();
    
    // Esperar confirmación de la solicitud
    await this.expectRequestSuccess();
  }
//////////////////////////////////////////////////////////
  async expectPaymentFormVisible() {
    // Verifica que el formulario de nueva transacción se muestre
    await expect(this.transactionForm).toBeVisible();  
    // Click al primer usuario: asegurarse que exista y sea interactuable
    await expect(this.firstUserItem).toBeVisible({ timeout: 10000 });
    await this.firstUserItem.scrollIntoViewIfNeeded();
    await this.firstUserItem.click();
    // Verificar que los campos principales del formulario estén visibles
    await expect(this.amountInput).toBeVisible();
    await expect(this.noteInput).toBeVisible();
  }

  async expectPaymentSuccess() {
    // Múltiples indicadores posibles de éxito — utilizamos una "carrera" para aceptar cualquiera
    await Promise.race([
      expect(this.page.getByText(/paid/i)).toBeVisible(),
      expect(this.page.getByText(/transaction complete/i)).toBeVisible(),
      expect(this.page.getByText(/payment sent/i)).toBeVisible(),
      expect(this.successMessage).toBeVisible(),
      expect(this.page.url()).toContain('/transaction')
    ]);
  }

  async expectRequestSuccess() {
    // Indicadores de éxito para una solicitud (request)
    await Promise.race([
      expect(this.page.getByText(/requested/i)).toBeVisible(),
      expect(this.page.getByText(/request sent/i)).toBeVisible(),
      expect(this.successMessage).toBeVisible()
    ]);
  }

  async validateAmountInput(amount: string, shouldBeValid: boolean = true) {
    // Rellena el input de monto y verifica si aparece/oculta el error asociado
    await this.amountInput.clear();
    await this.amountInput.fill(amount);
    
    if (shouldBeValid) {
      await expect(this.amountError).not.toBeVisible();
    } else {
      await expect(this.amountError).toBeVisible();
    }
  }

  async validateNoteInput(note: string, shouldBeValid: boolean = true) {
    // Rellena el input de nota y verifica el helper/error correspondiente
    await this.noteInput.clear();
    await this.noteInput.fill(note);
    
    if (shouldBeValid) {
      await expect(this.noteError).not.toBeVisible();
    } else {
      await expect(this.noteError).toBeVisible();
    }
  }

  async expectFormValidation() {
    // Verificar estados iniciales de los botones (deshabilitados)
    await expect(this.submitButton).toBeDisabled();
    await expect(this.requestButton).toBeDisabled();
    
    // Monto inválido (ej. 0) -> botones deben seguir deshabilitados
    await this.amountInput.fill('0');
    await expect(this.submitButton).toBeDisabled();
    await expect(this.requestButton).toBeDisabled();
    
    // Monto válido pero sin nota -> aún deshabilitado
    await this.amountInput.fill('25');
    await expect(this.submitButton).toBeDisabled();
    await expect(this.requestButton).toBeDisabled();
    
    // Completar nota -> formulario completo y botón habilitado
    await this.noteInput.fill('Test payment');
    await expect(this.submitButton).toBeEnabled();
  }

  async clearForm() {
    // Limpia los campos del formulario
    await this.amountInput.clear();
    await this.noteInput.clear();
  }

  async fillFormPartially(amount?: number, note?: string) {
    // Permite llenar parcialmente el formulario según parámetros
    if (amount !== undefined) {
      await this.amountInput.fill(amount.toString());
    }
    
    if (note !== undefined) {
      await this.noteInput.fill(note);
    }
  }

  async getFormState() {
    // Devuelve el estado actual del formulario (útil para aserciones en tests)
    return {
      amount: await this.amountInput.inputValue(),
      note: await this.noteInput.inputValue(),
      submitEnabled: await this.submitButton.isEnabled(),
      requestEnabled: await this.requestButton.isEnabled()
    };
  }
}
