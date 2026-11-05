import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./paginas/indice.page').then((m) => m.IndicePage),
  },
  {
    path: 'tokens',
    loadComponent: () => import('./paginas/tokens.page').then((m) => m.TokensPage),
  },
  {
    path: 'material',
    loadComponent: () => import('./paginas/material.page').then((m) => m.MaterialPage),
  },
  {
    path: 'format',
    loadComponent: () => import('./paginas/format.page').then((m) => m.FormatPage),
  },
  {
    path: 'feedback',
    loadComponent: () => import('./paginas/feedback.page').then((m) => m.FeedbackPage),
  },
  {
    path: 'actions',
    loadComponent: () => import('./paginas/actions.page').then((m) => m.ActionsPage),
  },
  {
    path: 'layout',
    loadComponent: () => import('./paginas/layout.page').then((m) => m.LayoutPage),
  },
  {
    path: 'data',
    loadComponent: () => import('./paginas/data.page').then((m) => m.DataPage),
  },
  {
    path: 'forms',
    loadComponent: () => import('./paginas/forms.page').then((m) => m.FormsPage),
  },
  {
    path: 'overlays',
    loadComponent: () => import('./paginas/overlays.page').then((m) => m.OverlaysPage),
  },
  {
    path: 'report',
    loadComponent: () => import('./paginas/report.page').then((m) => m.ReportPage),
  },
  { path: '**', redirectTo: '' },
];
