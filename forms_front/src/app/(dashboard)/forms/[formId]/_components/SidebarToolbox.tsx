'use client'

import React, { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  ChevronDown,
  Hash,
  Mail,
  Calendar,
  Upload,
  BarChart3,
  FileText,
  Image,
  Video,
  Plus,
  MapPin,
  PenTool
} from 'lucide-react'

interface ToolboxItemProps {
  id: string
  type: string
  label: string
  icon: React.ReactNode
  category?: string
}

const ToolboxItem = ({ id, type, label, icon, category }: ToolboxItemProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `toolbox-${id}`,
    data: {
      type,
      source: 'toolbox'
    }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:bg-gray-50 transition-colors rtl-flex-row-reverse"
    >
      <div className="text-gray-500">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  )
}

export default function SidebarToolbox() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const toolboxItems = [
    // Input Fields
    {
      id: 'short_text',
      type: 'short_text',
      label: 'نص',
      icon: <Type size={20} />,
      category: 'الحقول المتاحة'
    },
    {
      id: 'long_text',
      type: 'long_text',
      label: 'نص طويل',
      icon: <AlignLeft size={20} />,
      category: 'الحقول المتاحة'
    },
    {
      id: 'date',
      type: 'date',
      label: 'تاريخ',
      icon: <Calendar size={20} />,
      category: 'الحقول المتاحة'
    },
    {
      id: 'dropdown',
      type: 'dropdown',
      label: 'لائحة منسدلة',
      icon: <ChevronDown size={20} />,
      category: 'الحقول المتاحة'
    },
    {
      id: 'number',
      type: 'number',
      label: 'حقل ادخال ارقام فقط',
      icon: <Hash size={20} />,
      category: 'الحقول المتاحة'
    },
    {
      id: 'custom_input',
      type: 'short_text',
      label: 'حقل ادخال مخصص',
      icon: <FileText size={20} />,
      category: 'الحقول المتاحة' // Maps internally to short_text but has a different label in the toolbox (creates a short_text when dragged)
    }
  ]

  const groupedItems = toolboxItems.reduce((acc, item) => {
    const category = item.category || 'أخرى'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof toolboxItems>)

  if (!isClient) {
    return (
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">عناصر النموذج</h2>
          <p className="text-xs text-gray-500 mt-1">اسحب العناصر إلى نموذجك</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 sticky top-0 bg-white py-1">{category}</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg rtl-flex-row-reverse">
                    <div className="text-gray-500">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">عناصر النموذج</h2>
        <p className="text-xs text-gray-500 mt-1">اسحب العناصر إلى نموذجك</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 sticky top-0 bg-white py-1">{category}</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <ToolboxItem key={item.id} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 