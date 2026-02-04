import { useState } from 'react';
import { JiraTicket } from '../../../types';
import { getTicket } from '../../../services/jiraService';
import './ManualTicketForm.css';

interface ManualTicketFormProps {
  onSubmit: (ticket: Omit<JiraTicket, 'id' | 'created' | 'updated'>) => void;
  onCancel: () => void;
}

export default function ManualTicketForm({ onSubmit, onCancel }: ManualTicketFormProps) {
  const [formData, setFormData] = useState({
    key: '',
    title: '',
    status: 'To Do',
    url: '',
  });
  const [searchKey, setSearchKey] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchKey.trim()) {
      setSearchError('Please enter a ticket key (e.g., PROJ-123)');
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);
      const ticket = await getTicket(searchKey.trim());
      
      if (ticket) {
        setFormData({
          key: ticket.key,
          title: ticket.title,
          status: ticket.status,
          url: ticket.url,
        });
        setSearchError(null);
      } else {
        setSearchError('Ticket not found. Please check the ticket key and try again.');
      }
    } catch (error) {
      console.error('Error searching ticket:', error);
      const err = error as Error;
      if (err.message?.includes('CORS') || err.message === 'CORS_ERROR') {
        setSearchError('Cannot search from browser due to CORS. Please enter details manually.');
      } else {
        setSearchError(err.message || 'Failed to fetch ticket. Please enter details manually.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      key: formData.key,
      title: formData.title,
      status: formData.status,
      url: formData.url || `https://datafiedusa.atlassian.net/browse/${formData.key}`,
    });
    setFormData({ key: '', title: '', status: 'To Do', url: '' });
    setSearchKey('');
    setSearchError(null);
  };

  return (
    <form className="manual-ticket-form" onSubmit={handleSubmit}>
      <h3>Add Ticket</h3>
      
      <div className="search-section">
        <label>Search by Ticket ID (e.g., PROJ-123)</label>
        <div className="search-input-group">
          <input
            type="text"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Enter ticket key and click Search"
            disabled={searching}
          />
          <button
            type="button"
            className="btn-search"
            onClick={handleSearch}
            disabled={searching || !searchKey.trim()}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchError && (
          <div className="search-error">{searchError}</div>
        )}
        {!searchError && formData.key && (
          <div className="search-success">✓ Ticket found! Details filled below.</div>
        )}
      </div>

      <div className="form-divider">OR</div>

      <div className="form-group">
        <label>Ticket Key (e.g., PROJ-123) *</label>
        <input
          type="text"
          required
          value={formData.key}
          onChange={(e) => setFormData({ ...formData, key: e.target.value })}
          placeholder="PROJ-123"
        />
      </div>

      <div className="form-group">
        <label>Title *</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ticket title"
        />
      </div>

      <div className="form-group">
        <label>Status *</label>
        <select
          required
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>

      <div className="form-group">
        <label>URL (optional)</label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://datafiedusa.atlassian.net/browse/PROJ-123"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">Add Ticket</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
