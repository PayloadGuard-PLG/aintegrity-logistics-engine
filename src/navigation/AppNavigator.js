/**
 * AppNavigator
 * Routing configuration for AIntegrity Squad Optimiser
 */

export const ROUTES = {
  HOME: 'Home',
  SELECTOR: 'PlayerSelector',
  RESULTS: 'OptimizedSquad',
  SETTINGS: 'WeightsConfiguration'
};

export const NavigationStack = [
  { name: ROUTES.HOME, title: 'Squad Dashboard' },
  { name: ROUTES.SELECTOR, title: 'Select Players' },
  { name: ROUTES.RESULTS, title: 'Optimal Lineup' }
];
