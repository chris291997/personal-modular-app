import { useState, useEffect } from 'react';
import { searchTickets } from '../../services/jiraService';
import { JiraTicket, TaskFilter } from '../../types';
import { subMonths } from 'date-fns';
import './TaskModule.css';
import TicketList from './components/TicketList';
import FilterForm from './components/FilterForm';
import ManualTicketForm from './components/ManualTicketForm';
import { useTaskStore } from '../../stores/taskStore';

export default function TaskModule() {
  const { tickets, loading, loadTickets, addTicket, deleteTicket } = useTaskStore();
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [filter, setFilter] = useState<TaskFilter>({
    startDate: subMonths(new Date(), 1),
    endDate: new Date(),
    includeMentions: true,
    includeAssigned: true,
    includeComments: true,
  });

  const handleSearch = async () => {
    try {
      setSearchLoading(true);
      setError(null);
      const apiResults = await searchTickets(filter);
      
      // Also load saved tickets from store and merge (avoid duplicates by key)
      await loadTickets();
      const savedTickets = useTaskStore.getState().tickets;
      const savedMap = new Map(savedTickets.map(t => [t.key, t]));
      
      // Add API results, but don't override saved tickets
      apiResults.forEach(ticket => {
        if (!savedMap.has(ticket.key)) {
          savedMap.set(ticket.key, ticket);
        }
      });
      
      // Update store with merged tickets
      useTaskStore.setState({ tickets: Array.from(savedMap.values()) });
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      if (err.message === 'CORS_ERROR' || err.message?.includes('CORS')) {
        setError('Jira API cannot be accessed directly from the browser (CORS restriction). This is normal - use "Add Manual Ticket" to add your tickets. They will be saved to Firebase and persist across sessions.');
      } else {
        setError(err.message || 'Failed to fetch tickets from Jira. Please use "Add Manual Ticket" to add tickets manually.');
      }
      
      // Still load saved tickets from store even if API fails
      try {
        await loadTickets();
      } catch (loadError) {
        console.error('Error loading saved tickets:', loadError);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddManual = async (ticket: Omit<JiraTicket, 'id' | 'created' | 'updated'>) => {
    try {
      await addTicket(ticket); // Store will handle saving and updating state
      setShowManualForm(false);
    } catch (error: unknown) {
      console.error('Error saving ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save ticket: ${errorMessage}\n\nCheck browser console for details.`);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await deleteTicket(id); // Store will handle deletion and updating state
    } catch (error: unknown) {
      console.error('Error deleting ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('access denied') || errorMessage.includes('not found')) {
        alert('You do not have permission to delete this ticket or it does not exist.');
        // Reload tickets to sync state
        await loadTickets(true);
        return;
      }
      alert(`Failed to delete ticket: ${errorMessage}\n\nCheck browser console for details.`);
    }
  };

  useEffect(() => {
    loadTickets(); // Load from store (will use cache if available)
  }, [loadTickets]);

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

      {(loading || searchLoading) ? (
        <div className="loading">Loading tickets...</div>
      ) : (
        <TicketList tickets={tickets} filter={filter} onDelete={handleDeleteTicket} />
      )}
    </div>
  );
}
