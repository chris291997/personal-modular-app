import { useState, useMemo, useRef, useEffect } from 'react';
import { JiraTicket, TaskFilter } from '../../../types';
import { format } from 'date-fns';
import './TicketList.css';

interface TicketListProps {
  tickets: JiraTicket[];
  filter: TaskFilter;
  onDelete?: (id: string) => void;
}

export default function TicketList({ tickets, filter, onDelete }: TicketListProps) {
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Filter tickets based on the current filter settings
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
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
  }, [tickets, filter]);

  // Get selected tickets for copying
  const ticketsToCopy = useMemo(() => {
    if (selectedTickets.size === 0) {
      return filteredTickets;
    }
    return filteredTickets.filter(ticket => selectedTickets.has(ticket.id));
  }, [filteredTickets, selectedTickets]);

  // Generate bullet list text with only ID (bold), status (bold), and title
  const generateBulletList = (): string => {
    if (ticketsToCopy.length === 0) {
      return 'No tickets selected.';
    }

    return ticketsToCopy
      .map((ticket) => {
        // Format: • **ID** **Status**: Title
        return `• **${ticket.key}** **${ticket.status}**: ${ticket.title}`;
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

  const handleToggleSelect = (ticketId: string) => {
    setSelectedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets.map(t => t.id)));
    }
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

  const allSelected = filteredTickets.length > 0 && selectedTickets.size === filteredTickets.length;
  const someSelected = selectedTickets.size > 0 && selectedTickets.size < filteredTickets.length;

  // Update indeterminate state of select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <div className="ticket-list">
      <div className="ticket-list-header">
        <div className="ticket-list-header-left">
          <h2>Your Tickets ({filteredTickets.length} of {tickets.length} shown)</h2>
          {filteredTickets.length > 0 && (
            <button
              type="button"
              className="select-all-button"
              onClick={handleSelectAll}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
        <button
          type="button"
          className="copy-button"
          onClick={handleCopy}
          title="Copy selected tickets to clipboard"
          disabled={ticketsToCopy.length === 0}
        >
          📋 Copy List ({ticketsToCopy.length})
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
          <h3>Ticket Details</h3>
          
          {/* Mobile Card View */}
          <div className="ticket-cards-mobile">
            {filteredTickets.map(ticket => {
              const isSelected = selectedTickets.has(ticket.id);
              return (
                <div 
                  key={ticket.id} 
                  className={`ticket-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleToggleSelect(ticket.id)}
                >
                  <div className="ticket-card-header">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(ticket.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="ticket-checkbox"
                    />
                    <a
                      href={ticket.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ticket-key"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ticket.key}
                    </a>
                    <span className={`ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="ticket-title">{ticket.title}</div>
                  <button 
                    className="ticket-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(ticket.id);
                    }}
                    title="Delete ticket"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="ticket-table-desktop">
            <table className="ticket-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={selectAllCheckboxRef}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th className="action-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => {
                  const isSelected = selectedTickets.has(ticket.id);
                  return (
                    <tr 
                      key={ticket.id} 
                      className={`ticket-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleSelect(ticket.id)}
                    >
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(ticket.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>
                        <a
                          href={ticket.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ticket-key"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ticket.key}
                        </a>
                      </td>
                      <td className="ticket-title-cell">{ticket.title}</td>
                      <td>
                        <span className={`ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="action-col">
                        <button 
                          className="ticket-delete-btn-table"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(ticket.id);
                          }}
                          title="Delete ticket"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
