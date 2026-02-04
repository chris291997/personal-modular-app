import { JiraTicket, TaskFilter } from '../../../types';
import { format } from 'date-fns';
import './TicketList.css';

interface TicketListProps {
  tickets: JiraTicket[];
  filter: TaskFilter;
  onDelete?: (id: string) => void;
}

export default function TicketList({ tickets, filter, onDelete }: TicketListProps) {
  // Filter tickets based on the current filter settings
  const filteredTickets = tickets.filter(ticket => {
    // Check if ticket is within date range
    const ticketDate = ticket.updated;
    // Normalize dates to start of day for comparison
    const startDate = new Date(filter.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(filter.endDate);
    endDate.setHours(23, 59, 59, 999);
    const ticketDateNormalized = new Date(ticketDate);
    ticketDateNormalized.setHours(0, 0, 0, 0);
    
    return ticketDateNormalized >= startDate && ticketDateNormalized <= endDate;
  });

  // Generate bullet list text
  const generateBulletList = (): string => {
    if (filteredTickets.length === 0) {
      return 'No tickets found matching the current filter.';
    }

    return filteredTickets
      .map((ticket, index) => {
        const assigneeText = ticket.assignee ? ` (Assigned to: ${ticket.assignee})` : '';
        const statusText = ` [${ticket.status}]`;
        const dateText = ` - Updated: ${format(ticket.updated, 'MMM dd, yyyy')}`;
        return `${index + 1}. ${ticket.key}${statusText}: ${ticket.title}${assigneeText}${dateText}`;
      })
      .join('\n');
  };

  const bulletListText = generateBulletList();

  const handleCopy = () => {
    navigator.clipboard.writeText(bulletListText).then(() => {
      // Show temporary success message
      const button = document.querySelector('.copy-button') as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.style.background = 'linear-gradient(to right, #10b981, #059669)';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '';
        }, 2000);
      }
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  };

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
      <div className="ticket-list-header">
        <h2>Your Tickets ({filteredTickets.length} of {tickets.length} shown)</h2>
        <button
          type="button"
          className="copy-button"
          onClick={handleCopy}
          title="Copy ticket list to clipboard"
        >
          📋 Copy List
        </button>
      </div>
      
      <div className="ticket-list-container">
        <textarea
          className="ticket-bullet-textarea"
          value={bulletListText}
          readOnly
          onClick={(e) => {
            // Select all text when clicked
            (e.target as HTMLTextAreaElement).select();
          }}
          onFocus={(e) => {
            // Select all text on focus
            e.target.select();
          }}
        />
      </div>

      {onDelete && (
        <div className="ticket-list-details">
          <h3>Ticket Details (Click to delete)</h3>
          <ul className="ticket-bullet-list">
            {filteredTickets.map(ticket => (
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
                <button 
                  className="ticket-delete-btn"
                  onClick={() => onDelete(ticket.id)}
                  title="Delete ticket"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
