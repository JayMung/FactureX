/**
 * Security testing utilities
 */

import { 
  validateSupabaseRequest, 
  validateUserSession, 
  detectAttackPatterns,
  validateRateLimit 
} from './validation';
import { handleSupabaseError } from './error-handling';
import { validateSecurityHeaders } from './headers';
import { validateSecurityRequirements } from './index';

export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  details: string;
  recommendations: string[];
}

export class SecurityTester {
  private results: SecurityTestResult[] = [];

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<SecurityTestResult[]> {
    this.results = [];

    // Test 1: Environment Security
    await this.testEnvironmentSecurity();

    // Test 2: Request Validation
    await this.testRequestValidation();

    // Test 3: Attack Pattern Detection
    await this.testAttackPatternDetection();

    // Test 4: Error Handling
    await this.testErrorHandling();

    // Test 5: Rate Limiting
    await this.testRateLimiting();

    // Test 6: Security Headers
    await this.testSecurityHeaders();

    return this.results;
  }

  /**
   * Test environment security
   */
  private async testEnvironmentSecurity(): Promise<void> {
    const validation = validateSecurityRequirements();
    
    this.results.push({
      testName: 'Environment Security',
      passed: validation.isValid,
      riskLevel: validation.issues.length > 2 ? 'high' : validation.issues.length > 0 ? 'medium' : 'low',
      details: validation.isValid ? 'All security requirements met' : `Issues found: ${validation.issues.join(', ')}`,
      recommendations: validation.issues.length > 0 ? [
        'Fix missing environment variables',
        'Enable HTTPS in production',
        'Disable console in production'
      ] : ['Continue monitoring environment security']
    });
  }

  /**
   * Test request validation
   */
  private async testRequestValidation(): Promise<void> {
    // Test valid request
    const validRequest = {
      url: '/api/clients',
      method: 'GET',
      headers: {
        'x-requested-with': 'XMLHttpRequest'
      }
    };

    const validResult = validateSupabaseRequest(validRequest);

    // Test invalid request
    const invalidRequest = {
      url: '/api/clients<script>alert("xss")</script>',
      method: 'INVALID',
      headers: {}
    };

    const invalidResult = validateSupabaseRequest(invalidRequest);

    const passed = validResult.isValid && !invalidResult.isValid;

    this.results.push({
      testName: 'Request Validation',
      passed,
      riskLevel: passed ? 'low' : 'high',
      details: passed ? 'Request validation working correctly' : 'Request validation has issues',
      recommendations: passed ? 
        ['Continue monitoring request validation'] : 
        ['Fix request validation logic', 'Add more strict validation rules']
    });
  }

  /**
   * Test attack pattern detection
   */
  private async testAttackPatternDetection(): Promise<void> {
    const testCases = [
      { input: '<script>alert("xss")</script>', expectedAttack: true },
      { input: 'javascript:alert("xss")', expectedAttack: true },
      { input: "SELECT * FROM users; DROP TABLE users;", expectedAttack: true },
      { input: 'Normal user input', expectedAttack: false },
      { input: 'Client name 123', expectedAttack: false }
    ];

    let allPassed = true;
    const results: string[] = [];

    testCases.forEach(({ input, expectedAttack }) => {
      const result = detectAttackPatterns(input);
      const passed = result.isAttack === expectedAttack;
      
      if (!passed) {
        allPassed = false;
        results.push(`Failed for input: "${input}"`);
      }
    });

    this.results.push({
      testName: 'Attack Pattern Detection',
      passed: allPassed,
      riskLevel: allPassed ? 'low' : 'high',
      details: allPassed ? 'All attack patterns detected correctly' : `Issues: ${results.join(', ')}`,
      recommendations: allPassed ? 
        ['Continue updating attack patterns'] : 
        ['Fix attack detection logic', 'Add more attack patterns']
    });
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    // Test security error handling
    const securityError = {
      code: 'PGRST301',
      message: 'permission denied for table clients',
      details: 'RLS policy violation'
    };

    const handledError = handleSupabaseError(securityError);

    const passed = handledError.isSecurityRelated && 
                  handledError.riskLevel === 'high' &&
                  handledError.message !== securityError.message; // Should be sanitized

    this.results.push({
      testName: 'Error Handling',
      passed,
      riskLevel: passed ? 'low' : 'medium',
      details: passed ? 'Security errors handled correctly' : 'Error handling needs improvement',
      recommendations: passed ? 
        ['Continue monitoring error handling'] : 
        ['Improve error sanitization', 'Add more security error detection']
    });
  }

