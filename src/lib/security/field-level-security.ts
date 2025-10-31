/**
 * Field-Level Security Service
 * 
 * Prevents sensitive data exposure by filtering API responses
 * based on user permissions and data sensitivity levels.
 */

import { supabase } from '@/integrations/supabase/client';
import { adminService } from '@/services/adminService';
import { logSecurityEvent } from '@/lib/security/error-handling';

export interface FieldSecurityRule {
  field: string;
  sensitivity: 'public' | 'internal' | 'sensitive' | 'restricted';
  requiredRole?: 'admin' | 'super_admin';
  description: string;
}

export interface DataFilterConfig {
  table: string;
  publicFields: string[];
  internalFields: string[];
  sensitiveFields: string[];
  restrictedFields: string[];
}

export class FieldLevelSecurityService {
  
  private static securityConfigs: Record<string, DataFilterConfig> = {
    clients: {
      table: 'clients',
      publicFields: ['id', 'nom', 'ville', 'created_at'],
      internalFields: ['telephone', 'updated_at'],
      sensitiveFields: ['total_paye'],
      restrictedFields: ['created_by', 'organization_id']
    },
    
    transactions: {
      table: 'transactions',
      publicFields: ['id', 'date_paiement', 'montant', 'devise', 'motif', 'mode_paiement', 'statut', 'created_at'],
      internalFields: ['montant_cny', 'updated_at'],
      sensitiveFields: ['frais', 'taux_usd_cny', 'taux_usd_cdf'],
      restrictedFields: ['benefice', 'valide_par', 'date_validation', 'created_by', 'organization_id']
    },
    
    profiles: {
      table: 'profiles',
      publicFields: ['id', 'first_name', 'last_name', 'created_at'],
      internalFields: ['avatar_url', 'updated_at', 'is_active'],
      sensitiveFields: ['phone'],
      restrictedFields: ['email', 'role', 'organization_id']
    },
    
    activity_logs: {
      table: 'activity_logs',
      publicFields: ['id', 'action', 'date'],
      internalFields: ['cible', 'updated_at'],
      sensitiveFields: ['details'],
      restrictedFields: ['user_id', 'cible_id']
    }
  };

  /**
   * Get filtered fields based on user permissions
   */
  async getFilteredFields(tableName: string, userRole?: string): Promise<string[]> {
    try {
      // Get current user if role not provided
      if (!userRole) {
        const isAdmin = await adminService.isCurrentUserAdmin();
        userRole = isAdmin ? 'admin' : 'user';
      }

      const config = FieldLevelSecurityService.securityConfigs[tableName];
      if (!config) {
        console.warn(`No security configuration for table: ${tableName}`);
        return ['*']; // Default to all fields if no config
      }

      let allowedFields: string[] = [];

      switch (userRole) {
        case 'super_admin':
          allowedFields = [
            ...config.publicFields,
            ...config.internalFields,
            ...config.sensitiveFields,
            ...config.restrictedFields
          ];
          break;
          
        case 'admin':
          allowedFields = [
            ...config.publicFields,
            ...config.internalFields,
            ...config.sensitiveFields
          ];
          break;
          
        default:
          allowedFields = [
            ...config.publicFields,
            ...config.internalFields
          ];
          break;
      }

      // Log field access for security monitoring
      await this.logFieldAccess(tableName, userRole, allowedFields);

      return allowedFields;
    } catch (error: any) {
      console.error('Error getting filtered fields:', error);
      
      // Fail secure: return only public fields on error
      const config = FieldLevelSecurityService.securityConfigs[tableName];
      return config?.publicFields || ['id'];
    }
  }

  /**
   * Build secure select query with field filtering
   */
  async buildSecureSelect(tableName: string, userRole?: string): Promise<string> {
    try {
      const allowedFields = await this.getFilteredFields(tableName, userRole);
      
      if (allowedFields.length === 0) {
        return 'id'; // Minimum field selection
      }

      // Handle related table fields (e.g., client:clients(*))
      if (tableName.includes(':')) {
        const [mainTable, relatedTable] = tableName.split(':');
        const mainFields = await this.getFilteredFields(mainTable, userRole);
        const relatedFields = await this.getFilteredFields(relatedTable, userRole);
        
        return `${mainFields.join(', ')}, ${relatedTable}:${relatedFields.join(', ')}`;
      }

      return allowedFields.join(', ');
    } catch (error: any) {
      console.error('Error building secure select:', error);
      
      // Fail secure: return only ID field
      return 'id';
    }
  }

