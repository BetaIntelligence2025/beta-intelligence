"use client";

import { Table, TableBody } from "@/components/ui/table";
import { DashboardTableSkeleton } from "./dashboard-table-skeleton";
import { DashboardTableRow } from "./dashboard-table-row";
import { ColumnManagementModal } from "./column-management-modal";
import { type ColumnId, useColumnsStore } from "@/stores/use-columns-store";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { useRef, useEffect, useState } from "react";
import { create } from "zustand";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Settings2, Download, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { COLUMN_CONFIGS } from "@/stores/use-columns-store";
import { User } from '@/types/users-type'
import { Checkbox } from '@/components/ui/checkbox'

interface ColumnWidthStore {
  widths: Record<ColumnId, number>;
  updateWidth: (columnId: ColumnId, width: number) => void;
}

export const useColumnWidthStore = create<ColumnWidthStore>((set) => ({
  widths: {
    // Colunas padrão
    fullname: 200,
    initialProfession: 200,
    initialFunnel: 200,
    initialUtmMedium: 200,
    initialUtmSource: 200,
    initialUtmCampaign: 200,
    initialUtmContent: 200,
    initialUtmTerm: 200,
    actions: 100,
    // Colunas opcionais
    phone: 150,
    fbc: 150,
    fbp: 150,
    created_at: 180,
    is_recent: 100,
    initialCountry: 150,
    initialCountryCode: 120,
    initialRegion: 150,
    initialCity: 150,
    initialZip: 120,
    initialIp: 150,
    initialUserAgent: 200,
    initialReferrer: 200,
    initialTimezone: 150,
    user_id: 100,
    isIdentified: 120,
    initialDeviceType: 150,
    initialPlatform: 150,
    initialBrowser: 150,
    fullInitialReferrer: 200,
    initialLandingPage: 200,
    initialMarketingChannel: 200,
    isClient: 120,
  },
  updateWidth: (columnId, width) =>
    set((state) => ({
      widths: { ...state.widths, [columnId]: width },
    })),
}));

// Colunas padrão iniciais
const DEFAULT_COLUMNS: ColumnId[] = [
  'fullname',
  'created_at',
  'initialProfession',
  'initialFunnel',
  'initialUtmMedium',
  'initialUtmSource',
  'initialUtmCampaign',
  'initialUtmContent',
  'initialUtmTerm',
  'actions'
]

interface DashboardTableProps {
  isLoading: boolean
  result: { user: Partial<User>[] }
  currentPage: number
  totalResults: Partial<User>[] // Total de resultados da visualização atual
  onSort: (columnId: string, direction: 'asc' | 'desc' | null) => void
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
}

// Mapeamento de todas as colunas para labels em português (removendo actions)
const EXPORT_COLUMNS_MAP: Record<Exclude<ColumnId, 'actions'>, string> = {
  fullname: 'Nome Completo',
  initialProfession: 'Profissão',
  initialFunnel: 'Funil',
  initialUtmMedium: 'UTM Medium',
  initialUtmSource: 'UTM Source',
  initialUtmCampaign: 'UTM Campaign',
  initialUtmContent: 'UTM Content',
  initialUtmTerm: 'UTM Term',
  phone: 'Telefone',
  fbc: 'FBC',
  fbp: 'FBP',
  created_at: 'Data de Criação',
  is_recent: 'É Recente',
  initialCountry: 'País',
  initialCountryCode: 'Código do País',
  initialRegion: 'Região',
  initialCity: 'Cidade',
  initialZip: 'CEP',
  initialIp: 'IP',
  initialUserAgent: 'User Agent',
  initialReferrer: 'Referência',
  initialTimezone: 'Fuso Horário',
  user_id: 'ID do Usuário',
  isIdentified: 'Está Identificado',
  initialDeviceType: 'Tipo de Dispositivo',
  initialPlatform: 'Plataforma',
  initialBrowser: 'Navegador',
  fullInitialReferrer: 'Referência Completa',
  initialLandingPage: 'Página de Destino',
  initialMarketingChannel: 'Canal de Marketing',
  isClient: 'É Cliente'
};

