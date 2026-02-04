import { TaskFilter } from '../../../types';
import { format } from 'date-fns';
import './FilterForm.css';

interface FilterFormProps {
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onSearch: () => void;
}

export default function FilterForm({ filter, onFilterChange, onSearch }: FilterFormProps) {
  const handleChange = (updates: Partial<TaskFilter>) => {
    onFilterChange({ ...filter, ...updates });
  };

  return (
    <div className="filter-form">
      <div className="filter-row">
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={format(filter.startDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const dateValue = e.target.value;
              if (dateValue) {
                // Create date at local midnight to avoid timezone issues
                const date = new Date(dateValue + 'T00:00:00');
                handleChange({ startDate: date });
              }
            }}
            className="date-input"
          />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={format(filter.endDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const dateValue = e.target.value;
              if (dateValue) {
                // Create date at local midnight to avoid timezone issues
                const date = new Date(dateValue + 'T00:00:00');
                handleChange({ endDate: date });
              }
            }}
            className="date-input"
          />
        </div>
      </div>

      <div className="filter-checkboxes">
        <label>
          <input
            type="checkbox"
            checked={filter.includeMentions}
            onChange={(e) => handleChange({ includeMentions: e.target.checked })}
          />
          Include Mentions
        </label>
        <label>
          <input
            type="checkbox"
            checked={filter.includeAssigned}
            onChange={(e) => handleChange({ includeAssigned: e.target.checked })}
          />
          Include Previously Assigned
        </label>
        <label>
          <input
            type="checkbox"
            checked={filter.includeComments}
            onChange={(e) => handleChange({ includeComments: e.target.checked })}
          />
          Include My Comments
        </label>
      </div>

      <button type="button" className="btn-primary" onClick={onSearch}>
        Search Tickets
      </button>
    </div>
  );
}
