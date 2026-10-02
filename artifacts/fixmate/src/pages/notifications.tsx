import { useEffect, useState } from 'react';
import { useListNotifications, getListNotificationsQueryKey } from '@workspace/api-client-react';
import { useUser } from '@clerk/react';
import { Link } from 'wouter';
import { Bell, BellOff, BriefcaseBusiness, Banknote, MessageSquare, LoaderCircle, Check, Info } from 'lucide-react';
import { Header, Footer } from '@/components/layout';

export default function NotificationsPage() {
  const { user } = useUser();
  const { data: notifications = [], isLoading } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      refetchInterval: 15000,
    }
  });

  const isSupported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if (!isSupported) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user || permission !== 'granted' || !isSupported) return;
    
    const key = `fixmate_notifs_${user.id}`;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      seen = [];
    }
    
    const seenSet = new Set(seen);
    let updated = false;

    // We only notify for items we haven't seen locally
    [...notifications].reverse().forEach(n => {
      if (!seenSet.has(n.id)) {
        try {
          new Notification('FixMate', {
            body: 'You have a new update in the app.',
          });
        } catch (e) {
          console.error('Failed to show notification', e);
        }
        seenSet.add(n.id);
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(key, JSON.stringify(Array.from(seenSet).slice(-100)));
    }
  }, [notifications, user, permission, isSupported]);

  const getIcon = (type: string) => {
    if (type.includes('job')) return <BriefcaseBusiness size={18} className="text-[#c48527]" />;
    if (type.includes('quote') || type.includes('payment')) return <Banknote size={18} className="text-[#2d7967]" />;
    if (type.includes('message')) return <MessageSquare size={18} className="text-[#536671]" />;
    return <Bell size={18} className="text-[#b0711d]" />;
  };

  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />
      <main className="fixmate-shell flex-1 max-w-3xl mx-auto py-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 px-4 pt-0">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />Updates</div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#17232d] mt-2 font-medium tracking-tight">Notifications</h1>
          </div>
          
          <div className="bg-[#fffdf7] border border-[#cad8d2] p-4 rounded-xl flex items-center justify-between gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${permission === 'granted' ? 'bg-[#e0f0e9] text-[#2c6f60]' : 'bg-[#f4f6f1] text-[#70817f]'}`}>
                {permission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
              </div>
              <div className="text-sm">
                <strong className="block text-[#17232d]">Browser Alerts</strong>
                <span className="text-[#536671] text-xs">
                  {!isSupported 
                    ? 'Not supported on this device'
                    : permission === 'granted' 
                    ? 'Active while app is open' 
                    : permission === 'denied' 
                    ? 'Blocked by browser' 
                    : 'Get notified of updates'}
                </span>
              </div>
            </div>
            {isSupported && permission === 'default' && (
              <button 
                onClick={requestPermission}
                className="text-xs bg-[#17232d] text-[#fffdf7] px-3 py-1.5 rounded-lg font-bold hover:bg-[#29404a] transition-colors whitespace-nowrap"
              >
                Enable
              </button>
            )}
            {permission === 'granted' && (
              <span className="text-xs font-bold text-[#2c6f60] flex items-center gap-1 whitespace-nowrap"><Check size={14} /> Enabled</span>
            )}
          </div>
        </div>

        {permission === 'granted' && (
          <p className="text-xs text-[#8a9b97] mb-6 flex items-start md:items-center gap-1.5 px-4 md:px-0">
            <Info size={12} className="flex-shrink-0 mt-0.5 md:mt-0" /> Note: Push notifications only run while the FixMate app is open in your browser. Lock-screen content may be generic. We do not use background service workers.
          </p>
        )}

        <div className="panel p-0 overflow-hidden bg-[#fffdf7]">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-[#8a9b97]">
              <LoaderCircle className="animate-spin mb-4" size={24} />
              <p className="text-sm">Loading your updates...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-[#f4f6f1] rounded-full flex items-center justify-center text-[#b9c9c2] mb-4">
                <Check size={28} />
              </div>
              <h3 className="text-[#17232d] font-bold text-lg mb-1">You're all caught up</h3>
              <p className="text-[#536671] text-sm">We'll notify you when engineers respond to your jobs or send messages.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#dfe5df]">
              {notifications.map((notif) => {
                const isClickable = !!notif.href || !!notif.jobId;
                const linkHref = notif.href || (notif.jobId ? `/marketplace?job=${notif.jobId}` : undefined);
                
                const content = (
                  <div className={`p-5 flex gap-4 ${isClickable ? 'hover:bg-[#f8faf5] transition-colors' : ''}`}>
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-[#f4f6f1] border border-[#cad8d2] flex items-center justify-center">
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1">
                        <h4 className="text-sm font-bold text-[#17232d] truncate">{notif.title}</h4>
                        <span className="text-xs text-[#8a9b97] whitespace-nowrap font-mono">
                          {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-[#536671] line-clamp-2 leading-relaxed">{notif.body}</p>
                    </div>
                  </div>
                );

                return isClickable ? (
                  <Link key={notif.id} href={linkHref!} className="block no-underline">
                    {content}
                  </Link>
                ) : (
                  <div key={notif.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
