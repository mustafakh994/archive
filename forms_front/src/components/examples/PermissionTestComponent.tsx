'use client'

import React from 'react'
import { useAuthStore } from '../../lib/store/useAuthStore'
import { useAccessControl } from '../../lib/hooks/useAccessControl'
import { Shield, User, Users, CheckCircle, XCircle } from 'lucide-react'

export function PermissionTestComponent() {
  const { user, hasPermission } = useAuthStore()
  const { hasRoleAccess, checkResourcePermission } = useAccessControl()

  if (!user) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">يرجى تسجيل الدخول لعرض معلومات الصلاحيات</p>
        </div>
      </div>
    )
  }

  const permissions = [
    { name: 'users.create', label: 'إنشاء مستخدمين' },
    { name: 'users.read', label: 'عرض المستخدمين' },
    { name: 'users.update', label: 'تعديل المستخدمين' },
    { name: 'users.delete', label: 'حذف المستخدمين' },
    { name: 'forms.create', label: 'إنشاء نماذج' },
    { name: 'forms.read', label: 'عرض النماذج' },
    { name: 'forms.update', label: 'تعديل النماذج' },
    { name: 'forms.delete', label: 'حذف النماذج' }
  ]

  const roles = ['SuperAdmin', 'DepartmentAdmin', 'User', 'FormCreator']

  const resourcePermissions = [
    { resource: 'users', action: 'create', label: 'إنشاء مستخدمين' },
    { resource: 'users', action: 'read', label: 'عرض المستخدمين' },
    { resource: 'users', action: 'update', label: 'تعديل المستخدمين' },
    { resource: 'users', action: 'delete', label: 'حذف المستخدمين' },
    { resource: 'forms', action: 'create', label: 'إنشاء نماذج' },
    { resource: 'forms', action: 'read', label: 'عرض النماذج' }
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Shield className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">اختبار نظام الصلاحيات</h2>
            <p className="text-gray-600">فحص صلاحيات المستخدم الحالي</p>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 mb-3">معلومات المستخدم الحالي:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><strong>الاسم:</strong> {user.name}</div>
            <div><strong>البريد الإلكتروني:</strong> {user.email}</div>
            <div><strong>المديرية:</strong> {user.department?.name || 'غير محدد'}</div>
            <div><strong>الدور:</strong> {user.role?.name || 'غير محدد'}</div>
          </div>
        </div>

        {/* Role Access Test */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">اختبار الأدوار:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roles.map((role) => {
              const hasAccess = hasRoleAccess([role])
              return (
                <div
                  key={role}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    hasAccess 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {hasAccess ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">{role}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Permission Test */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">اختبار الصلاحيات المحددة:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissions.map((perm) => {
              const hasAccess = hasPermission(perm.name)
              return (
                <div
                  key={perm.name}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    hasAccess 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {hasAccess ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{perm.label}</div>
                    <div className="text-xs opacity-75">{perm.name}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Resource Permission Test */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">اختبار صلاحيات الموارد:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resourcePermissions.map((perm) => {
              const result = checkResourcePermission(perm.resource, perm.action)
              return (
                <div
                  key={`${perm.resource}.${perm.action}`}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    result.hasAccess 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {result.hasAccess ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{perm.label}</div>
                    <div className="text-xs opacity-75">{perm.resource}.{perm.action}</div>
                    {!result.hasAccess && result.reason && (
                      <div className="text-xs mt-1 opacity-75">{result.reason}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Permissions List */}
        {user.permissions && user.permissions.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">الصلاحيات المخصصة للمستخدم:</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {user.permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="text-sm text-blue-800 bg-blue-100 px-2 py-1 rounded"
                  >
                    {permission.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">معلومات التشخيص:</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>User Role:</strong> {user.role?.name || 'None'}</div>
            <div><strong>Department ID:</strong> {user.departmentId || 'None'}</div>
            <div><strong>Is SuperAdmin:</strong> {user.role?.name === 'SuperAdmin' ? 'Yes' : 'No'}</div>
            <div><strong>Is DepartmentAdmin:</strong> {user.role?.name === 'DepartmentAdmin' ? 'Yes' : 'No'}</div>
            <div><strong>Permission Count:</strong> {user.permissions?.length || 0}</div>
          </div>
        </div>
      </div>
    </div>
  )
}