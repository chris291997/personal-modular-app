import { useState } from 'react';
import { JiraTicket } from '../../../types';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      key: formData.key,
      title: formData.title,
      status: formData.status,
      url: formData.url || `https://datafiedusa.atlassian.net/browse/${formData.key}`,
    });
    setFormData({ key: '', title: '', status: 'To Do', url: '' });
  };

  return (
    <form className="manual-ticket-form" onSubmit={handleSubmit}>
      <h3>Add Manual Ticket</h3>
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
