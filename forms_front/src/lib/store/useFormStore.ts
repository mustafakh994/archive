import { create } from 'zustand'
import { apiClient, Form, CreateFormData, handleApiError } from '@/lib/api/client'
import { getCurrentISOString } from '@/lib/utils/dateFormatter'

// Type definitions for the form structure
export interface FormOption {
  id: string
  label: string
  imageUrl?: string | null
  onSelectGoToPageId?: string // For conditional logic
}

export interface FormField {
  id: string
  type: 'short_text' | 'long_text' | 'radio_group' | 'checkbox' | 'dropdown' | 'number' | 'email' | 'date' | 'file_upload' | 'linear_scale' | 'display_text' | 'display_image' | 'display_video' | 'location' | 'signature'
  properties: {
    label: string
    // Visual customization
    questionBackgroundColor?: string
    questionBackgroundImageUrl?: string
    containerStyle?: 'solid' | 'transparent'
    containerBackgroundColor?: string
    placeholder?: string
    required?: boolean
    isSearchable?: boolean
    options?: FormOption[]
    validation?: {
      rule: 'regex' | 'email' | 'url' | 'min' | 'max'
      pattern?: string
      errorMessage?: string
      minValue?: number
      maxValue?: number
    }
    // New properties for Linear Scale
    minValue?: number
    maxValue?: number
    minLabel?: string
    maxLabel?: string
    src?: string // for display_image
    // New properties for Signature
    penColor?: string
    backgroundColor?: string
    width?: number
    height?: number
  }
}


export interface FormTheme {
  backgroundImageUrl?: string
  primaryColor?: string
  backgroundColor?: string
  fontFamily?: string
  logoUrl?: string
  cardStyle?: 'solid' | 'transparent'
  cardBackgroundColor?: string
  cardBorderColor?: string
  cardBackdropBlur?: boolean
}

const DEFAULT_THEME: FormTheme = {
  primaryColor: '#7C3AED',
  backgroundColor: '#F3F4F6',
  fontFamily: 'Cairo',
  cardStyle: 'solid',
  cardBackgroundColor: '#ffffff',
  cardBorderColor: '#e5e7eb',
  cardBackdropBlur: true
}

export interface FormObject {
  formId: string
  title: string
  description: string
  userId: string
  fields: FormField[]
  theme?: FormTheme
  status?: 'Active' | 'Inactive' | 'Draft'
}

interface FormStore {
  form: FormObject
  selectedFieldId: string | null
  forms: Form[]
  currentForm: Form | null
  isLoading: boolean
  error: string | null
  isDirty: boolean // Track if form has unsaved changes
  lastSaved: Date | null // Track when form was last saved
  optimisticUpdates: Map<string, any> // Track optimistic updates for rollback
  isOptimisticUpdate: boolean // Flag to indicate if an optimistic update is in progress

  // Actions
  setFormTitle: (title: string) => void
  setFormDescription: (description: string) => void
  setFormTheme: (theme: Partial<FormTheme>) => void
  setFormStatus: (status: 'Active' | 'Inactive' | 'Draft') => void

  // Field management
  addField: (field: Omit<FormField, 'id'>) => void
  removeField: (fieldId: string) => void
  updateFieldProperties: (fieldId: string, properties: Partial<FormField['properties']>) => void
  setSelectedFieldId: (fieldId: string | null) => void
  reorderFields: (startIndex: number, endIndex: number) => void

  // Form management
  setForm: (form: FormObject) => void
  synchronizeFormSchema: (form: FormObject) => { formSchema: any; settings: any } // Schema synchronization helper
  fetchForms: (params?: {
    departmentId?: string
    status?: string
    createdBy?: string
  }) => Promise<void>
  fetchForm: (id: string) => Promise<void>
  createForm: (data: CreateFormData) => Promise<string | null>
  updateForm: (id: string, data: Partial<CreateFormData>) => Promise<boolean>
  deleteForm: (id: string) => Promise<boolean>
  saveForm: () => Promise<boolean>
  publishForm: (id: string) => Promise<boolean> // New: publish form (change status to Active)
  unpublishForm: (id: string) => Promise<boolean> // New: unpublish form (change status to Draft)
  toggleFormStatus: (id: string) => Promise<boolean> // New: toggle form status (Active <-> Inactive)
  duplicateForm: (id: string, newName?: string) => Promise<boolean> // New: duplicate existing form

