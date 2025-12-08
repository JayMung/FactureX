// Tests automatisés pour les contraintes de validation financière
import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Financial Validation Constraints', () => {
  const testOrgId = 'test-org-id';
  const testUserId = 'test-user-id';

  beforeEach(async () => {
    // Nettoyer les données de test
    await supabase.from('transactions').delete().eq('organization_id', testOrgId);
    await supabase.from('comptes_financiers').delete().eq('organization_id', testOrgId);
  });

  describe('Transaction Validation', () => {
    it('should reject negative amounts', async () => {
      const { error } = await supabase.from('transactions').insert({
        montant: -100,
        type_transaction: 'revenue',
        devise: 'USD',
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });

    it('should reject amounts greater than maximum', async () => {
      const { error } = await supabase.from('transactions').insert({
        montant: 1000000000, // > 999,999,999.99
        type_transaction: 'revenue',
        devise: 'USD',
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });

    it('should reject invalid currency', async () => {
      const { error } = await supabase.from('transactions').insert({
        montant: 100,
        type_transaction: 'revenue',
        devise: 'EUR', // Non autorisé
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });

    it('should reject fees greater than amount', async () => {
      const { error } = await supabase.from('transactions').insert({
        montant: 100,
        frais: 150, // > montant
        type_transaction: 'revenue',
        devise: 'USD',
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });

    it('should accept valid transaction', async () => {
      const { data, error } = await supabase.from('transactions').insert({
        montant: 100,
        frais: 5,
        type_transaction: 'revenue',
        devise: 'USD',
        organization_id: testOrgId,
        created_by: testUserId
      }).select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('Account Validation', () => {
    it('should reject negative balance', async () => {
      const { error } = await supabase.from('comptes_financiers').insert({
        nom: 'Test Account',
        type_compte: 'mobile_money',
        solde_actuel: -100,
        devise: 'USD',
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });

    it('should reject invalid account type', async () => {
      const { error } = await supabase.from('comptes_financiers').insert({
        nom: 'Test Account',
        type_compte: 'crypto', // Non autorisé
        solde_actuel: 100,
        devise: 'USD',
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });

    it('should reject empty account name', async () => {
      const { error } = await supabase.from('comptes_financiers').insert({
        nom: '   ', // Vide après trim
        type_compte: 'mobile_money',
        solde_actuel: 100,
        devise: 'USD',
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });
  });

  describe('Payment Validation', () => {
    it('should reject zero payment amount', async () => {
      const { error } = await supabase.from('paiements').insert({
        montant_paye: 0,
        type_paiement: 'facture',
        client_id: 'test-client-id',
        compte_id: 'test-account-id',
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });

    it('should reject invalid payment type', async () => {
      const { error } = await supabase.from('paiements').insert({
        montant_paye: 100,
        type_paiement: 'donation', // Non autorisé
        client_id: 'test-client-id',
        compte_id: 'test-account-id',
        organization_id: testOrgId,
        created_by: testUserId
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('VALIDATION_ERROR');
    });
  });

  describe('Performance Test', () => {
    it('should handle 1000 transactions within acceptable time', async () => {
      const startTime = Date.now();
      
      const transactions = Array.from({ length: 1000 }, (_, i) => ({
        montant: 100 + i,
        type_transaction: 'revenue' as const,
        devise: 'USD',
        organization_id: testOrgId,
        created_by: testUserId
      }));

      const { error } = await supabase.from('transactions').insert(transactions);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000); // Moins de 5 secondes pour 1000 transactions
    });
  });
});

// Test de rollback des contraintes
describe('Constraint Rollback', () => {
  it('should successfully drop constraints', async () => {
    // Test pour vérifier que les contraintes peuvent être supprimées
    const { error } = await supabase.rpc('test_constraint_rollback');
    
    expect(error).toBeNull();
  });
});
