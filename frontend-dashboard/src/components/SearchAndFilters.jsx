import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Filter, ArrowUpDown } from "lucide-react";

export function SearchAndFilters({ 
  searchQuery, 
  onSearchChange, 
  statusFilter, 
  onStatusFilterChange, 
  sortBy, 
  onSortChange 
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      marginBottom: '24px'
    }}>
      <div style={{ position: 'relative', flex: '1' }}>
        <Search style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#94a3b8',
          width: '16px',
          height: '16px'
        }} />
        <input 
          placeholder="Search Chatbots..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            height: '40px',
            paddingLeft: '40px',
            paddingRight: '16px',
            borderRadius: '16px',
            border: 'none',
            background: '#f1f5f9',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.background = 'white';
            e.target.style.boxShadow = '0 0 0 2px #3b82f6';
          }}
          onBlur={(e) => {
            e.target.style.background = '#f1f5f9';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <select 
          value={statusFilter} 
          onChange={(e) => onStatusFilterChange(e.target.value)}
          style={{
            width: '140px',
            height: '40px',
            borderRadius: '16px',
            border: 'none',
            background: '#f1f5f9',
            padding: '0 12px',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select 
          value={sortBy} 
          onChange={(e) => onSortChange(e.target.value)}
          style={{
            width: '140px',
            height: '40px',
            borderRadius: '16px',
            border: 'none',
            background: '#f1f5f9',
            padding: '0 12px',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="date">By Date</option>
          <option value="name">By Name</option>
          <option value="usage">By Usage</option>
        </select>
      </div>
    </div>
  );
}