// Configuration pour les tests
import { vi } from 'vitest'

// Mock Supabase pour les tests
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ data: null, error: null })),
      select: vi.fn(() => ({ data: [], error: null })),
      delete: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({ data: null, error: null })),
      eq: vi.fn(() => ({ data: null, error: null })),
      gte: vi.fn(() => ({ data: null, error: null })),
      lte: vi.fn(() => ({ data: null, error: null })),
      order: vi.fn(() => ({ data: null, error: null })),
      limit: vi.fn(() => ({ data: null, error: null })),
    })),
    rpc: vi.fn(() => ({ data: null, error: null })),
  }
}))

// Mock toast pour éviter les erreurs dans les tests
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }
}))

// Variables d'environnement pour les tests
process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