  // Optimistic updates
  saveFormOptimistic: () => Promise<boolean> // Save with optimistic updates
  rollbackOptimisticUpdate: () => void // Rollback failed optimistic update

  // Form versioning
  getFormVersions: (id: string) => Promise<Form[]>
  revertToVersion: (id: string, version: number) => Promise<boolean>

  // LocalStorage management
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => void
  clearLocalStorage: () => void

  // Auto-save functionality
  enableAutoSave: () => void
  disableAutoSave: () => void

  // Dirty state management
  markDirty: () => void
  markClean: () => void

  // Error handling
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

// Generate unique IDs
const generateId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Auto-save interval (in milliseconds)
const AUTO_SAVE_INTERVAL = 30000 // 30 seconds

export const useFormStore = create<FormStore>((set, get) => {
  let autoSaveInterval: NodeJS.Timeout | null = null

  return {
    form: {
      formId: 'clx123abc456',
      title: 'Untitled Form',
      description: 'Please fill out this form.',
      userId: 'user_abc123',
      fields: [],
      theme: { ...DEFAULT_THEME },
      status: 'Draft'
    },
    selectedFieldId: null,
    forms: [],
    currentForm: null,
    isLoading: false,
    error: null,
    isDirty: false,
    lastSaved: null,
    optimisticUpdates: new Map(),
    isOptimisticUpdate: false,

    setFormTitle: (title) =>
      set((state) => ({
        form: { ...state.form, title },
        isDirty: true
      })),

    setFormDescription: (description) =>
      set((state) => ({
        form: { ...state.form, description },
        isDirty: true
      })),

    setFormTheme: (theme) =>
      set((state) => ({
        form: {
          ...state.form,
          theme: { ...state.form.theme, ...theme }
        },
        isDirty: true
      })),

    setFormStatus: (status) =>
      set((state) => ({
        form: {
          ...state.form,
          status
        },
        isDirty: true
      })),

    addField: (field) =>
      set((state) => ({
        form: {
          ...state.form,
          fields: [...state.form.fields, { ...field, id: generateId() }]
        },
        isDirty: true
      })),

    removeField: (fieldId) =>
      set((state) => ({
        form: {
          ...state.form,
          fields: state.form.fields.filter(field => field.id !== fieldId)
        },
        selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
        isDirty: true
      })),

    updateFieldProperties: (fieldId, properties) =>
      set((state) => ({
        form: {
          ...state.form,
          fields: state.form.fields.map(field =>
            field.id === fieldId
              ? { ...field, properties: { ...field.properties, ...properties } }
              : field
          )
        },
        isDirty: true
      })),

    setSelectedFieldId: (fieldId) => {
      console.log('Setting selected field ID:', fieldId)
      set({ selectedFieldId: fieldId })
    },

    reorderFields: (startIndex, endIndex) =>
      set((state) => {
        const fields = [...state.form.fields]
        const [removed] = fields.splice(startIndex, 1)
        fields.splice(endIndex, 0, removed)

        return {
          form: {
            ...state.form,
            fields
          },
          isDirty: true
        }
      }),

    setForm: (form) => set({ form }),

    // Schema synchronization helper
    synchronizeFormSchema: (formObject: FormObject) => {
      // Ensure form schema is compatible with backend expectations
      const synchronizedSchema = {
        fields: formObject.fields.map(field => ({
          id: field.id,
          type: field.type,
          properties: {
            ...field.properties,
            // Ensure required properties are present
            label: field.properties.label || 'Untitled Field',
            required: field.properties.required || false
          }
        }))
      }

      const synchronizedSettings = {
        theme: { ...DEFAULT_THEME, ...formObject.theme }
      }

      return {
        formSchema: synchronizedSchema,
        settings: synchronizedSettings
      }
    },

    // LocalStorage management
    saveToLocalStorage: () => {
      const state = get()
      try {
        localStorage.setItem('formBuilderData', JSON.stringify({
          form: state.form,
          selectedFieldId: state.selectedFieldId,
          isDirty: state.isDirty,
          lastSaved: state.lastSaved?.toISOString() || null,
          timestamp: getCurrentISOString()
        }))
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }
    },

    loadFromLocalStorage: () => {
      try {
        const stored = localStorage.getItem('formBuilderData')
        if (stored) {
          const parsed = JSON.parse(stored)
          const formFromStorage: FormObject = parsed.form || get().form
          const normalizedForm: FormObject = {
            ...formFromStorage,
            theme: { ...DEFAULT_THEME, ...(formFromStorage?.theme || {}) }
          }
          set({
            form: normalizedForm,
            selectedFieldId: parsed.selectedFieldId,
            isDirty: parsed.isDirty || false,
            lastSaved: parsed.lastSaved ? new Date(parsed.lastSaved) : null
          })
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error)
      }
    },

    clearLocalStorage: () => {
      try {
        localStorage.removeItem('formBuilderData')
      } catch (error) {
        console.error('Error clearing localStorage:', error)
      }
    },

    // API methods
    fetchForms: async (params) => {
      set({ isLoading: true, error: null })

      try {
        // Add department-scoped filtering - the API client will automatically add department context
        const response = await apiClient.getForms(params)

        if (response.success && response.data) {
          // Handle paginated response - extract items array
          const formsArray = response.data.items || []
          set({
            forms: formsArray,
            isLoading: false,
            error: null,
          })
        } else {
          set({
            forms: [], // Ensure forms is always an array
            isLoading: false,
            error: response.message || 'Failed to fetch forms',
          })
        }
      } catch (error) {
        console.error('Error fetching forms:', error)
        set({
          forms: [], // Ensure forms is always an array
          isLoading: false,
          error: handleApiError(error),
        })
      }
    },

    fetchForm: async (id: string) => {
      set({ isLoading: true, error: null })

      try {
        const response = await apiClient.getForm(id)

        if (response.success && response.data) {
          const formData = response.data

          // Ensure formSchema is properly parsed if it's a string
          let formSchema = formData.formSchema
          if (typeof formSchema === 'string') {
            try {
              formSchema = JSON.parse(formSchema)
            } catch (e) {
              console.warn('Failed to parse form schema:', e)
              formSchema = { fields: [] }
            }
          }

          // Ensure settings is properly parsed if it's a string
          let settings = formData.settings
          if (typeof settings === 'string') {
            try {
              settings = JSON.parse(settings)
            } catch (e) {
              console.warn('Failed to parse form settings:', e)
              settings = {}
            }
          }

          // Validate and synchronize form schema with frontend structure
          let synchronizedFields = formSchema?.fields || []

          // Ensure all fields have required properties for frontend compatibility
          synchronizedFields = synchronizedFields.map((field: any) => ({
            id: field.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: field.type || 'short_text',
            properties: {
              label: field.properties?.label || 'Untitled Field',
              placeholder: field.properties?.placeholder || '',
              required: field.properties?.required || false,
              isSearchable: field.properties?.isSearchable || false,
              options: field.properties?.options || [],
              validation: field.properties?.validation || undefined,
              ...field.properties
            }
          }))

          // Convert API form to FormObject format with proper schema synchronization
          const formObject: FormObject = {
            formId: formData.id,
            title: formData.title,
            description: formData.description || '',
            userId: formData.createdBy || '',
            fields: synchronizedFields,
            theme: settings?.theme || { ...DEFAULT_THEME },
            status: formData.status || 'Draft'
          }

          set({
            currentForm: formData,
            form: formObject,
            isDirty: false, // Form is clean when loaded from backend
            lastSaved: new Date(formData.updatedAt),
            isLoading: false,
            error: null,
          })
        } else {
          set({
            isLoading: false,
            error: response.message || 'Failed to fetch form',
          })
        }
      } catch (error) {
        set({
          isLoading: false,
          error: handleApiError(error),
        })
      }
    },

    createForm: async (data: CreateFormData) => {
      set({ isLoading: true, error: null })

      try {
        const response = await apiClient.createForm(data)

        if (response.success && response.data) {
          const { forms, form } = get()

          // Update the current form ID if this was a new form creation
          const updatedForm = form.formId === 'clx123abc456'
            ? { ...form, formId: response.data.id }
            : form

          set({
            forms: [...forms, response.data],
            currentForm: response.data,
            form: updatedForm,
            isDirty: false,
            lastSaved: new Date(),
            isLoading: false,
            error: null,
          })
          return response.data.id
        } else {
          set({
            isLoading: false,
            error: response.message || 'Failed to create form',
          })
          return null
        }
      } catch (error) {
        set({
          isLoading: false,
          error: handleApiError(error),
        })
        return null
      }
    },

    updateForm: async (id: string, data: Partial<CreateFormData>) => {
      set({ isLoading: true, error: null })

      try {
        const response = await apiClient.updateForm(id, data)

        if (response.success && response.data) {
          const { forms } = get()
          set({
            forms: forms.map(form =>
              form.id === id ? response.data! : form
            ),
            currentForm: response.data,
            isDirty: false,
            lastSaved: new Date(),
            isLoading: false,
            error: null,
          })
          return true
        } else {
          set({
            isLoading: false,
            error: response.message || 'Failed to update form',
          })
          return false
        }
      } catch (error) {
        set({
          isLoading: false,
          error: handleApiError(error),
        })
        return false
      }
    },

    deleteForm: async (id: string) => {
      set({ isLoading: true, error: null })

      try {
        const response = await apiClient.deleteForm(id)

        if (response.success) {
          const { forms } = get()
          set({
            forms: forms.filter(form => form.id !== id),
            currentForm: null,
            isLoading: false,
            error: null,
          })
          return true
        } else {
          set({
            isLoading: false,
            error: response.message || 'Failed to delete form',
          })
          return false
        }
      } catch (error) {
        set({
          isLoading: false,
          error: handleApiError(error),
        })
        return false
      }
    },

    saveForm: async () => {
      const { form, isDirty } = get()

      // Don't save if no changes
      if (!isDirty) {
        return true
      }

      set({ isLoading: true, error: null })

      try {
        let success = false

        if (!form.formId || form.formId === 'clx123abc456') {
          // Create new form with synchronized schema
          const { formSchema, settings } = get().synchronizeFormSchema(form)
          const createData: CreateFormData = {
            name: form.title,
            code: form.title.toLowerCase().replace(/\s+/g, '_'),
            title: form.title,
            description: form.description,
            formSchema,
            settings,
            status: form.status || 'Active'
          }

          const formId = await get().createForm(createData)
          success = formId !== null
        } else {
          // Update existing form (creates new version) with synchronized schema
          const { formSchema, settings } = get().synchronizeFormSchema(form)
          const { currentForm } = get()

          // Preserve or generate form code
          const formCode = currentForm?.code || form.title.toLowerCase().replace(/\s+/g, '_') + `_${Date.now()}`

          const updateData: Partial<CreateFormData> = {
            name: form.title,
            code: formCode,
            title: form.title,
            description: form.description,
            formSchema,
            settings,
            status: form.status
          }

          success = await get().updateForm(form.formId, updateData)
        }

        if (success) {
          set({
            isDirty: false,
            lastSaved: new Date(),
            isLoading: false
          })
        }

        return success
      } catch (error) {
        set({
          isLoading: false,
          error: handleApiError(error)
        })
        return false
      }
    },

    publishForm: async (id: string) => {
      set({ isLoading: true, error: null })

      try {
        // Use the dedicated publishForm method that sets isPublished to true
        const response = await apiClient.publishForm(id)

        if (response.success && response.data) {
          const { forms } = get()
          set({
            forms: forms.map(form =>
              form.id === id ? { ...form, isPublished: true, status: 'Active' } : form
            ),
            isLoading: false,
            error: null,
          })
          return true
        } else {
          set({
            isLoading: false,
            error: response.message || 'Failed to publish form',
          })
          return false
        }
      } catch (error) {
        set({
          isLoading: false,
          error: handleApiError(error),
        })
        return false
      }
    },

    unpublishForm: async (id: string) => {
      set({ isLoading: true, error: null })

      try {
        const response = await apiClient.unpublishForm(id)

        if (response.success && response.data) {
          const { forms } = get()
          set({
            forms: forms.map(form =>
              form.id === id ? { ...form, isPublished: false, status: 'Draft' } : form
            ),
            isLoading: false,
            error: null,
          })
          return true
        } else {
          set({
            isLoading: false,
            error: response.message || 'Failed to unpublish form',
          })
          return false
        }
      } catch (error) {
        set({
          isLoading: false,
          error: handleApiError(error),
        })
        return false
      }
    },

    toggleFormStatus: async (id: string) => {
      // Get current form to determine new status
      const { forms } = get()
      const currentForm = forms.find(form => form.id === id)

      if (!currentForm) {
        set({ error: 'Form not found' })
        return false
      }

      // Determine new status (optimistic)
      const currentStatus = currentForm.status || (currentForm.isPublished ? 'Active' : 'Draft')
      const newIsPublished = currentStatus !== 'Active'
      const newStatus = newIsPublished ? 'Active' : 'Inactive'

      // Store original form for potential rollback
      const originalForm = { ...currentForm }

      // Optimistic update - immediately update UI
      set({
        forms: forms.map(form =>
          form.id === id ? {
            ...form,
            isPublished: newIsPublished,
            status: newStatus,
            updatedAt: new Date().toISOString()
          } : form
        )
      })

      try {
        // Call API to toggle status
        const response = await apiClient.toggleFormStatus(id)

        if (response.success) {
          // Fetch the updated form to get the actual status from backend
          const formResponse = await apiClient.getForm(id)

          if (formResponse.success && formResponse.data) {
            const updatedFormData = formResponse.data

            // Update with actual data from backend
            set(state => ({
              forms: state.forms.map(form =>
                form.id === id ? {
                  ...form,
                  status: updatedFormData.status || (updatedFormData.isPublished ? 'Active' : 'Inactive'),
                  isPublished: updatedFormData.isPublished,
                  updatedAt: updatedFormData.updatedAt
                } : form
              ),
              error: null,
            }))
          }

          return true
        } else {
          // Revert optimistic update on API failure
          set(state => ({
            forms: state.forms.map(form =>
              form.id === id ? originalForm : form
            ),
            error: response.message || 'Failed to toggle form status',
          }))
          return false
        }
      } catch (error) {
        // Revert optimistic update on error
        set(state => ({
          forms: state.forms.map(form =>
            form.id === id ? originalForm : form
          ),
          error: handleApiError(error),
        }))
        return false
      }
    },

    duplicateForm: async (id: string, newName?: string) => {
      set({ isLoading: true, error: null })

      try {
        // First fetch the form to duplicate
        const formResponse = await apiClient.getForm(id)

        if (!formResponse.success || !formResponse.data) {
          set({
            isLoading: false,
            error: 'Failed to fetch form for duplication',
          })
          return false
        }

        const originalForm = formResponse.data
        const duplicatedName = newName || `${originalForm.name} (Copy)`

        // Create new form with duplicated data
        const createData: CreateFormData = {
          name: duplicatedName,
          code: duplicatedName.toLowerCase().replace(/\s+/g, '_'),
          title: originalForm.title,
          description: originalForm.description || '',
          formSchema: originalForm.formSchema,
          settings: originalForm.settings,
          status: originalForm.status || 'Active'
        }

        const formId = await get().createForm(createData)
        const success = formId !== null

        if (success) {
          set({ isLoading: false })
        }

        return success
      } catch (error) {
        set({
          isLoading: false,
          error: handleApiError(error),
        })
        return false
      }
    },

    // Optimistic updates
    saveFormOptimistic: async () => {
      const { form, isDirty } = get()

      // Don't save if no changes
      if (!isDirty) {
        return true
      }

      // Store current state for potential rollback
      const currentState = {
        form: { ...form },
        currentForm: get().currentForm,
        forms: [...get().forms],
        isDirty: get().isDirty,
        lastSaved: get().lastSaved
      }

      // Set optimistic update flag
      set({
        isOptimisticUpdate: true,
        optimisticUpdates: new Map([['saveState', currentState]])
      })

      try {
        let success = false

        if (!form.formId || form.formId === 'clx123abc456') {
          // Create new form - optimistically update UI
          const tempId = `temp_${Date.now()}`
          const optimisticForm: Form = {
            id: tempId,
            title: form.title,
            description: form.description,
            content: { formSchema: { fields: form.fields }, settings: { theme: form.theme } },
            isPublished: false,
            organizationId: 'temp',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Legacy fields
            departmentId: 'temp',
            name: form.title,
            code: form.title.toLowerCase().replace(/\s+/g, '_'),
            formSchema: { fields: form.fields },
            settings: { theme: form.theme },
            createdBy: form.userId,
            version: 1,
            status: 'Draft'
          }

          // Optimistically add to forms list
          set(state => ({
            forms: [...state.forms, optimisticForm],
            isDirty: false,
            lastSaved: new Date()
          }))

          // Attempt actual save with synchronized schema
          const { formSchema, settings } = get().synchronizeFormSchema(form)
          const createData: CreateFormData = {
            name: form.title,
            code: form.title.toLowerCase().replace(/\s+/g, '_'),
            title: form.title,
            description: form.description,
            formSchema,
            settings,
            status: form.status || 'Active'
          }

          const formId = await get().createForm(createData)
          success = formId !== null

          if (!success) {
            // Rollback on failure
            get().rollbackOptimisticUpdate()
            return false
          }
        } else {
          // Update existing form - optimistically update UI
          const updatedForm = {
            ...get().currentForm!,
            title: form.title,
            description: form.description,
            formSchema: { fields: form.fields },
            settings: { theme: form.theme },
            updatedAt: new Date().toISOString()
          }

          // Optimistically update forms list and current form
          set(state => ({
            forms: state.forms.map(f => f.id === form.formId ? updatedForm : f),
            currentForm: updatedForm,
            isDirty: false,
            lastSaved: new Date()
          }))

          // Attempt actual save with synchronized schema
          const { formSchema, settings } = get().synchronizeFormSchema(form)
          const { currentForm: currentFormState } = get()

          // Preserve or generate form code
          const formCode = currentFormState?.code || form.title.toLowerCase().replace(/\s+/g, '_') + `_${Date.now()}`

          const updateData: Partial<CreateFormData> = {
            name: form.title,
            code: formCode,
            title: form.title,
            description: form.description,
            formSchema,
            settings,
            status: form.status
          }

          success = await get().updateForm(form.formId, updateData)

          if (!success) {
            // Rollback on failure
            get().rollbackOptimisticUpdate()
            return false
          }
        }

        // Clear optimistic update state on success
        set({
          isOptimisticUpdate: false,
          optimisticUpdates: new Map()
        })

        return success
      } catch (error) {
        // Rollback on error
        get().rollbackOptimisticUpdate()
        set({
          error: handleApiError(error)
        })
        return false
      }
    },

    rollbackOptimisticUpdate: () => {
      const { optimisticUpdates } = get()
      const savedState = optimisticUpdates.get('saveState')

      if (savedState) {
        set({
          form: savedState.form,
          currentForm: savedState.currentForm,
          forms: savedState.forms,
          isDirty: savedState.isDirty,
          lastSaved: savedState.lastSaved,
          isOptimisticUpdate: false,
          optimisticUpdates: new Map(),
          error: 'Save failed. Changes have been reverted.'
        })
      }
    },

    getFormVersions: async (id: string) => {
      // Note: This would require a backend endpoint to get form versions
      // For now, return empty array as the backend doesn't have version history endpoint
      console.warn('Form versions endpoint not implemented in backend')
      return []
    },

    revertToVersion: async (id: string, version: number) => {
      // Note: This would require a backend endpoint to revert to specific version
      // For now, return false as the backend doesn't have version revert endpoint
      console.warn('Form version revert endpoint not implemented in backend')
      return false
    },

    // Auto-save functionality
    enableAutoSave: () => {
      const { disableAutoSave } = get()

      // Clear existing interval
      disableAutoSave()

      // Set up new auto-save interval
      autoSaveInterval = setInterval(async () => {
        const { isDirty, saveFormOptimistic } = get()
        if (isDirty) {
          console.log('Auto-saving form with optimistic updates...')
          await saveFormOptimistic()
        }
      }, AUTO_SAVE_INTERVAL)
    },

    disableAutoSave: () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
        autoSaveInterval = null
      }
    },

    // Dirty state management
    markDirty: () => {
      set({ isDirty: true })
    },

    markClean: () => {
      set({ isDirty: false, lastSaved: new Date() })
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },

    setError: (error: string | null) => {
      set({ error })
    },

    clearError: () => {
      set({ error: null })
    },
  }
}) 