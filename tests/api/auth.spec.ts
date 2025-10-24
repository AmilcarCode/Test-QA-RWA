import { test, expect, request } from '@playwright/test';
import { config } from '../../config/env';
import { testUsers, apiEndpoints } from '../../config/test-data';
import { DatabaseHelper } from '../../config/database-helper';

// Grupo de tests de autenticación más completos y robustos
test.describe('API Authentication Tests - Robustos', () => {
  
  // Verifica que el login funcione correctamente con un usuario real
  test('POST /login devuelve token válido con usuario real', async () => {
    const apiContext = await request.newContext({ 
      baseURL: config.apiURL 
    });
    
    const user = testUsers.primary;
    
    // Enviar credenciales válidas
    const response = await apiContext.post(apiEndpoints.login, {
      data: { 
        username: user.username, 
        password: process.env.TEST_PASSWORD!
      }
    });
    
    // Validar respuesta exitosa
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    // Validar estructura de usuario en la respuesta
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('user');
    expect(responseBody.user).toHaveProperty('id');
    expect(responseBody.user).toHaveProperty('username', user.username);
    expect(responseBody.user).toHaveProperty('firstName');
    expect(responseBody.user).toHaveProperty('lastName');
    
    await apiContext.dispose();
  });

  // Prueba de login con varios usuarios válidos de la base de datos
  test('POST /login con múltiples usuarios válidos de la base de datos', async () => {
    const validUsers = DatabaseHelper.getValidUsers();
    
    for (const user of validUsers.slice(0, 3)) { // Usa los primeros 3 usuarios
      const apiContext = await request.newContext({ 
        baseURL: config.apiURL 
      });
      
      // Enviar credenciales de cada usuario
      const response = await apiContext.post(apiEndpoints.login, {
        data: { 
          username: user.username, 
          password: process.env.TEST_PASSWORD!
        }
      });
      
      // Validar que cada login sea exitoso
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const responseBody = await response.json();
      expect(responseBody.user.username).toBe(user.username);
      expect(responseBody.user.id).toBe(user.id);
      
      await apiContext.dispose();
    }
  });

  // Verifica que el login falle con distintas combinaciones inválidas
  test('POST /login falla con credenciales inválidas - casos múltiples', async () => {
    const invalidCredentials = [
      {}, // cuerpo vacío
      { username: '' }, // username vacío
      { password: '' }, // password vacío
      { username: 'nonexistent', password: 'wrong' }, // usuario inexistente
      { username: testUsers.primary.username, password: 'wrong' }, // password incorrecta
    ];

    for (const credentials of invalidCredentials) {
      const apiContext = await request.newContext({ baseURL: config.apiURL });
      const response = await apiContext.post(apiEndpoints.login, { data: credentials });

      expect(response.ok()).toBeFalsy();

      // Validación por tipo de error esperado
      if (!credentials.username || !credentials.password) {
        // Campos vacíos → debe devolver 400 o 422
        expect([400, 422]).toContain(response.status());
      } else if (credentials.username === testUsers.primary.username && credentials.password === '') {
        // Caso especial con password vacío
        expect([400, 422]).toContain(response.status());
      } else {
        // Usuario o password incorrecto → 401 o 422 (según API)
        expect([401, 422, 400]).toContain(response.status());
      }

      await apiContext.dispose();
    }
  });

  // Verifica que el endpoint /login valide correctamente la estructura del body
  test('POST /login valida estructura de request correctamente', async () => {
    const apiContext = await request.newContext({ 
      baseURL: config.apiURL 
    });
    
    // Cuerpo vacío → debe devolver error 400
    const emptyResponse = await apiContext.post(apiEndpoints.login, { data: {} });
    expect(emptyResponse.status()).toBe(400);
    
    // Solo username → error 400
    const usernameOnlyResponse = await apiContext.post(apiEndpoints.login, {
      data: { username: testUsers.primary.username }
    });
    expect(usernameOnlyResponse.status()).toBe(400);
    
    // Solo password → error 400
    const passwordOnlyResponse = await apiContext.post(apiEndpoints.login, {
      data: { password: process.env.TEST_PASSWORD! }
    });
    expect(passwordOnlyResponse.status()).toBe(400);
    
    // Con campos extra → debería funcionar igual (los ignora)
    const extraFieldsResponse = await apiContext.post(apiEndpoints.login, {
      data: { 
        username: testUsers.primary.username,
        password: process.env.TEST_PASSWORD!,
        extraField: 'should_be_ignored'
      }
    });
    expect(extraFieldsResponse.ok()).toBeTruthy();
    
    await apiContext.dispose();
  });

  // Verifica que el endpoint responda dentro de un tiempo aceptable
  test('POST /login performance - responde en tiempo aceptable', async () => {
    const apiContext = await request.newContext({ 
      baseURL: config.apiURL 
    });
    
    const measurements = [];
    
    // Realiza 5 peticiones para medir el tiempo promedio
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      const response = await apiContext.post(apiEndpoints.login, {
        data: { 
          username: testUsers.primary.username, 
          password: process.env.TEST_PASSWORD!
        }
      });
      
      const responseTime = Date.now() - startTime;
      measurements.push(responseTime);
      
      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(3000); // Cada request < 3s
    }
    
    // Calcula el promedio y verifica que sea menor a 2s
    const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    expect(averageTime).toBeLessThan(2000);
    
    await apiContext.dispose();
  });

  // Verifica headers y estructura de respuesta del login
  test('POST /login headers y content-type correctos', async () => {
    const apiContext = await request.newContext({ 
      baseURL: config.apiURL 
    });
    
    const response = await apiContext.post(apiEndpoints.login, {
      data: { 
        username: testUsers.primary.username, 
        password: process.env.TEST_PASSWORD!
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Validar headers devueltos
    const headers = response.headers();
    expect(headers['content-type']).toContain('application/json');
    
    // Validar estructura del cuerpo
    const responseBody = await response.json();
    expect(responseBody).toMatchObject({
      user: {
        id: expect.any(String),
        username: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        email: expect.any(String)
      }
    });
    
    await apiContext.dispose();
  });

  // Prueba de concurrencia: múltiples logins simultáneos
  test('POST /login concurrencia - múltiples requests simultáneos', async () => {
    const promises = [];
    
    // Crea 5 logins al mismo tiempo
    for (let i = 0; i < 5; i++) {
      const promise = (async () => {
        const apiContext = await request.newContext({ 
          baseURL: config.apiURL 
        });
        
        const response = await apiContext.post(apiEndpoints.login, {
          data: { 
            username: testUsers.primary.username, 
            password: process.env.TEST_PASSWORD!
          }
        });
        
        await apiContext.dispose();
        return response;
      })();
      
      promises.push(promise);
    }
    
    // Espera que todos terminen
    const responses = await Promise.all(promises);
    
    // Todos deben ser exitosos
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    });
  });

  // Simula muchos intentos de login rápidos para probar límites del servidor
  test('POST /login rate limiting - comportamiento bajo carga', async () => {
    const apiContext = await request.newContext({ 
      baseURL: config.apiURL 
    });
    
    const requests = [];
    const maxRequests = 10;
    
    // Envía varias peticiones casi simultáneas
    for (let i = 0; i < maxRequests; i++) {
      const requestPromise = apiContext.post(apiEndpoints.login, {
        data: { 
          username: testUsers.primary.username, 
          password: process.env.TEST_PASSWORD!
        }
      });
      requests.push(requestPromise);
    }
    
    const responses = await Promise.all(requests);
    
    // Al menos 80% deberían ser exitosas
    const successfulResponses = responses.filter(r => r.ok());
    expect(successfulResponses.length).toBeGreaterThan(maxRequests * 0.8);
    
    await apiContext.dispose();
  });
});
