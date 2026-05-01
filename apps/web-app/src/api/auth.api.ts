import axios from 'axios';
import type { LoginRequest, TokenPair } from '../types/auth.types';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000/api';

export async function login(data: LoginRequest): Promise<TokenPair> {
  const res = await axios.post<TokenPair>(`${BASE_URL}/auth/login`, data);
  return res.data;
}
