'use client'

import React, { useEffect, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { FormField } from '@/lib/store/useFormStore'
import { useFormStore } from '@/lib/store/useFormStore'
import FieldRenderer from './FieldRenderer'

interface DraggableFieldProps {
    field: FormField
    index: number
}

export default function DraggableField({ field, index }: DraggableFieldProps) {
    const [isClient, setIsClient] = useState(false)
    const { selectedFieldId, setSelectedFieldId, removeField } = useFormStore()

    useEffect(() => {
        setIsClient(true)
    }, [])

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: field.id,
        data: {
            type: 'field',
            field,
            index,
        },
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const containerStyleSetting = field.properties.containerStyle ?? 'solid'
    const containerBackgroundColor = field.properties.containerBackgroundColor || '#ffffff'
    const containerStyle: React.CSSProperties =
        containerStyleSetting === 'transparent'
            ? { backgroundColor: 'transparent' }
            : { backgroundColor: containerBackgroundColor }

    const baseContainerClasses = 'relative rounded-lg transition-all cursor-pointer group'
    const regularBorderClasses = 'border border-gray-200 hover:border-gray-300'
    const transparentBorderClasses = 'border border-dashed border-gray-300 hover:border-gray-400'
    const selectedClasses = 'border-2 border-blue-500 shadow-md ring-2 ring-blue-100'

    const isSelected = selectedFieldId === field.id

    const containerClassName = `${baseContainerClasses} ${
        isSelected
            ? selectedClasses
            : containerStyleSetting === 'transparent'
            ? transparentBorderClasses
            : regularBorderClasses
        } p-4`

    const handleFieldClick = (e: React.MouseEvent) => {
        console.log('Field clicked:', field.id, field.type)
        // Don't select if clicking on drag handle or delete button
        const target = e.target as HTMLElement
        if (target.closest('[data-drag-handle]') || target.closest('[data-delete-button]')) {
            console.log('Click blocked - drag handle or delete button')
            return
        }
        console.log('Setting selected field ID:', field.id)
        setSelectedFieldId(field.id)
    }

    if (!isClient) {
        return (
            <div className="relative group">
                <div
                    className={containerClassName}
                    style={containerStyle}
                    onClick={handleFieldClick}
                >
                    {/* Selection indicator */}
                    {isSelected && (
                        <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}

                    {/* Field content */}
                    <div className="mt-2">
                        <FieldRenderer field={field} />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group ${isDragging ? 'opacity-50' : ''}`}
        >
            <div
                className={containerClassName}
                style={containerStyle}
                onClick={handleFieldClick}
            >
                {/* Selection indicator */}
                {isSelected && (
                    <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}

                {/* Drag handle */}
                <div
                    {...attributes}
                    {...listeners}
                    data-drag-handle
                    className="absolute top-2 left-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                >
                    <GripVertical size={16} className="text-gray-400" />
                </div>

                {/* Delete button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        removeField(field.id)
                    }}
                    data-delete-button
                    aria-label="حذف الحقل"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                >
                    <Trash2 size={16} />
                </button>

                {/* Field content */}
                <div className="mt-2">
                    <FieldRenderer field={field} />
                </div>
            </div>
        </div>
    )
} 