import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function isAllowed(currentPath, allowedDashboards, role) {
  if (role === 'super_admin') return true;
  if (allowedDashboards === null || allowedDashboards === undefined) return true;
  return allowedDashboards.some(p => currentPath === p || currentPath.startsWith(p + '/'));
}

describe('RBAC per-user dashboard permissions', () => {
  it('super_admin bypasses all checks', () => {
    assert.equal(isAllowed('/admin/settings', [], 'super_admin'), true);
    assert.equal(isAllowed('/admin/secret', [], 'super_admin'), true);
  });
  it('null allowedDashboards means full access', () => {
    assert.equal(isAllowed('/admin/users', null, 'admin'), true);
    assert.equal(isAllowed('/admin/settings', undefined, 'admin'), true);
  });
  it('empty array means no access', () => {
    assert.equal(isAllowed('/admin/dashboard', [], 'admin'), false);
  });
  it('allows exact path', () => {
    assert.equal(isAllowed('/admin/courses', ['/admin/courses'], 'admin'), true);
  });
  it('allows subpath /admin/courses/:id when /admin/courses allowed', () => {
    assert.equal(isAllowed('/admin/courses/123', ['/admin/courses'], 'admin'), true);
  });
  it('denies path not in list', () => {
    assert.equal(isAllowed('/admin/settings', ['/admin/dashboard', '/admin/users'], 'admin'), false);
  });
  it('multiple dashboards', () => {
    const allowed = ['/admin/dashboard', '/admin/users', '/admin/courses'];
    assert.equal(isAllowed('/admin/users', allowed, 'admin'), true);
    assert.equal(isAllowed('/admin/payments', allowed, 'admin'), false);
  });
});
