import axios from 'axios';
import { API_BASE } from './api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // если используешь cookie
  timeout: 20000,
});

export default api;
