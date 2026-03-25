'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Users, PlusCircle, Edit, Eye, UserCheck, UserX, Building, Shield } from 'lucide-react'

export function UserManagementDemo() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'list'>('overview')

  const mockUsers = [
    {
      id: '1',
      name: 'أحمد محمد علي',
      email: 'ahmed.mohamed@company.com',
      department: 'الموارد البشرية',
      role: 'مدير',
      isActive: true,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'فاطمة سالم',
      email: 'fatima.salem@company.com',
      department: 'تقنية المعلومات',
      role: 'مطور',
      isActive: true,
      createdAt: '2024-01-20'
    },
    {
      id: '3',
      name: 'محمد عبدالله',
      email: 'mohammed.abdullah@company.com',
      department: 'المالية',
      role: 'محاسب',
      isActive: false,
      createdAt: '2024-01-10'
    }
  ]

  const handleNavigateToUsers = () => {
    router.push('/users')
  }

  const handleNavigateToNewUser = () => {
    router.push('/users/new')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">نظام إدارة المستخدمين</h2>
            <p className="text-gray-600">إدارة شاملة للمستخدمين في منشئ النماذج</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            إنشاء مستخدم
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            قائمة المستخدمين
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{mockUsers.length}</p>
                    <p className="text-sm text-blue-700">إجمالي المستخدمين</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-900">
                      {mockUsers.filter(u => u.isActive).length}
                    </p>
                    <p className="text-sm text-green-700">مستخدمين نشطين</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserX className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-900">
                      {mockUsers.filter(u => !u.isActive).length}
                    </p>
                    <p className="text-sm text-red-700">مستخدمين غير نشطين</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">الميزات المتاحة:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <PlusCircle className="h-4 w-4 text-green-600" />
                  إنشاء مستخدمين جدد
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Edit className="h-4 w-4 text-blue-600" />
                  تعديل بيانات المستخدمين
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Eye className="h-4 w-4 text-gray-600" />
                  عرض تفاصيل المستخدمين
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  تفعيل/إلغاء تفعيل المستخدمين
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Building className="h-4 w-4 text-purple-600" />
                  ربط المستخدمين بالمديريات
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Shield className="h-4 w-4 text-orange-600" />
                  إدارة الأدوار والصلاحيات
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleNavigateToUsers}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users className="h-4 w-4" />
                عرض جميع المستخدمين
              </button>
              <button
                onClick={handleNavigateToNewUser}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                إنشاء مستخدم جديد
              </button>
            </div>
          </div>
        )}

        {/* Create User Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4">
                <PlusCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">إنشاء مستخدم جديد</h3>
              <p className="text-gray-600 mb-6">
                أضف مستخدم جديد إلى النظام مع تحديد المديرية والدور المناسب
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-right">
                <h4 className="font-medium text-gray-900 mb-3">المعلومات المطلوبة:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• الاسم الكامل</li>
                  <li>• البريد الإلكتروني</li>
                  <li>• كلمة المرور</li>
                  <li>• المديرية</li>
                  <li>• الدور الوظيفي</li>
                </ul>
              </div>
              
              <button
                onClick={handleNavigateToNewUser}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mx-auto"
              >
                <PlusCircle className="h-5 w-5" />
                انتقل إلى صفحة الإنشاء
              </button>
            </div>
          </div>
        )}

        {/* User List Tab */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">المستخدمين الحاليين</h3>
              <button
                onClick={handleNavigateToUsers}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                عرض القائمة الكاملة ←
              </button>
            </div>
            
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">الاسم</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">المديرية</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">الدور</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-gray-600">{user.department}</td>
                      <td className="px-4 py-3 text-gray-600">{user.role}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}