  /**
   * Filter response data based on field security
   */
  async filterResponseData(tableName: string, data: any[], userRole?: string): Promise<any[]> {
    try {
      const allowedFields = await this.getFilteredFields(tableName, userRole);
      
      if (!data || data.length === 0) {
        return data;
      }

      return data.map(item => {
        const filteredItem: any = {};
        
        allowedFields.forEach(field => {
          if (item && item.hasOwnProperty(field)) {
            filteredItem[field] = item[field];
          }
        });

        // Handle nested objects (e.g., client data)
        Object.keys(item || {}).forEach(key => {
          if (typeof item[key] === 'object' && item[key] !== null) {
            filteredItem[key] = item[key]; // Keep nested objects for now
          }
        });

        return filteredItem;
      });
    } catch (error: any) {
      console.error('Error filtering response data:', error);
      
      // Log security event
      logSecurityEvent(
        'DATA_FILTERING_ERROR',
        `Failed to filter data for table ${tableName}`,
        'medium',
        { tableName, error: error.message }
      );
      
      // Fail secure: return minimal data
      return data.map(item => ({ id: item.id }));
    }
  }

  /**
   * Sanitize sensitive fields from single object
   */
  async sanitizeObject(tableName: string, obj: any, userRole?: string): Promise<any> {
    if (!obj) return obj;
    
    const allowedFields = await this.getFilteredFields(tableName, userRole);
    const sanitized: any = {};
    
    allowedFields.forEach(field => {
      if (obj.hasOwnProperty(field)) {
        sanitized[field] = obj[field];
      }
    });

    return sanitized;
  }

  /**
   * Check if field access is allowed
   */
  async isFieldAllowed(tableName: string, fieldName: string, userRole?: string): Promise<boolean> {
    try {
      const allowedFields = await this.getFilteredFields(tableName, userRole);
      return allowedFields.includes(fieldName);
    } catch (error) {
      console.error('Error checking field access:', error);
      return false; // Fail secure
    }
  }

  /**
   * Get field sensitivity information
   */
  getFieldSensitivity(tableName: string, fieldName: string): FieldSecurityRule | null {
    const config = FieldLevelSecurityService.securityConfigs[tableName];
    if (!config) return null;

    if (config.publicFields.includes(fieldName)) {
      return {
        field: fieldName,
        sensitivity: 'public',
        description: 'Publicly accessible information'
      };
    }

    if (config.internalFields.includes(fieldName)) {
      return {
        field: fieldName,
        sensitivity: 'internal',
        description: 'Internal system information'
      };
    }

    if (config.sensitiveFields.includes(fieldName)) {
      return {
        field: fieldName,
        sensitivity: 'sensitive',
        requiredRole: 'admin',
        description: 'Sensitive business information'
      };
    }

    if (config.restrictedFields.includes(fieldName)) {
      return {
        field: fieldName,
        sensitivity: 'restricted',
        requiredRole: 'super_admin',
        description: 'Highly restricted system information'
      };
    }

    return null;
  }

  /**
   * Log field access for security monitoring
   */
  private async logFieldAccess(tableName: string, userRole: string, fields: string[]): Promise<void> {
    try {
      const sensitiveFields = fields.filter(field => {
        const sensitivity = this.getFieldSensitivity(tableName, field);
        return sensitivity?.sensitivity === 'sensitive' || sensitivity?.sensitivity === 'restricted';
      });

      if (sensitiveFields.length > 0) {
        logSecurityEvent(
          'SENSITIVE_FIELD_ACCESS',
          `Access to sensitive fields in ${tableName}`,
          'low',
          { tableName, userRole, fields: sensitiveFields }
        );
      }
    } catch (error) {
      console.error('Error logging field access:', error);
    }
  }

  /**
   * Validate export data security
   */
  async validateExportSecurity(tableName: string, fields: string[], userRole?: string): Promise<{
    isValid: boolean;
    blockedFields: string[];
    allowedFields: string[];
  }> {
    try {
      const allowedFields = await this.getFilteredFields(tableName, userRole);
      const blockedFields = fields.filter(field => !allowedFields.includes(field));
      
      return {
        isValid: blockedFields.length === 0,
        blockedFields,
        allowedFields
      };
    } catch (error: any) {
      console.error('Error validating export security:', error);
      
      return {
        isValid: false,
        blockedFields: fields,
        allowedFields: []
      };
    }
  }

  /**
   * Get security configuration for a table
   */
  getSecurityConfig(tableName: string): DataFilterConfig | null {
    return FieldLevelSecurityService.securityConfigs[tableName] || null;
  }

  /**
   * Update security configuration (admin only)
   */
  async updateSecurityConfig(tableName: string, config: Partial<DataFilterConfig>): Promise<void> {
    try {
      const isAdmin = await adminService.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized to update security configuration');
      }

      const currentConfig = FieldLevelSecurityService.securityConfigs[tableName];
      if (currentConfig) {
        FieldLevelSecurityService.securityConfigs[tableName] = {
          ...currentConfig,
          ...config
        };
      }

      logSecurityEvent(
        'SECURITY_CONFIG_UPDATED',
        `Security configuration updated for ${tableName}`,
        'medium',
        { tableName, updatedFields: Object.keys(config) }
      );
    } catch (error: any) {
      console.error('Error updating security config:', error);
      
      logSecurityEvent(
        'SECURITY_CONFIG_UPDATE_FAILED',
        `Failed to update security config for ${tableName}`,
        'high',
        { tableName, error: error.message }
      );
      
      throw error;
    }
  }
}

export const fieldLevelSecurityService = new FieldLevelSecurityService();
