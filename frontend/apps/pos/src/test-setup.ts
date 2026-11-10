import { afterEach, beforeEach } from 'vitest';
import { configurarBaseApi } from './app/core/api-config';

beforeEach(() => {
  configurarBaseApi('http://localhost:8000');
});

// Los specs comparten window entre archivos: si un test reemplaza matchMedia (por ejemplo,
// tema.service.spec.ts con un stub sin addListener), se restaura al terminar para que no
// llegue al BreakpointObserver del CDK en el siguiente archivo (test-setup.spec.ts).
const matchMediaOriginal = Object.getOwnPropertyDescriptor(window, 'matchMedia');

afterEach(() => {
  if (matchMediaOriginal) {
    Object.defineProperty(window, 'matchMedia', matchMediaOriginal);
  } else {
    delete (window as { matchMedia?: unknown }).matchMedia;
  }
});
