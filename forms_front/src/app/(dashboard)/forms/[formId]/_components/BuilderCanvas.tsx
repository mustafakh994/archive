'use client'

import React, { useEffect, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useFormStore } from '@/lib/store/useFormStore'
import DraggableField from './DraggableField'
import { loadGoogleFont } from '@/lib/utils/arabicGoogleFonts'

export default function BuilderCanvas() {
    const [isClient, setIsClient] = useState(false)
    const {
        form,
        addField,
        reorderFields
    } = useFormStore()

    useEffect(() => {
        setIsClient(true)
    }, [])

    // Load the selected font when it changes
    useEffect(() => {
        if (form.theme?.fontFamily) {
            loadGoogleFont(form.theme.fontFamily)
        }
    }, [form.theme?.fontFamily])

    const { setNodeRef } = useDroppable({
        id: 'canvas',
    })

    const handleDragEnd = (event: any) => {
        const { active, over } = event

        if (!over) return

        // Handle dropping from toolbox to canvas
        if (active.data?.current?.source === 'toolbox') {
            const fieldType = active.data.current.type

            // Create a new field based on the type
            const newField = {
                type: fieldType as any,
                properties: {
                    label: `حقل جديد ${fieldType.replace('_', ' ')}`,
                    placeholder: '',
                    required: false,
                    containerStyle: 'solid' as 'solid' | 'transparent',
                    containerBackgroundColor: '#ffffff',
                    ...(fieldType === 'radio_group' || fieldType === 'checkbox' || fieldType === 'dropdown') && {
                        options: [
                            { id: `opt_${Date.now()}_1`, label: 'خيار 1' },
                            { id: `opt_${Date.now()}_2`, label: 'خيار 2' }
                        ]
                    }
                }
            }

            addField(newField)
            return
        }

        // Handle reordering within canvas
        if (active.id !== over.id) {
            const oldIndex = form.fields.findIndex(field => field.id === active.id)
            const newIndex = form.fields.findIndex(field => field.id === over.id)

            if (oldIndex !== -1 && newIndex !== -1) {
                reorderFields(oldIndex, newIndex)
            }
        }
    }


    const backgroundStyles = {
        backgroundColor: form.theme?.backgroundColor || '#F3F4F6',
        backgroundImage: form.theme?.backgroundImageUrl ? `url(${form.theme.backgroundImageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: form.theme?.fontFamily || 'Cairo',
    }

    return (
        <div className="flex-1 p-6" style={backgroundStyles}>
            <div className="max-w-4xl mx-auto">
                {/* Form Header */}
                <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-lg p-4">
                    {form.theme?.logoUrl && (
                        <div className="mb-4 flex justify-center">
                            <img
                                src={form.theme.logoUrl}
                                alt="شعار النموذج"
                                className="max-h-16 max-w-48 object-contain"
                            />
                        </div>
                    )}
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => useFormStore.getState().setFormTitle(e.target.value)}
                        className="text-2xl font-semibold text-gray-900 bg-transparent border-none outline-none w-full"
                        placeholder="نموذج بدون عنوان"
                    />
                    <textarea
                        value={form.description}
                        onChange={(e) => useFormStore.getState().setFormDescription(e.target.value)}
                        className="mt-2 text-gray-600 bg-transparent border-none outline-none w-full resize-none"
                        placeholder="وصف النموذج"
                        rows={2}
                    />
                </div>


                {/* Form Fields */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div
                        ref={setNodeRef}
                        className="space-y-4 min-h-[200px]"
                    >
                        <SortableContext
                            items={form.fields.map(field => field.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {form.fields.map((field, index) => (
                                <DraggableField
                                    key={field.id}
                                    field={field}
                                    index={index}
                                />
                            ))}
                        </SortableContext>

                        {/* Empty state */}
                        {form.fields.length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-gray-400 mb-4">
                                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حقول بعد</h3>
                                <p className="text-gray-500">اسحب عناصر النموذج من الشريط الجانبي لبدء بناء نموذجك</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} 