import { useEffect } from 'react';
import { Calendar, Clock, Video, ChevronRight, Sparkles } from 'lucide-react';
import { useCalendarStore, EVENT_TYPE_CONFIG, CalendarEvent } from '@/store/calendarStore';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function UpcomingEventsSidebar() {
  const { upcomingEvents, fetchUpcoming, setSelectedEvent } = useCalendarStore();

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  const grouped = groupByRelativeDate(upcomingEvents);

  return (
    <div className="space-y-5">
      {/* Next Live Session Card */}
      {upcomingEvents.length > 0 && (
        <NextLiveSessionCard event={upcomingEvents[0]} onSelect={() => setSelectedEvent(upcomingEvents[0])} />
      )}

      {/* Upcoming Events */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-400" />
          Upcoming
        </h3>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{group.label}</p>
                <div className="space-y-2">
                  {group.events.map((event) => (
                    <UpcomingEventItem
                      key={event.id}
                      event={event}
                      onSelect={() => setSelectedEvent(event)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NextLiveSessionCard({ event, onSelect }: { event: CalendarEvent; onSelect: () => void }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.live_session;
  const startDate = new Date(event.start_datetime);
  const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-primary-500/20 via-primary-600/10 to-purple-500/20 backdrop-blur-xl border border-primary-500/20 rounded-2xl p-5 cursor-pointer group"
      onClick={onSelect}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Next Event</span>
        </div>
        <p className="text-xs text-gray-400 mb-1">{dayName}, {monthDay} &bull; {time}</p>
        <h4 className="text-base font-bold text-white mb-2 leading-tight">{event.title}</h4>
        {event.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-4">{event.description}</p>
        )}
        {event.meeting_url && (
          <div className="flex items-center gap-2 text-sm text-primary-400 font-medium">
            <Video size={14} />
            Join Session
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function UpcomingEventItem({ event, onSelect }: { event: CalendarEvent; onSelect: () => void }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.class;
  const startDate = new Date(event.start_datetime);
  const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div
      onClick={onSelect}
      className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
        <Calendar className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white truncate group-hover:text-primary-400 transition-colors">
          {event.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', config.bg, config.color)}>
            {config.label}
          </span>
          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {time}
          </span>
        </div>
      </div>
    </div>
  );
}

interface GroupedEvents {
  label: string;
  events: CalendarEvent[];
}

function groupByRelativeDate(events: CalendarEvent[]): GroupedEvents[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const nextWeekStart = new Date(tomorrowStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 6);

  const groups: GroupedEvents[] = [
    { label: 'Today', events: [] },
    { label: 'Tomorrow', events: [] },
    { label: 'This Week', events: [] },
    { label: 'Later', events: [] },
  ];

  for (const event of events) {
    const d = new Date(event.start_datetime);
    if (d < tomorrowStart) {
      groups[0].events.push(event);
    } else if (d < new Date(tomorrowStart.getTime() + 86400000)) {
      groups[1].events.push(event);
    } else if (d < nextWeekStart) {
      groups[2].events.push(event);
    } else {
      groups[3].events.push(event);
    }
  }

  return groups.filter((g) => g.events.length > 0);
}