  /**
   * Test rate limiting
   */
  private async testRateLimiting(): Promise<void> {
    const identifier = 'test-user';
    const limit = 5;
    const window = 60000; // 1 minute

    // Reset rate limit for test
    localStorage.removeItem(`rate_limit_${identifier}`);

    // Test normal usage
    const normalResult = validateRateLimit(identifier, limit, window);
    
    // Test rate limit exceeded
    let exceededCount = 0;
    for (let i = 0; i < limit + 2; i++) {
      const result = validateRateLimit(identifier, limit, window);
      if (!result.allowed) exceededCount++;
    }

    const passed = normalResult.allowed && exceededCount > 0;

    this.results.push({
      testName: 'Rate Limiting',
      passed,
      riskLevel: passed ? 'low' : 'medium',
      details: passed ? 'Rate limiting working correctly' : 'Rate limiting has issues',
      recommendations: passed ? 
        ['Continue monitoring rate limits'] : 
        ['Fix rate limiting logic', 'Adjust rate limit thresholds']
    });
  }

  /**
   * Test security headers
   */
  private async testSecurityHeaders(): Promise<void> {
    const testHeaders = {
      'content-security-policy': "default-src 'self'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'strict-origin-when-cross-origin'
    };

    const validation = validateSecurityHeaders(testHeaders);
    const passed = validation.isValid;

    this.results.push({
      testName: 'Security Headers',
      passed,
      riskLevel: passed ? 'low' : 'medium',
      details: passed ? 'All security headers present' : `Missing headers: ${validation.missingHeaders.join(', ')}`,
      recommendations: passed ? 
        ['Continue monitoring security headers'] : 
        ['Add missing security headers', 'Review header policies']
    });
  }

  /**
   * Get test summary
   */
  getTestSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallRiskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const highRiskCount = this.results.filter(r => r.riskLevel === 'high').length;
    const mediumRiskCount = this.results.filter(r => r.riskLevel === 'medium').length;

    let overallRiskLevel: 'low' | 'medium' | 'high' = 'low';
    if (highRiskCount > 0) {
      overallRiskLevel = 'high';
    } else if (mediumRiskCount > 0) {
      overallRiskLevel = 'medium';
    }

    const allRecommendations = this.results.flatMap(r => r.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return {
      totalTests,
      passedTests,
      failedTests,
      overallRiskLevel,
      recommendations: uniqueRecommendations
    };
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): string {
    const summary = this.getTestSummary();
    
    let report = `# Security Test Report\n\n`;
    report += `**Date:** ${new Date().toISOString()}\n`;
    report += `**Overall Risk Level:** ${summary.overallRiskLevel.toUpperCase()}\n`;
    report += `**Tests Passed:** ${summary.passedTests}/${summary.totalTests}\n\n`;

    report += `## Test Results\n\n`;
    this.results.forEach(result => {
      report += `### ${result.testName}\n`;
      report += `- **Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `- **Risk Level:** ${result.riskLevel.toUpperCase()}\n`;
      report += `- **Details:** ${result.details}\n`;
      report += `- **Recommendations:** ${result.recommendations.join(', ')}\n\n`;
    });

    report += `## Summary\n\n`;
    report += `- **Total Tests:** ${summary.totalTests}\n`;
    report += `- **Passed:** ${summary.passedTests}\n`;
    report += `- **Failed:** ${summary.failedTests}\n`;
    report += `- **Overall Risk:** ${summary.overallRiskLevel.toUpperCase()}\n\n`;

    report += `## Recommendations\n\n`;
    summary.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });

    return report;
  }
}

/**
 * Run security tests and return results
 */
export const runSecurityTests = async (): Promise<SecurityTestResult[]> => {
  const tester = new SecurityTester();
  return await tester.runAllTests();
};

/**
 * Get quick security assessment
 */
export const getSecurityAssessment = async (): Promise<{
  isSecure: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  issues: string[];
}> => {
  const results = await runSecurityTests();
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const score = Math.round((passedTests / totalTests) * 100);
  
  const failedTests = results.filter(r => !r.passed);
  const issues = failedTests.map(r => r.testName);
  
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (score < 50) {
    riskLevel = 'high';
  } else if (score < 80) {
    riskLevel = 'medium';
  }

  return {
    isSecure: score >= 80,
    riskLevel,
    score,
    issues
  };
};
