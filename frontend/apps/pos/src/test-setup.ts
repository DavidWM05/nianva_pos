import { beforeEach } from 'vitest';
import { configurarBaseApi } from './app/core/api-config';

beforeEach(() => {
  configurarBaseApi('http://localhost:8000');
});