// Função utilitária para converter para CSV
const convertToCSV = (users: Partial<User>[], selectedIndexes: Set<number>) => {
  // Todas as colunas possíveis em ordem, excluindo 'actions'
  const allColumns = Object.keys(EXPORT_COLUMNS_MAP) as Exclude<ColumnId, 'actions'>[];
  
  // Cabeçalho do CSV com labels em português
  const headers = allColumns
    .map(columnId => EXPORT_COLUMNS_MAP[columnId])
    .join(',');

  // Dados selecionados
  const selectedUsers = Array.from(selectedIndexes).map(index => users[index]);
  
  // Converte os dados para linhas CSV
  const rows = selectedUsers.map(user => {
    return allColumns.map(columnId => {
      const value = user[columnId as keyof User] || '';
      // Escapa vírgulas e aspas duplas
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
};

// Função para fazer o download
const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Tipo para direção da ordenação
type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  columnId: ColumnId;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSort: (columnId: string) => void;
}

function SortableHeader({ 
  columnId,
  sortColumn,
  sortDirection,
  onSort
}: SortableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: columnId });

  const config = COLUMN_CONFIGS.find(config => config.id === columnId);
  const isCurrentSortColumn = sortColumn === columnId;
  const isActionColumn = columnId === 'actions';

  return (
    <th
      ref={setNodeRef}
      style={{
        width: `${config?.width || 200}px`,
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
      }}
      className="px-4 py-2 font-medium text-muted-foreground select-none group"
    >
      <div
        {...attributes}
        {...listeners}
        className={`flex items-center justify-between ${!isActionColumn ? 'cursor-pointer' : ''}`}
        onClick={() => !isActionColumn && onSort(columnId)}
      >
        <span>{config?.label || ''}</span>
        {!isActionColumn && (
          <div className="flex items-center">
            {isCurrentSortColumn ? (
              sortDirection === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-100" />
            )}
          </div>
        )}
      </div>
    </th>
  );
}

export function DashboardTable({ 
  isLoading, 
  result, 
  currentPage, 
  totalResults,
  onSort,
  sortColumn,
  sortDirection,
}: DashboardTableProps) {
  const { visibleColumns, setVisibleColumns } = useColumnsStore();
  const { widths, updateWidth } = useColumnWidthStore();
  const [mounted, setMounted] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    setVisibleColumns(DEFAULT_COLUMNS);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reseta seleção quando mudar visualização (anônimo/lead)
  useEffect(() => {
    setSelectedRows(new Set());
  }, [result]);

  // Reseta seleção quando mudar de página
  useEffect(() => {
    setSelectedRows(new Set());
  }, [currentPage]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = visibleColumns.indexOf(active.id as ColumnId);
      const newIndex = visibleColumns.indexOf(over.id as ColumnId);
      setVisibleColumns(arrayMove(visibleColumns, oldIndex, newIndex));
    }
  }

  const handleSelectRow = (index: number, isSelected: boolean) => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev)
      if (isSelected) {
        newSelected.add(index)
      } else {
        newSelected.delete(index)
      }
      return newSelected
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && result?.user) {
      // Usa os dados da página atual para seleção
      const allIndexes = result.user.map((_, index) => index)
      setSelectedRows(new Set(allIndexes))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleExportCSV = () => {
    if (!result || selectedRows.size === 0) return;
    
    const csv = convertToCSV(result.user, selectedRows);
    const filename = `export-${new Date().toISOString()}.csv`;
    downloadCSV(csv, filename);
  };

  const handleSort = (columnId: string) => {
    let newDirection: 'asc' | 'desc' | null;
    
    // Se é a mesma coluna, alterna entre asc -> desc -> null
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') newDirection = 'desc';
      else if (sortDirection === 'desc') newDirection = null;
      else newDirection = 'asc';
    } else {
      // Nova coluna, começa com ascendente
      newDirection = 'asc';
    }

    onSort(columnId, newDirection);
  };

  if (!mounted) return <DashboardTableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={selectedRows.size === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar Selecionados ({selectedRows.size})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Colunas
        </Button>
        <ColumnManagementModal 
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      </div>

      <div className="relative rounded-md border">
        <div className="overflow-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleColumns} strategy={horizontalListSortingStrategy}>
              <Table ref={tableRef}>
                <thead className="[&_tr]:border-b bg-white sticky top-0 z-10">
                  <tr>
                    <th className="w-[40px] px-4">
                      <Checkbox
                        checked={result?.user?.length > 0 && selectedRows.size === result.user.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all rows"
                      />
                    </th>
                    {visibleColumns.map((columnId) => (
                      <SortableHeader
                        key={columnId}
                        columnId={columnId}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                    ))}
                  </tr>
                </thead>
                <TableBody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1}>
                        <DashboardTableSkeleton />
                      </td>
                    </tr>
                  ) : !result?.user?.length ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="text-center text-gray-500 py-4">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    result.user.map((user, index) => (
                      <DashboardTableRow
                        key={index}
                        user={user}
                        visibleColumns={visibleColumns}
                        isSelected={selectedRows.has(index)}
                        onSelectRow={(_, isSelected) => handleSelectRow(index, isSelected)}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

export type { ColumnWidthStore };
