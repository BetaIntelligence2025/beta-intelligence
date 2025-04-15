import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"


interface FilterSelectProps {
  value: string
  onValueChange: (value: string) => void
}

export function FilterSelect({ value, onValueChange }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Selecione um filtro" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="users">Usuários</SelectItem>
        <SelectItem value="leads">Leads</SelectItem>
        <SelectItem value="clients">Connect Rate</SelectItem>
        <SelectItem value="anonymous">Anônimos</SelectItem>
      </SelectContent>
    </Select>
  )
} 