import { JiraTicket } from '../../../types';
import { format } from 'date-fns';
import './TicketList.css';

interface TicketListProps {
  tickets: JiraTicket[];
  onDelete?: (id: string) => void;
}

export default function TicketList({ tickets, onDelete }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="empty-state">
        <p>No tickets found. Click "Add Manual Ticket" to start tracking your Jira tickets.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Tickets you add will be saved and persist across sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="ticket-list">
      <h2>Your Tickets ({tickets.length})</h2>
      <ul className="ticket-bullet-list">
        {tickets.map(ticket => (
          <li key={ticket.id} className="ticket-item">
            <div className="ticket-header">
              <a
                href={ticket.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ticket-key"
              >
                {ticket.key}
              </a>
              <span className={`ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                {ticket.status}
              </span>
            </div>
            <div className="ticket-title">{ticket.title}</div>
            <div className="ticket-meta">
              {ticket.assignee && <span>Assigned to: {ticket.assignee}</span>}
              <span>Updated: {format(ticket.updated, 'MMM dd, yyyy')}</span>
            </div>
            {onDelete && (
              <button 
                className="ticket-delete-btn"
                onClick={() => onDelete(ticket.id)}
                title="Delete ticket"
              >
                🗑️
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
