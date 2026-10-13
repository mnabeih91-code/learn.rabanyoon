import type { IMonthlySubscriptionService, ServiceMode } from './types';
import { LocalMonthlySubscriptionService } from './localService';
import { SupabaseMonthlySubscriptionService } from './supabaseService';

// ============================================================================
// SERVICE FACTORY
// ============================================================================
// Creates the appropriate service implementation based on the configured mode.
//
// Currently defaults to Supabase mode since the Bolt environment has a
// provisioned Supabase instance. When switching to PHP + MySQL, create a
// PhpApiMonthlySubscriptionService and switch the factory to use it.
//
// To force local/mock mode for testing, set:
//   localStorage.setItem('rabanyoon_service_mode', 'local')
// ============================================================================

let _instance: IMonthlySubscriptionService | null = null;
let _currentMode: ServiceMode | null = null;

function getModeFromEnv(): ServiceMode {
  // Check localStorage override (for preview testing)
  try {
    const override = localStorage.getItem('rabanyoon_service_mode');
    if (override === 'local' || override === 'supabase') {
      return override;
    }
  } catch {
    // ignore
  }

  // Default: use Supabase (Bolt environment has it provisioned)
  return 'supabase';
}

export function getMonthlySubscriptionService(): IMonthlySubscriptionService {
  const mode = getModeFromEnv();

  if (_instance && _currentMode === mode) {
    return _instance;
  }

  switch (mode) {
    case 'local':
      _instance = new LocalMonthlySubscriptionService();
      break;
    case 'supabase':
      _instance = new SupabaseMonthlySubscriptionService();
      break;
    default:
      _instance = new SupabaseMonthlySubscriptionService();
  }

  _currentMode = mode;
  return _instance;
}

export function getServiceMode(): ServiceMode {
  return getModeFromEnv();
}

export function isLocalMode(): boolean {
  return getModeFromEnv() === 'local';
}

// Allow switching mode at runtime (for testing)
export function setServiceMode(mode: ServiceMode) {
  try {
    localStorage.setItem('rabanyoon_service_mode', mode);
  } catch {
    // ignore
  }
  _instance = null;
  _currentMode = null;
}

// Reset instance (useful after data changes that require fresh service)
export function resetServiceInstance() {
  _instance = null;
  _currentMode = null;
}
