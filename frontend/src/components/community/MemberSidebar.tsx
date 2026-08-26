import { useCommunityStore, ChannelMember } from '@/store/communityStore';
import { cn } from '@/lib/utils';
import { Crown, Shield, User } from 'lucide-react';

function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900',
        online ? 'bg-emerald-500' : 'bg-gray-500'
      )}
    />
  );
}

function MemberItem({ member }: { member: ChannelMember }) {
  const roleIcon = (role?: string) => {
    switch (role) {
      case 'instructor':
        return <Shield className="w-3 h-3 text-purple-400" />;
      case 'admin':
      case 'super_admin':
        return <Crown className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-800/50 transition-colors cursor-default">
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
          {member.user_avatar ? (
            <img src={member.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            (member.user_name || '?').charAt(0).toUpperCase()
          )}
        </div>
        <PresenceDot online={true} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-300 truncate">{member.user_name}</span>
          {roleIcon(member.user_role)}
        </div>
        {member.role === 'owner' && (
          <span className="text-[10px] text-primary-400 font-medium">OWNER</span>
        )}
        {member.role === 'moderator' && (
          <span className="text-[10px] text-amber-400 font-medium">MOD</span>
        )}
      </div>
    </div>
  );
}

export function MemberSidebar() {
  const { members } = useCommunityStore();

  // Group by role
  const owners = members.filter((m) => m.role === 'owner');
  const moderators = members.filter((m) => m.role === 'moderator');
  const regularMembers = members.filter((m) => m.role === 'member');

  const onlineCount = members.length;

  return (
    <div className="w-60 flex-shrink-0 bg-gray-900/80 border-l border-gray-700/50 h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b border-gray-700/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Members — {onlineCount}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Owners */}
        {owners.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-2 mb-1">
              Owners — {owners.length}
            </h4>
            {owners.map((m) => (
              <MemberItem key={m.id} member={m} />
            ))}
          </div>
        )}

        {/* Moderators */}
        {moderators.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-2 mb-1">
              Moderators — {moderators.length}
            </h4>
            {moderators.map((m) => (
              <MemberItem key={m.id} member={m} />
            ))}
          </div>
        )}

        {/* Regular Members */}
        {regularMembers.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-2 mb-1">
              Members — {regularMembers.length}
            </h4>
            {regularMembers.map((m) => (
              <MemberItem key={m.id} member={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
