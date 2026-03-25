'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStore } from '../../lib/store/useFormStore'
import { LoadingButton } from '../ui/LoadingSpinner'
import { useSuccessToast, useErrorToast } from '../ui/Toast'

export function FormCreationTestComponent() {
  const router = useRouter()
  const { createForm, isLoading, error } = useFormStore()
  const [formTitle, setFormTitle] = useState('Test Form')
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()

  const handleCreateForm = async () => {
    const formData = {
      name: formTitle,
      code: formTitle.toLowerCase().replace(/\s+/g, '_'),
      title: formTitle,
      description: 'This is a test form created for demonstration.',
      formSchema: {
        fields: [
          {
            id: 'field_1',
            type: 'text',
            properties: {
              label: 'Name',
              placeholder: 'Enter your name',
              required: true
            }
          },
          {
            id: 'field_2',
            type: 'email',
            properties: {
              label: 'Email',
              placeholder: 'Enter your email',
              required: true
            }
          }
        ]
      },
      settings: {
        theme: {
          primaryColor: '#7C3AED',
          backgroundColor: '#F3F4F6',
          fontFamily: 'Inter'
        },
        notifications: {
          email: true,
          webhook: false
        }
      }
    }

    try {
      const formId = await createForm(formData)
      if (formId) {
        successToast('Form Created!', `Form "${formTitle}" has been created successfully.`)
        
        // Show redirect options
        const shouldRedirect = confirm(
          `Form created successfully! Would you like to go to the form builder?\n\nForm ID: ${formId}`
        )
        
        if (shouldRedirect) {
          router.push(`/forms/${formId}`)
        }
      } else {
        errorToast('Creation Failed', 'Failed to create the form. Please try again.')
      }
    } catch (err) {
      console.error('Error creating form:', err)
      errorToast('Creation Error', 'An error occurred while creating the form.')
    }
  }

  const handleNavigateToNewForm = () => {
    router.push('/forms/new')
  }

  return (
    <div className="p-6 bg-white rounded-lg border">
      <h2 className="text-xl font-semibold mb-4">Form Creation Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Form Title
          </label>
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Enter form title"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <LoadingButton
            loading={isLoading}
            onClick={handleCreateForm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={!formTitle.trim()}
          >
            Create Form Directly
          </LoadingButton>
          
          <button
            onClick={handleNavigateToNewForm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to New Form Page
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Test Flow:</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. <strong>Create Form Directly:</strong> Creates a form and asks if you want to redirect to the builder</li>
            <li>2. <strong>Go to New Form Page:</strong> Navigates to /forms/new which automatically creates a form and redirects</li>
            <li>3. Both methods should end up in the form builder with the newly created form</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Expected Behavior:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Form creation should return a form ID</li>
            <li>• Success toast should appear</li>
            <li>• User should be redirected to /forms/[formId]</li>
            <li>• Form builder should load with the new form</li>
          </ul>
        </div>
      </div>
    </div>
  )
}