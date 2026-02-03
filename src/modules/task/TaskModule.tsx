import { useState, useEffect } from 'react';
import { searchTickets } from '../../services/jiraService';
import { saveTicket, getSavedTickets, deleteTicket } from '../../services/taskService';
import { JiraTicket, TaskFilter } from '../../types';
import { subMonths } from 'date-fns';
import './TaskModule.css';
import TicketList from './components/TicketList';
import FilterForm from './components/FilterForm';
import ManualTicketForm from './components/ManualTicketForm';

export default function TaskModule() {
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  
  const [filter, setFilter] = useState<TaskFilter>({
    startDate: subMonths(new Date(), 1),
    endDate: new Date(),
    includeMentions: true,
    includeAssigned: true,
    includeComments: true,
  });

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiResults = await searchTickets(filter);
      
      // Also load saved tickets and merge (avoid duplicates by key)
      const savedTickets = await getSavedTickets();
      const savedMap = new Map(savedTickets.map(t => [t.key, t]));
      
      // Add API results, but don't override saved tickets
      apiResults.forEach(ticket => {
        if (!savedMap.has(ticket.key)) {
          savedMap.set(ticket.key, ticket);
        }
      });
      
      setTickets(Array.from(savedMap.values()));
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      if (err.message === 'CORS_ERROR' || err.message?.includes('CORS')) {
        setError('Jira API cannot be accessed directly from the browser (CORS restriction). This is normal - use "Add Manual Ticket" to add your tickets. They will be saved to Firebase and persist across sessions.');
      } else {
        setError(err.message || 'Failed to fetch tickets from Jira. Please use "Add Manual Ticket" to add tickets manually.');
      }
      
      // Still load saved tickets even if API fails
      try {
        const savedTickets = await getSavedTickets();
        setTickets(savedTickets);
      } catch (loadError) {
        console.error('Error loading saved tickets:', loadError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = async (ticket: Omit<JiraTicket, 'id' | 'created' | 'updated'>) => {
    try {
      const id = await saveTicket(ticket);
      const newTicket: JiraTicket = {
        ...ticket,
        id,
        created: new Date(),
        updated: new Date(),
      };
      setTickets([newTicket, ...tickets]);
      setShowManualForm(false);
    } catch (error) {
      console.error('Error saving ticket:', error);
      alert('Failed to save ticket. Please try again.');
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await deleteTicket(id);
      setTickets(tickets.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket. Please try again.');
    }
  };

  useEffect(() => {
    // Load saved tickets from Firebase on mount
    loadSavedTickets();
  }, []);

  const loadSavedTickets = async () => {
    try {
      const saved = await getSavedTickets();
      setTickets(saved);
    } catch (error) {
      console.error('Error loading saved tickets:', error);
    }
  };

  return (
    <div className="task-module">
      <div className="task-header">
        <h1>Task Management</h1>
        <p>Track your Jira tickets and work items</p>
        <div className="info-banner">
          <strong>💡 How to use:</strong> Click "Add Manual Ticket" to add your Jira tickets. 
          They'll be saved to Firebase and available across all your devices. 
          The "Search Tickets" button may not work due to browser CORS restrictions (this is normal).
        </div>
      </div>

      <div className="task-controls">
        <FilterForm
          filter={filter}
          onFilterChange={setFilter}
          onSearch={handleSearch}
        />
        <button
          className="btn-primary"
          onClick={() => setShowManualForm(!showManualForm)}
        >
          {showManualForm ? 'Cancel' : '+ Add Manual Ticket'}
        </button>
      </div>

      {showManualForm && (
        <ManualTicketForm
          onSubmit={handleAddManual}
          onCancel={() => setShowManualForm(false)}
        />
      )}

      {error && (
        <div className={`error-banner ${error.includes('CORS') ? 'info-banner' : ''}`}>
          <span>{error.includes('CORS') ? 'ℹ️' : '⚠️'} {error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading tickets...</div>
      ) : (
        <TicketList tickets={tickets} onDelete={handleDeleteTicket} />
      )}
    </div>
  );
}
