import { Page, expect, Locator } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  // ==== Selectores claros y específicos ====

  get usernameInput(): Locator {
    // Campo de texto para el nombre de usuario
    return this.page.locator('input#username');
  }

  get passwordInput(): Locator {
    // Campo de texto para la contraseña
    return this.page.locator('input#password');
  }

  get submitButton(): Locator {
    // Botón principal para enviar el formulario de inicio de sesión
    return this.page.locator('[data-test="signin-submit"], [data-testid="signin-submit"], button:has-text("Sign In")');
  }

  get signUpLink(): Locator {
    // Enlace o botón para ir a la página de registro
    return this.page.locator('[data-test="signup"], [data-testid="signup"], a:has-text("Sign up"), a:has-text("Signup")');
  }

  get rememberMeCheckbox(): Locator {
    // Casilla "Recordarme" (puede variar según el tipo de input)
    return this.page.locator('[data-test="signin-remember-me"], [data-testid="signin-remember-me"], input[name="remember"]');
  }

  get errorMessage(): Locator {
    // Mensaje de error mostrado si el login falla
    return this.page.locator('[data-test*="signin-error"], [data-testid*="signin-error"], .error-message, [role="alert"]');
  }

  // ==== Método interno para esperar resultado del login ====
  private async waitForLoginResult(timeout = 8000): Promise<'success' | 'error' | 'timeout'> {
    const start = Date.now();
    
    // Posibles indicadores visuales de inicio de sesión exitoso
    const successLocators: Locator[] = [
      this.page.locator('[data-test="sidenav-user-full-name"]'),
      this.page.locator('[data-test="sidenav-username"]'),
      this.page.locator('.NavDrawer-avatar img'),
      this.page.locator('[data-test="sidenav-home"], [data-testid="sidenav-home"]'),
      this.page.locator('[data-test="nav-home"], [data-testid="nav-home"], #nav-home'),
    ];

    const errorLoc = this.errorMessage;

    // Polling para detectar éxito o error antes de que venza el tiempo
    while (Date.now() - start < timeout) {
      for (const loc of successLocators) {
        try {
          if (await loc.isVisible()) return 'success';
        } catch {
          // ignora errores puntuales de visibilidad
        }
      }

      try {
        if (await errorLoc.isVisible()) return 'error';
      } catch {
        // ignora errores de localizador
      }

      await this.page.waitForTimeout(200);
    }

    return 'timeout'; // si no se detectó nada en el tiempo dado
  }

  // ==== Acciones principales ====

  async goto() {
    // Abre la página principal y verifica que sea la app esperada
    await this.page.goto('/');
    await expect(this.page).toHaveTitle(/Cypress Real World App/);
    await this.expectLoginFormVisible();
  }

  async login(username: string, password: string, rememberMe: boolean = false) {
    // Completa usuario y contraseña
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);

    // Marca "Recordarme" si se pidió
    if (rememberMe) {
      const cb = this.rememberMeCheckbox;
      try {
        // intenta marcar usando la API de checkbox
        if ((await cb.getAttribute('type')) === 'checkbox') {
          if (!(await cb.isChecked?.())) await cb.check();
        } else {
          await cb.click(); // fallback: clic manual
        }
      } catch {
        // intenta clic como último recurso
        try { await cb.click(); } catch {}
      }
    }

    // Verifica que el botón esté habilitado y realiza clic
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();

    // Espera el resultado del login
    const result = await this.waitForLoginResult();
    if (result === 'timeout') {
      throw new Error('Timeout: ni éxito ni error luego de login');
    }

    // Si fue exitoso, espera un indicador adicional visible (home)
    if (result === 'success') {
      await this.page.locator('[data-test="nav-home"], [data-testid="nav-home"], #nav-home, a:has-text("Home")')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 })
        .catch(() => {});
    }

    // Asegura que ya no esté en la página de login
    await expect(this.page).not.toHaveURL(/\/signin/);
  }

  async loginWithValidation(username: string, password: string) {
    // Variante simplificada del login que devuelve el resultado ('success' | 'error' | 'timeout')
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);

    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();

    const result = await this.waitForLoginResult();
    return result;
  }

  async expectLoginFormVisible() {
    // Verifica que todos los elementos del formulario de login estén visibles
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  }

  async expectLoginError(errorText?: string) {
    // Verifica que aparezca un mensaje de error (y texto opcional)
    await expect(this.errorMessage).toBeVisible();
    if (errorText) await expect(this.page.getByText(errorText)).toBeVisible();
  }

  async expectLoginSuccess() {
    // Comprueba que el usuario haya llegado al "Home" y no siga en /signin
    await expect(this.page.locator('[data-test="nav-home"], [data-testid="nav-home"], #nav-home, a:has-text("Home")')).toBeVisible();
    await expect(this.page).not.toHaveURL(/\/signin/);
  }

  async logout() {
    // Busca y hace clic en cualquier botón/enlace de logout disponible
    const logoutSelectors: Locator[] = [
      this.page.locator('[data-test="sidenav-signout"], [data-testid="sidenav-signout"]'),
      this.page.locator('[data-test="nav-signout"], [data-testid="nav-signout"]'),
      this.page.getByRole('button', { name: /sign out|logout/i }),
      this.page.getByText(/sign out|logout/i)
    ];

    for (const selector of logoutSelectors) {
      try {
        if (await selector.isVisible({ timeout: 2000 })) {
          await selector.click();
          break;
        }
      } catch {
        // pasa al siguiente selector
      }
    }

    // Verifica que volvió al formulario de login
    await expect(this.usernameInput).toBeVisible({ timeout: 2000 });
  }

  async clearForm() {
    // Limpia los campos del formulario
    await this.usernameInput.fill('');
    await this.passwordInput.fill('');
  }

  async expectFormValidation() {
    // Comprueba la validación básica del formulario de login
    await expect(this.submitButton).toBeDisabled(); // vacío -> deshabilitado
    await this.usernameInput.fill('test');
    await expect(this.submitButton).toBeDisabled(); // solo usuario -> deshabilitado
    await this.passwordInput.fill('test');
    await expect(this.submitButton).toBeEnabled();  // completo -> habilitado
  }
}
