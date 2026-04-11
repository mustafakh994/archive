'use client'

import React from 'react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { Shield, Building2, User, CheckCircle, XCircle } from 'lucide-react'

/**
 * Component to display current user's role and permissions information
 * Shows the role data from the login response
 */
export function UserRoleDisplay() {
  const { user, departmentContext, hasPermission, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <XCircle size={20} />
          <span>User not authenticated</span>
        </div>
      </div>
    )
  }

  // Test permissions
  const testPermissions = [
    'users.create',
    'users.edit',
    'users.delete',
    'forms.create',
    'forms.edit',
    'forms.delete',
    'departments.manage',
    'roles.manage'
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="text-blue-600" />
          معلومات المستخدم والصلاحيات
        </h1>

        {/* User Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <User size={18} />
              معلومات المستخدم
            </h3>
            <div className="space-y-2 text-sm">
              <div><strong>الاسم:</strong> {user.name}</div>
              <div><strong>البريد الإلكتروني:</strong> {user.email}</div>
              <div><strong>معرف المستخدم:</strong> {user.id}</div>
              <div><strong>الحالة:</strong> {user.isActive ? 'نشط' : 'غير نشط'}</div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Shield size={18} />
              معلومات الدور
            </h3>
            <div className="space-y-2 text-sm">
              <div><strong>اسم الدور:</strong> {user.roleName || user.role?.name || 'غير محدد'}</div>
              <div><strong>معرف الدور:</strong> {user.roleId}</div>
              <div><strong>دور النظام:</strong> {user.roleName === 'SuperAdmin' ? 'نعم' : 'لا'}</div>
            </div>
          </div>
        </div>

        {/* Department Information */}
        <div className="bg-purple-50 p-4 rounded-lg mb-8">
          <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
            <Building2 size={18} />
            معلومات القسم
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><strong>اسم القسم:</strong> {departmentContext?.departmentName || 'غير محدد'}</div>
            <div><strong>معرف القسم:</strong> {departmentContext?.departmentId}</div>
            <div><strong>كود القسم:</strong> {departmentContext?.departmentCode || 'غير محدد'}</div>
            <div><strong>دور المستخدم:</strong> {departmentContext?.userRole || 'غير محدد'}</div>
          </div>
        </div>

        {/* Permissions Testing */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">اختبار الصلاحيات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {testPermissions.map((permission) => {
              const hasAccess = hasPermission(permission)
              return (
                <div
                  key={permission}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    hasAccess 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {hasAccess ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <XCircle size={16} className="text-red-600" />
                  )}
                  <span>{permission}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Raw Data Display */}
        <div className="bg-gray-50 p-4 rounded-lg mt-6">
          <h3 className="font-semibold text-gray-800 mb-3">البيانات الخام</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">بيانات المستخدم:</h4>
              <pre className="bg-white p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">سياق القسم:</h4>
              <pre className="bg-white p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(departmentContext, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Role-based Messages */}
        {user.roleName === 'SuperAdmin' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <Shield size={20} />
              <strong>مدير النظام الرئيسي</strong>
            </div>
            <p className="text-yellow-700 mt-2">
              لديك صلاحيات كاملة على جميع أجزاء النظام. يمكنك إدارة جميع الأقسام والمستخدمين والأدوار.
            </p>
          </div>
        )}

        {user.roleName === 'DepartmentAdmin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="flex items-center gap-2 text-blue-800">
              <Building2 size={20} />
              <strong>مدير القسم</strong>
            </div>
            <p className="text-blue-700 mt-2">
              لديك صلاحيات إدارية على قسم {departmentContext?.departmentName}. يمكنك إدارة المستخدمين والنماذج في قسمك.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}