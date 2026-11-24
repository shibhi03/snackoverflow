import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClientError, setCsrfToken, getCsrfToken } from '../src/services/api';
import { snackService } from '../src/services/snack.service';
import { activityService } from '../src/services/activity.service';
import { authService } from '../src/services/auth.service';

describe('Frontend Services & API Client Tests', () => {
  beforeEach(() => {
    setCsrfToken(null);
  });

  describe('ApiClientError', () => {
    it('should correctly capture status, error code and human message', () => {
      const err = new ApiClientError(409, 'INSUFFICIENT_STOCK', 'Stock depleted');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ApiClientError');
      expect(err.status).toBe(409);
      expect(err.code).toBe('INSUFFICIENT_STOCK');
      expect(err.message).toBe('Stock depleted');
    });

    it('should handle 403 Forbidden with custom error code', () => {
      const err = new ApiClientError(403, 'MEMBER_ROLE_REQUIRED', 'Only members can consume');
      expect(err.status).toBe(403);
      expect(err.code).toBe('MEMBER_ROLE_REQUIRED');
    });
  });

  describe('CSRF In-Memory Token Management', () => {
    it('should start with null CSRF token when uninitialized', () => {
      expect(getCsrfToken()).toBeNull();
    });

    it('should set and retrieve cached CSRF token', () => {
      setCsrfToken('mock_csrf_token_abc123');
      expect(getCsrfToken()).toBe('mock_csrf_token_abc123');
    });

    it('should allow clearing the cached CSRF token on logout', () => {
      setCsrfToken('mock_csrf_token_abc123');
      setCsrfToken(null);
      expect(getCsrfToken()).toBeNull();
    });
  });

  describe('Service Definitions and Payload Interfaces', () => {
    it('should expose all required snackService operations', () => {
      expect(typeof snackService.getSnacks).toBe('function');
      expect(typeof snackService.listSnacks).toBe('function');
      expect(typeof snackService.getSnack).toBe('function');
      expect(typeof snackService.consume).toBe('function');
      expect(typeof snackService.consumeBasket).toBe('function');
      expect(typeof snackService.vote).toBe('function');
      expect(typeof snackService.unvote).toBe('function');
      expect(typeof snackService.getFavourites).toBe('function');
      expect(typeof snackService.getSummary).toBe('function');
      expect(typeof snackService.createSnack).toBe('function');
      expect(typeof snackService.updateSnack).toBe('function');
      expect(typeof snackService.restock).toBe('function');
      expect(typeof snackService.deleteSnack).toBe('function');
    });

    it('should expose all required activityService operations', () => {
      expect(typeof activityService.listActivities).toBe('function');
      expect(typeof activityService.listMyActivities).toBe('function');
    });

    it('should expose all required authService operations including register and status', () => {
      expect(typeof authService.login).toBe('function');
      expect(typeof authService.logout).toBe('function');
      expect(typeof authService.getMe).toBe('function');
      expect(typeof authService.fetchCsrfToken).toBe('function');
      expect(typeof authService.register).toBe('function');
      expect(typeof authService.getRegistrationStatus).toBe('function');
    });
  });
});
