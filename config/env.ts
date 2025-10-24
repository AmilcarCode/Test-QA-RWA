// config/env.ts
import dotenv from 'dotenv';
dotenv.config(); // carga .env en cuanto se importa este módulo

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable requerida: ${name} en el archivo .env`);
  return v;
}

export const config = {
  baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  apiURL: process.env.API_URL ?? 'http://localhost:3001',
  timeout: Number(process.env.PW_TIMEOUT ?? 30000),
  expectTimeout: Number(process.env.PW_EXPECT_TIMEOUT ?? 15000),

  // Secretos y credenciales
  testPassword: required('TEST_PASSWORD'),
};

