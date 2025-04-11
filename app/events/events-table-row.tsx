import { TableCell, TableRow } from "@/components/ui/table"
import { columns as COLUMN_CONFIGS } from "./columns"
import { EventColumnId } from "../stores/use-events-columns-store"
import { Event } from "../types/events-type"
import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { formatBrazilianDate } from "@/lib/date-utils"

interface EventsTableRowProps {
  event: Event
  visibleColumns: EventColumnId[]
  isSelected?: boolean
  onSelectChange?: (id: string) => void
}

export function EventsTableRow({ 
  event, 
  visibleColumns,
  isSelected = false,
  onSelectChange
}: EventsTableRowProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, string>>({})

  useEffect(() => {
    // Carregar larguras salvas
    try {
      const savedWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}')
      setColumnWidths(savedWidths)
    } catch (e) {
      console.error('Erro ao carregar larguras das colunas:', e)
    }
  }, [])

  const getValue = (key: string) => {
    const keys = key.split('.')
    let value: any = event
    
    // Check for direct initial* location properties on the event object
    // These are priorities - preferred access pattern
    if (['initialCountry', 'initialCity', 'initialRegion', 'initialCountryCode', 'initialZip', 'initialIp'].includes(key)) {
      // Primary: Direct properties at root level (highest priority)
      if (key in event && event[key as keyof Event] !== null && event[key as keyof Event] !== undefined && event[key as keyof Event] !== '') {
        return event[key as keyof Event];
      }
      
      // Secondary: Check if it exists in user object (fallback)
      const userKey = key;
      if (event.user && typeof event.user === 'object' && userKey in event.user) {
        const userValue = event.user[userKey as keyof typeof event.user];
        if (userValue && userValue !== '') {
          return userValue;
        }
      }
      
      // Tertiary: Fallback to session object
      // Map initialCountry to session.country, etc.
      const sessionKey = key.replace('initial', '').toLowerCase();
      if (event.session && typeof event.session === 'object') {
        // Handle special case for region -> state
        if (sessionKey === 'region' && event.session.state) {
          return event.session.state;
        }
        
        if (sessionKey in event.session) {
          return event.session[sessionKey as keyof typeof event.session];
        }
      }
      
      return '-';
    }
    
    // Handle the case where fields are still being accessed via user.initialXXX paths
    if (keys.length === 2 && keys[0] === 'user' && 
        (keys[1] === 'initialCountry' || keys[1] === 'initialRegion' || 
         keys[1] === 'initialCity' || keys[1] === 'initialDeviceType' ||
         keys[1] === 'initialCountryCode' || keys[1] === 'initialZip' || 
         keys[1] === 'initialIp')) {
      const property = keys[1];
      
      // First check if this property exists at root level
      if (property in event && event[property as keyof Event] !== null && 
          event[property as keyof Event] !== undefined && 
          event[property as keyof Event] !== '') {
        return event[property as keyof Event];
      }
      
      // Then check in user object
      if (event.user && typeof event.user === 'object' && property in event.user) {
        const value = event.user[property as keyof typeof event.user];
        if (value && value !== '') {
          return value;
        }
      }
      
      // Fallback to session for location data (deprecated, will be removed)
      if (property === 'initialCountry' && event.session?.country) {
        return event.session.country;
      }
      if (property === 'initialRegion' && event.session?.state) {
        return event.session.state;
      }
      if (property === 'initialCity' && event.session?.city) {
        return event.session.city;
      }
      if (property === 'initialCountryCode' && event.session?.country_code) {
        return event.session.country_code;
      }
      if (property === 'initialZip' && event.session?.zip) {
        return event.session.zip;
      }
      if (property === 'initialIp' && event.session?.ip) {
        return event.session.ip;
      }
      
      return '-';
    }
    
    // Check for direct camelCase UTM properties on the event object
    // These are priorities - preferred access pattern
    if (['utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm'].includes(key)) {
      // Primary: Direct properties with camelCase (highest priority)
      if (key in event && event[key as keyof Event] !== null && event[key as keyof Event] !== undefined && event[key as keyof Event] !== '') {
        return event[key as keyof Event];
      }
      
      // Secondary: Structured utm_data
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (event.utm_data && typeof event.utm_data === 'object' && snakeKey in event.utm_data) {
        const utmValue = event.utm_data[snakeKey as keyof typeof event.utm_data];
        if (utmValue && utmValue !== '') {
          return utmValue;
        }
      }
      
      // Tertiary: User object with initial prefix
      const userKey = 'initial' + key;
      if (event.user && typeof event.user === 'object' && userKey in event.user) {
        const userUtmValue = event.user[userKey as keyof typeof event.user];
        if (userUtmValue && userUtmValue !== '') {
          return userUtmValue;
        }
      }
      
      // Quaternary: Session object
      if (event.session && typeof event.session === 'object' && snakeKey in event.session) {
        return event.session[snakeKey as keyof typeof event.session];
      }
      
      return '-';
    }
    
    // Handle UTM keys from user object
    if (keys.length === 2 && keys[0] === 'user' && keys[1].startsWith('initial')) {
      const utmProperty = keys[1]; // e.g., initialUtmSource
      
      // Convert initialUtmSource to utmSource for direct access
      const directUtmKey = utmProperty.replace('initial', ''); // e.g., UtmSource
      
      // Convert initialUtmSource to utm_source for utm_data access
      const utmKeyFormatted = utmProperty.replace('initial', '').charAt(0).toLowerCase() + utmProperty.replace('initial', '').slice(1); // e.g., utmSource
      const standardUtmKey = utmKeyFormatted.replace(/([A-Z])/g, '_$1').toLowerCase(); // e.g., utm_source
      
      // Priority 1: Direct properties on event (camelCase)
      if (directUtmKey in event && event[directUtmKey as keyof Event] !== null && event[directUtmKey as keyof Event] !== undefined && event[directUtmKey as keyof Event] !== '') {
        return event[directUtmKey as keyof Event];
      }
      
      // Priority 2: utm_data structure (snake_case)
      if (event.utm_data && typeof event.utm_data === 'object' && standardUtmKey in event.utm_data) {
        const utmValue = event.utm_data[standardUtmKey as keyof typeof event.utm_data];
        if (utmValue && utmValue !== '') {
          return utmValue;
        }
      }
      
      // Priority 3: user object with initial prefix
      if (event.user && typeof event.user === 'object' && utmProperty in event.user) {
        const userUtmValue = event.user[utmProperty as keyof typeof event.user];
        if (userUtmValue && userUtmValue !== '') {
          return userUtmValue;
        }
      }
      
      // Fallback: session UTM data
      if (event.session && typeof event.session === 'object' && standardUtmKey in event.session) {
        return event.session[standardUtmKey as keyof typeof event.session];
      }
      
      // Return dash if UTM key isn't found
      return '-';
    }
    
    // Legacy support for session UTM keys (session.utm_source)
    if (keys.length === 2 && keys[0] === 'session' && keys[1].startsWith('utm_')) {
      const utmKey = keys[1]; // e.g., utm_source
      
      // Convert utm_source to UtmSource for direct property access
      const directUtmKey = 'utm' + utmKey.split('_')[1].charAt(0).toUpperCase() + utmKey.split('_')[1].slice(1);
      
      // Priority 1: Direct properties on event (camelCase)
      if (directUtmKey in event && event[directUtmKey as keyof Event] !== null && event[directUtmKey as keyof Event] !== undefined && event[directUtmKey as keyof Event] !== '') {
        return event[directUtmKey as keyof Event];
      }
      
      // Priority 2: utm_data structure (snake_case)
      if (event.utm_data && typeof event.utm_data === 'object' && utmKey in event.utm_data) {
        const utmValue = event.utm_data[utmKey as keyof typeof event.utm_data];
        if (utmValue && utmValue !== '') {
          return utmValue;
        }
      }
      
      // Priority 3: user UTM data with initial prefix
      if (event.user && typeof event.user === 'object') {
        const initialUtmKey = 'initial' + directUtmKey;
        
        if (initialUtmKey in event.user) {
          const userUtmValue = event.user[initialUtmKey as keyof typeof event.user];
          if (userUtmValue && userUtmValue !== '') {
            return userUtmValue;
          }
        }
      }
      
      // Fallback: session UTM data
      if (event.session && typeof event.session === 'object' && utmKey in event.session) {
        return event.session[utmKey as keyof typeof event.session];
      }
      
      // Return dash if UTM key isn't found
      return '-';
    }
    
    // Direct access to utm_data fields (utm_source)
    if (keys.length === 1 && keys[0].startsWith('utm_')) {
      const utmKey = keys[0]; // e.g., utm_source
      
      // Convert utm_source to utmSource for direct property access
      const parts = utmKey.split('_');
      let directUtmKey = 'utm' + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      
      // Priority 1: Direct properties on event (camelCase)
      if (directUtmKey in event && event[directUtmKey as keyof Event] !== null && event[directUtmKey as keyof Event] !== undefined && event[directUtmKey as keyof Event] !== '') {
        return event[directUtmKey as keyof Event];
      }
      
      // Priority 2: utm_data structure (snake_case)
      if (event.utm_data && typeof event.utm_data === 'object' && utmKey in event.utm_data) {
        const utmValue = event.utm_data[utmKey as keyof typeof event.utm_data];
        if (utmValue && utmValue !== '') {
          return utmValue;
        }
      }
      
      // Return dash if UTM key isn't found
      return '-';
    }
    
    // Regular flow for non-UTM fields
    for (const k of keys) {
      if (value === null || value === undefined) return '-'
      
      if (k === 'session' && (typeof value[k] === 'string' && value[k].startsWith('{'))) {
        try {
          value = JSON.parse(value[k])
        } catch (e) {
          value = value[k]
        }
        continue
      }
      
      value = value[k as keyof typeof value]
    }

    // Special handling for isClient - return the raw boolean
    if (keys.length === 2 && keys[0] === 'user' && keys[1] === 'isClient') {
      return value; // Return raw boolean for the cell renderer to handle
    }

    // For other boolean values
    if (typeof value === 'boolean' && key !== 'user.isClient') {
      return value ? 'Sim' : 'Não'
    }

    if (value === null || value === undefined) {
      return '-'
    }

    // Use Brazilian date formatting for event_time
    if (key === 'event_time') {
      return formatBrazilianDate(value);
    }

    return value
  }

  const getColumnWidth = (accessorKey: string) => {
    // Primeiro verifica se há uma largura salva
    if (columnWidths[accessorKey]) {
      return columnWidths[accessorKey]
    }
    
    // Caso contrário, usa os valores padrão
    const defaultWidths: Record<string, string> = {
      'event_id': '80px',
      'event_name': '140px',
      'event_time': '120px',
      'tipo': '80px',
      'data': '100px',
      'nome': '120px',
      'email': '160px',
      'telefone': '120px',
      'cliente': '80px',
      'profissao': '140px',
      'produto': '140px',
      'funil': '140px',
      'utm_source': '140px',
      'utm_medium': '140px',
      'utm_campaign': '180px',
      'utm_content': '160px',
      'utm_term': '140px',
      'pais': '100px',
      'estado': '100px',
      'cidade': '140px',
      'dispositivo': '120px',
      'default': '140px'
    }
    
    return defaultWidths[accessorKey] || defaultWidths['default']
  }

  return (
    <tr className={`hover:bg-gray-50 divide-x divide-gray-200 h-[46px] ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="w-10 px-3 py-3.5 text-left">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onSelectChange?.(event.event_id)}
          aria-label={`Selecionar evento ${event.event_id}`}
        />
      </td>
      {visibleColumns.map((columnId) => {
        const column = COLUMN_CONFIGS.find(c => c.accessorKey === columnId)
        const isPhoneColumn = columnId.toString() === "user.phone"        
        return (
          <td 
            key={`${event.event_id}-${columnId}`}
            className={`px-4 py-2 text-[13px] text-gray-900 ${isPhoneColumn ? 'min-w-[150px]' : ''}`}
            style={{ 
              width: getColumnWidth(columnId),
              maxWidth: getColumnWidth(columnId),
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {column?.cell 
              ? column.cell({ row: { getValue: (key: string) => getValue(key) } })
              : String(getValue(columnId) ?? '-')}
          </td>
        )
      })}
    </tr>
  )
} 