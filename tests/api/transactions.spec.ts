import { test, expect, request } from '@playwright/test';
import { config } from '../../config/env';
import { testUsers, apiEndpoints } from '../../config/test-data';
import { DatabaseHelper } from '../../config/database-helper';

// Función auxiliar para iniciar sesión y obtener el usuario autenticado
async function authenticateUser(apiContext: any, username: string = testUsers.primary.username, password: string = testUsers.primary.password) {
  const response = await apiContext.post(apiEndpoints.login, {
    data: { username, password }
  });
  
  expect(response.ok()).toBeTruthy(); // Verifica que la respuesta del login fue exitosa
  const responseBody = await response.json();
  return responseBody.user; // Devuelve el usuario autenticado
}


  // Test que verifica que /transactions requiere autenticación
  test('GET /transactions requiere autenticación', async () => {
    const apiContext = await request.newContext({ 
      baseURL: config.apiURL 
    });
    
    // Se hace una petición sin token ni login
    const response = await apiContext.get(apiEndpoints.transactions);
    
    // Se espera que falle por falta de autorización
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
    
    await apiContext.dispose(); // Cierra el contexto
  });


test.describe('API Users Extended Tests - QA Automation', () => {
  
  // Test que verifica la búsqueda de usuarios y su paginación
  test('GET /users/search valida paginación y límites de resultados', async () => {
    const apiContext = await request.newContext({ 
      baseURL: config.apiURL 
    });
    
    // Primero se hace login con usuario de prueba
    const loginResponse = await apiContext.post(apiEndpoints.login, {
      data: { 
        username: testUsers.primary.username, 
        password: process.env.TEST_PASSWORD!
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy(); // Confirma que el login fue exitoso
    
    // Se hace una búsqueda genérica de usuarios
    const searchResponse = await apiContext.get(`${config.apiURL}/users/search?q=@`);
    
    // Verifica que la búsqueda fue exitosa
    expect(searchResponse.ok()).toBeTruthy();
    expect(searchResponse.status()).toBe(200);
    
    const searchBody = await searchResponse.json();
    
    // Verifica que la respuesta tenga formato correcto
    expect(searchBody).toHaveProperty('results');
    expect(Array.isArray(searchBody.results)).toBeTruthy();
    
    // Asegura que no haya más de 50 resultados
    expect(searchBody.results.length).toBeLessThanOrEqual(50);
    
    // Si hay resultados, valida estructura de un usuario
    if (searchBody.results.length > 0) {
      const firstResult = searchBody.results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('firstName');
      expect(firstResult).not.toHaveProperty('password'); // No debe exponer datos sensibles
      expect(firstResult).not.toHaveProperty('balance');
    }
    
    await apiContext.dispose(); // Cierra el contexto
  });


  // Test que valida que se pueda actualizar parcialmente un usuario con PATCH
  test('PATCH /users/:userId valida actualización parcial de campos', async () => {
    const apiContext = await request.newContext({ 
      baseURL: config.apiURL 
    });
    
    // Login para obtener datos del usuario actual
    const loginResponse = await apiContext.post(apiEndpoints.login, {
      data: { 
        username: testUsers.primary.username, 
        password: process.env.TEST_PASSWORD!
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginBody = await loginResponse.json();
    const userId = loginBody.user.id;
    const originalFirstName = loginBody.user.firstName;
    
    // Se crea un nuevo nombre para actualizar el campo firstName
    const timestamp = Date.now();
    const updateData = {
      firstName: `Updated${timestamp}`
    };
    
    // Se hace el PATCH al usuario
    const updateResponse = await apiContext.patch(`${config.apiURL}/users/${userId}`, {
      data: updateData
    });
    
    expect(updateResponse.status()).toBe(204); // 204 = actualización exitosa sin contenido
    
    // Se obtiene nuevamente el usuario para verificar el cambio
    const getUserResponse = await apiContext.get(`${config.apiURL}/users/${userId}`);
    expect(getUserResponse.ok()).toBeTruthy();
    
    const updatedUser = await getUserResponse.json();
    
    // Verifica que el nombre haya cambiado correctamente
    expect(updatedUser.user.firstName).toBe(updateData.firstName);
    expect(updatedUser.user.firstName).not.toBe(originalFirstName);
    
    // Verifica que los otros campos no hayan sido modificados
    expect(updatedUser.user.id).toBe(userId);
    expect(updatedUser.user.username).toBe(testUsers.primary.username);
    
    await apiContext.dispose(); // Cierra el contexto
  });

  
});
