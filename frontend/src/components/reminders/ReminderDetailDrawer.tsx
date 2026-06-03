import type { Reminder } from '../../types/reminder';

interface Props {
  reminder: Reminder | null;
  onClose: () => void;
  onRead: (id: string) => void;
  onDone: (id: string) => void;
  onSnooze: (id: string, until: Date) => void;
  showAudit?: boolean;
}

export function ReminderDetailDrawer({ reminder, onClose, onRead, onDone, onSnooze, showAudit }: Props) {
  if (!reminder) return null;

  const snooze1h = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    onSnooze(reminder._id, d);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 p-4 md:p-6">
      <div className="flex h-full w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Reminder details</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{reminder.type.replace(/_/g, ' ')}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{reminder.title}</h3>
          {reminder.description && <p className="mt-3 text-sm text-slate-600">{reminder.description}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Due</dt>
              <dd className="font-medium">{new Date(reminder.reminder_date).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Priority</dt>
              <dd className="font-medium capitalize">{reminder.priority}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium capitalize">{reminder.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Module</dt>
              <dd className="font-medium">{reminder.related_module}</dd>
            </div>
          </dl>

          {showAudit && reminder.audit_history && reminder.audit_history.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-slate-700">History</h4>
              <ul className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                {reminder.audit_history.map((h, i) => (
                  <li key={i} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{h.action}</span>
                    {' · '}
                    {new Date(h.timestamp).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
          {!reminder.is_read && (
            <button
              type="button"
              onClick={() => onRead(reminder._id)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Mark read
            </button>
          )}
          <button
            type="button"
            onClick={() => onDone(reminder._id)}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Mark done
          </button>
          <button
            type="button"
            onClick={snooze1h}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Snooze 1h
          </button>
        </div>
      </div>
    </div>
  );
}
