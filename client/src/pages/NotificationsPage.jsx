import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Calendar, AlertTriangle, Briefcase, UserPlus } from 'lucide-react';
import API from '../services/api';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const getIconForType = (type) => {
    switch (type) {
      case 'lead_assignment': return <UserPlus size={20} className="text-blue-400" />;
      case 'deal_update': return <Briefcase size={20} className="text-emerald-400" />;
      case 'task_overdue': return <AlertTriangle size={20} className="text-red-400" />;
      case 'upcoming_followup': return <Calendar size={20} className="text-amber-400" />;
      case 'customer_activity': return <Briefcase size={20} className="text-purple-400" />;
      default: return <Bell size={20} className="text-indigo-400" />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">Review alerts, updates, and system events.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '150px' }}>
            <option value="all">All</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
          <button onClick={handleMarkAllRead} className="btn btn-secondary">
            <Check size={16} />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading notifications...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
              <Bell size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>You have no {filter !== 'all' ? filter : ''} notifications at this time.</p>
            </div>
          ) : (
            filteredNotifications.map(n => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                borderLeft: !n.is_read ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                opacity: n.is_read ? 0.75 : 1
              }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {getIconForType(n.type)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{n.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{n.message}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {!n.is_read && (
                  <button onClick={() => handleMarkAsRead(n.id)} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} title="Mark as read">
                    <Check size={16} className="text-emerald-400" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
