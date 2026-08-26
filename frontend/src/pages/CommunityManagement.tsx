import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommunityStore, Community, CommunityMember, CommunityRule } from '@/store/communityStore';
import { Plus, Search, Users, MessageSquare, Eye, Edit, Trash2, Archive, Shield, Ban, VolumeX, Volume2, ChevronDown, Globe, Lock, Key, X, ArrowLeft, Settings, BookOpen, BarChart3 } from 'lucide-react';

const CATEGORIES = ['General', 'Tech', 'Design', 'Business', 'Other'];
const VISIBILITY_OPTIONS = ['public', 'private', 'restricted'];
const JOIN_POLICY_OPTIONS = ['open', 'approval', 'invite_only'];
const MEMBER_ROLES = ['admin', 'moderator', 'member'];

const CATEGORY_COLORS: Record<string, string> = {
  General: '#6366f1',
  Tech: '#3b82f6',
  Design: '#a855f7',
  Business: '#22c55e',
  Other: '#eab308',
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CommunityManagement() {
  const {
    communities,
    fetchCommunities,
    createCommunity,
    updateCommunity,
    deleteCommunity,
    archiveCommunity,
    fetchCommunityMembers,
    communityMembers,
    updateMemberRole,
    banMember,
    unbanMember,
    muteMember,
    unmuteMember,
    fetchCommunityRules,
    communityRules,
    createCommunityRule,
    updateCommunityRule,
    deleteCommunityRule,
  } = useCommunityStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'public' | 'private' | 'restricted' | 'archived'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [viewingMembers, setViewingMembers] = useState<Community | null>(null);
  const [showRulesPanel, setShowRulesPanel] = useState<Community | null>(null);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    category: 'General',
    visibility: 'public',
    join_policy: 'open',
    rules: '',
  });
  const [newRule, setNewRule] = useState<{ title: string; description: string }>({
    title: '',
    description: '',
  });

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  useEffect(() => {
    if (viewingMembers) {
      fetchCommunityMembers(viewingMembers.id);
    }
  }, [viewingMembers, fetchCommunityMembers]);

  useEffect(() => {
    if (showRulesPanel) {
      fetchCommunityRules(showRulesPanel.id);
    }
  }, [showRulesPanel, fetchCommunityRules]);

  const filtered = communities.filter((c) => {
    if (filterTab === 'public' && c.visibility !== 'public') return false;
    if (filterTab === 'private' && c.visibility !== 'private') return false;
    if (filterTab === 'restricted' && c.visibility !== 'restricted') return false;
    if (filterTab === 'archived' && !c.is_archived) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCommunities = communities.length;
  const totalMembers = communities.reduce((sum, c) => sum + c.member_count, 0);

  const resetForm = () => {
    setNewCommunity({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      category: 'General',
      visibility: 'public',
      join_policy: 'open',
      rules: '',
    });
    setEditingCommunity(null);
    setShowCreateModal(false);
  };

  const handleEdit = (community: Community) => {
    setNewCommunity({
      name: community.name,
      slug: community.slug,
      description: community.description || '',
      image_url: community.image_url || '',
      category: community.category,
      visibility: community.visibility,
      join_policy: community.join_policy,
      rules: community.rules || '',
    });
    setEditingCommunity(community);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!newCommunity.name || !newCommunity.slug) return;
    if (editingCommunity) {
      await updateCommunity(editingCommunity.id, {
        name: newCommunity.name,
        slug: newCommunity.slug,
        description: newCommunity.description || null,
        image_url: newCommunity.image_url || null,
        category: newCommunity.category,
        visibility: newCommunity.visibility as Community['visibility'],
        join_policy: newCommunity.join_policy as Community['join_policy'],
        rules: newCommunity.rules || null,
      });
    } else {
      await createCommunity({
        name: newCommunity.name,
        slug: newCommunity.slug,
        description: newCommunity.description || undefined,
        category: newCommunity.category,
        visibility: newCommunity.visibility,
        join_policy: newCommunity.join_policy,
        image_url: newCommunity.image_url || undefined,
      });
    }
    resetForm();
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this community?')) return;
    await archiveCommunity(id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this community? This action cannot be undone.')) return;
    await deleteCommunity(id);
  };

  const handleMemberRole = async (communityId: string, userId: string, role: string) => {
    await updateMemberRole(communityId, userId, role);
  };

  const handleBan = async (communityId: string, userId: string) => {
    await banMember(communityId, userId);
  };

  const handleUnban = async (communityId: string, userId: string) => {
    await unbanMember(communityId, userId);
  };

  const handleMute = async (communityId: string, userId: string) => {
    await muteMember(communityId, userId);
  };

  const handleUnmute = async (communityId: string, userId: string) => {
    await unmuteMember(communityId, userId);
  };

  const handleRuleSave = async () => {
    if (!newRule.title || !showRulesPanel) return;
    await createCommunityRule(showRulesPanel.id, {
      title: newRule.title,
      description: newRule.description || undefined,
    });
    setNewRule({ title: '', description: '' });
  };

  const handleRuleDelete = async (ruleId: string) => {
    if (!showRulesPanel) return;
    await deleteCommunityRule(showRulesPanel.id, ruleId);
  };

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'public', label: 'Public' },
    { key: 'private', label: 'Private' },
    { key: 'restricted', label: 'Restricted' },
    { key: 'archived', label: 'Archived' },
  ] as const;

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 text-sm';

  const selectClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm appearance-none';

  const visibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'private':
        return 'bg-red-500/20 text-red-400';
      case 'restricted':
        return 'bg-amber-500/20 text-amber-400';
      case 'archived':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                  Community Management
                </span>
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary-400" />
                  {totalCommunities} communities
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  {totalMembers} members
                </span>
              </div>
            </div>
            <button
              onClick={() => resetForm()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold text-sm hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Community
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filterTab === tab.key
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-300 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No communities found</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filtered.map((community) => (
                  <motion.div
                    key={community.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: CATEGORY_COLORS[community.category] || CATEGORY_COLORS.Other }}
                        >
                          {community.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{community.name}</h3>
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${visibilityBadge(
                              community.is_archived ? 'archived' : community.visibility
                            )}`}
                          >
                            {community.is_archived ? 'Archived' : community.visibility}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">
                        {community.description || 'No description'}
                      </p>

                      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {community.member_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {community.channel_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3.5 h-3.5" />
                          {new Date(community.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-white/5 flex-wrap">
                        <button
                          onClick={() => setViewingMembers(community)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                          title="View Members"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Members
                        </button>
                        <button
                          onClick={() => handleEdit(community)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setShowRulesPanel(community)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                          title="Rules"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Rules
                        </button>
                        <button
                          onClick={() => handleArchive(community.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(community.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all ml-auto"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {(showCreateModal || editingCommunity) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                  {editingCommunity ? 'Edit Community' : 'Create Community'}
                </h2>
                <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Name *</label>
                  <input
                    type="text"
                    value={newCommunity.name}
                    onChange={(e) =>
                      setNewCommunity({
                        ...newCommunity,
                        name: e.target.value,
                        slug: editingCommunity ? newCommunity.slug : generateSlug(e.target.value),
                      })
                    }
                    className={inputClass}
                    placeholder="My Community"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Slug *</label>
                  <input
                    type="text"
                    value={newCommunity.slug}
                    onChange={(e) => setNewCommunity({ ...newCommunity, slug: e.target.value })}
                    className={inputClass}
                    placeholder="my-community"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Description</label>
                  <textarea
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                    rows={3}
                    className={`${inputClass} resize-none`}
                    placeholder="Describe the community..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Image URL</label>
                  <input
                    type="text"
                    value={newCommunity.image_url}
                    onChange={(e) => setNewCommunity({ ...newCommunity, image_url: e.target.value })}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Category</label>
                    <div className="relative">
                      <select
                        value={newCommunity.category}
                        onChange={(e) => setNewCommunity({ ...newCommunity, category: e.target.value })}
                        className={selectClass}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Visibility</label>
                    <div className="relative">
                      <select
                        value={newCommunity.visibility}
                        onChange={(e) => setNewCommunity({ ...newCommunity, visibility: e.target.value })}
                        className={`${selectClass} capitalize`}
                      >
                        {VISIBILITY_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Join Policy</label>
                  <div className="relative">
                    <select
                      value={newCommunity.join_policy}
                      onChange={(e) => setNewCommunity({ ...newCommunity, join_policy: e.target.value })}
                      className={`${selectClass} capitalize`}
                    >
                      {JOIN_POLICY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Rules</label>
                  <textarea
                    value={newCommunity.rules}
                    onChange={(e) => setNewCommunity({ ...newCommunity, rules: e.target.value })}
                    rows={3}
                    className={`${inputClass} resize-none`}
                    placeholder="Community rules (one per line)..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!newCommunity.name || !newCommunity.slug}
                  className="px-5 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold text-sm hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {editingCommunity ? 'Save Changes' : 'Create Community'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingMembers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setViewingMembers(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-white/10 z-50 p-6 overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setViewingMembers(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-semibold text-white text-lg">{viewingMembers.name}</h2>
                  <p className="text-xs text-gray-400">Members</p>
                </div>
              </div>

              <div className="space-y-2">
                {communityMembers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">No members found.</p>
                ) : (
                  communityMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] ${
                        member.is_banned ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/30 to-purple-500/30 flex items-center justify-center text-sm font-semibold flex-shrink-0 text-white">
                        {member.user_avatar ? (
                          <img src={member.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          member.user_name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{member.user_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="relative">
                          <select
                            value={member.role}
                            onChange={(e) => handleMemberRole(viewingMembers.id, member.user_id, e.target.value)}
                            disabled={member.role === 'owner'}
                            className="text-xs rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-white appearance-none cursor-pointer pr-6 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                          >
                            {MEMBER_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                        {member.is_muted ? (
                          <button
                            onClick={() => handleUnmute(viewingMembers.id, member.user_id)}
                            className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-400 transition-all"
                            title="Unmute"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMute(viewingMembers.id, member.user_id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition-all"
                            title="Mute"
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {member.is_banned ? (
                          <button
                            onClick={() => handleUnban(viewingMembers.id, member.user_id)}
                            className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400 transition-all"
                            title="Unban"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(viewingMembers.id, member.user_id)}
                            disabled={member.role === 'owner'}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 disabled:opacity-30 transition-all"
                            title="Ban"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRulesPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => {
              setShowRulesPanel(null);
              setNewRule({ title: '', description: '' });
            }}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-white/10 z-50 p-6 overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setShowRulesPanel(null);
                    setNewRule({ title: '', description: '' });
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-semibold text-white text-lg">{showRulesPanel.name}</h2>
                  <p className="text-xs text-gray-400">Rules</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-4">
                <h3 className="text-sm font-medium text-white mb-3">Add Rule</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newRule.title}
                    onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                    className={inputClass}
                    placeholder="Rule title"
                  />
                  <textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder="Rule description (optional)"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleRuleSave}
                      disabled={!newRule.title}
                      className="px-4 py-1.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium text-sm hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Add Rule
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {communityRules.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">No rules yet.</p>
                ) : (
                  communityRules.map((rule, i) => (
                    <div key={rule.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-xs text-gray-500 font-mono mt-1">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{rule.title}</p>
                        {rule.description && <p className="text-xs text-gray-400 mt-1">{rule.description}</p>}
                      </div>
                      <button
                        onClick={() => handleRuleDelete(rule.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all flex-shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
