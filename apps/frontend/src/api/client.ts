import axios from 'axios';

const baseURL = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
  ? import.meta.env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:4000/api'
  : process.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
});
