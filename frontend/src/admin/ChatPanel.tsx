import { useCallback, useEffect, useRef, useState } from 'react';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import { api, ApiError } from '../api/client';
import type { ChatContact, ChatConversation, ChatConversationMember, ChatMessage } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useConfirm } from '../ConfirmDialog';
import { formatTime } from '../regional';

// How often the badge/list refresh while the panel is CLOSED vs OPEN on a
// specific thread. Both are plain polling — this app has no WebSocket
// infrastructure anywhere else, and a Back Office chat between a handful
// of staff doesn't need one; a short interval reads as "basically live"
// without it. Open-thread polling is tighter than the closed-panel badge
// check since that's the moment a reply actually matters to see promptly.
const BADGE_POLL_MS = 20_000;
const THREAD_POLL_MS = 4_000;

type ThreadResponse = {
  conversation: { id: number; type: 'direct' | 'group'; name: string; is_creator: boolean };
  members: ChatConversationMember[];
  messages: ChatMessage[];
};

function initialsOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * A filterable list of chat-eligible teammates, reused for three different
 * pickers: starting a new direct message (single-select), choosing who to
 * put in a new group (multi-select, checkboxes), and adding someone to an
 * existing group (single-select again). The filter itself is client-side,
 * not a server round trip — the contact list is every chat.access holder
 * in the company, which for any business this size is small enough to
 * filter instantly in the browser.
 */
function ContactPicker({
  contacts,
  filter,
  selectedIds,
  onPick,
  emptyLabel,
}: {
  contacts: ChatContact[] | null;
  filter: string;
  /** Present = multi-select (checkboxes, onPick toggles membership); absent = single-select (onPick acts immediately). */
  selectedIds?: Set<number>;
  onPick: (contact: ChatContact) => void;
  emptyLabel: string;
}) {
  if (contacts === null) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  if (contacts.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, px: 2 }}>
        {emptyLabel}
      </Typography>
    );
  }

  const filtered = contacts.filter((c) => c.name.toLowerCase().includes(filter.trim().toLowerCase()));
  if (filtered.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, px: 2 }}>
        No teammates match &quot;{filter.trim()}&quot;.
      </Typography>
    );
  }

  return (
    <>
      {filtered.map((c) => (
        <Box
          key={c.id}
          onClick={() => onPick(c)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.25,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {selectedIds && <Checkbox size="small" checked={selectedIds.has(c.id)} tabIndex={-1} sx={{ p: 0 }} />}
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>{initialsOf(c.name)}</Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {c.name}
          </Typography>
        </Box>
      ))}
    </>
  );
}

/**
 * Back Office chat — a message icon in the top bar with an unread badge,
 * opening a slide-over with a conversation list and thread view. Covers
 * both direct messages (fixed, two-party) and groups (named, membership
 * editable by any current member — see ChatController's own docblock for
 * the exact rules).
 *
 * Rendered by AdminLayout ONLY when the signed-in user holds chat.access
 * (Store Manager/Store Admin/Company Admin/Super Admin — never a Cashier
 * or Cashier Supervisor, see GrantChatPermissionToExistingRoles), and
 * never rendered anywhere in the POS screen at all — this is Back Office
 * only, by design, not just by permission.
 */
export function ChatPanel() {
  const { user } = useAuth();
  const notify = useSnackbar();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [contacts, setContacts] = useState<ChatContact[] | null>(null);
  const [contactFilter, setContactFilter] = useState('');
  const [pickingContact, setPickingContact] = useState(false);

  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [creatingGroupSubmitting, setCreatingGroupSubmitting] = useState(false);

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [activeConversationName, setActiveConversationName] = useState<string>('');
  const [activeConversationType, setActiveConversationType] = useState<'direct' | 'group' | null>(null);
  const [activeConversationIsCreator, setActiveConversationIsCreator] = useState(false);
  const [activeMembers, setActiveMembers] = useState<ChatConversationMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [addingMemberToGroup, setAddingMemberToGroup] = useState(false);
  const [memberActionBusyId, setMemberActionBusyId] = useState<number | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  // Whether the view should follow new messages to the bottom. True right
  // after opening a thread, and while the reader is already sitting near
  // the bottom; false the moment they've scrolled up to read history —
  // otherwise the 4-second poll (loadThread(id, true) below) hands back a
  // brand-new `messages` array every single tick even when nothing
  // actually changed, and a scroll effect keyed on that array alone
  // yanked the view back down mid-read, which is exactly the bug this
  // guards against.
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const refreshUnread = useCallback(() => {
    api
      .get<{ unread: number }>('/chat/unread-count')
      .then((r) => setUnread(r.unread))
      .catch(() => {});
  }, []);

  // The badge has to stay live even while the panel is closed — that's
  // the whole point of a badge — so this polls unconditionally for as
  // long as ChatPanel is mounted (i.e. for the whole Back Office session).
  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, BADGE_POLL_MS);
    return () => clearInterval(id);
  }, [refreshUnread]);

  const loadConversations = useCallback(() => {
    api
      .get<ChatConversation[]>('/chat/conversations')
      .then(setConversations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) loadConversations();
  }, [open, loadConversations]);

  const openThread = useCallback((conversationId: number, name: string, type: 'direct' | 'group') => {
    setActiveConversationId(conversationId);
    setActiveConversationName(name);
    setActiveConversationType(type);
    // Corrected a moment later by loadThread's own response — false here
    // just avoids briefly showing creator-only actions before that lands.
    setActiveConversationIsCreator(false);
    setPickingContact(false);
    setCreatingGroup(false);
  }, []);

  const loadThread = useCallback(
    (conversationId: number, silent = false) => {
      if (!silent) setLoadingThread(true);
      api
        .get<ThreadResponse>(`/chat/messages?conversation_id=${conversationId}`)
        .then((r) => {
          setMessages(r.messages);
          setActiveConversationName(r.conversation.name);
          setActiveConversationType(r.conversation.type);
          setActiveConversationIsCreator(r.conversation.is_creator);
          setActiveMembers(r.members);
          // Reading a thread marks it read server-side — reflect that
          // locally right away rather than waiting for the next poll, so
          // the badge doesn't sit stale showing a count the user just saw.
          refreshUnread();
          loadConversations();
        })
        .catch(() => {
          if (!silent) notify('Failed to load conversation', 'error');
        })
        .finally(() => {
          if (!silent) setLoadingThread(false);
        });
    },
    [refreshUnread, loadConversations, notify]
  );

  useEffect(() => {
    if (activeConversationId === null) return;
    // A freshly opened thread always starts pinned to the bottom (the
    // most recent message), same as opening any chat app.
    stickToBottomRef.current = true;
    prevMessageCountRef.current = 0;
    loadThread(activeConversationId);
    const id = setInterval(() => loadThread(activeConversationId, true), THREAD_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  // Only follows new content down — never fires just because a poll
  // handed back an unchanged (but new-reference) messages array, and
  // never fires while the reader has scrolled up and away from the
  // bottom. See stickToBottomRef's own comment for the bug this fixes.
  useEffect(() => {
    const grew = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (grew && stickToBottomRef.current) {
      threadEndRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  function ensureContactsLoaded() {
    if (contacts === null) {
      api
        .get<ChatContact[]>('/chat/contacts')
        .then(setContacts)
        .catch(() => notify('Failed to load contacts', 'error'));
    }
  }

  function openDirectPicker() {
    setPickingContact(true);
    setContactFilter('');
    ensureContactsLoaded();
  }

  function openGroupCreator() {
    setCreatingGroup(true);
    setGroupNameDraft('');
    setSelectedMemberIds(new Set());
    setContactFilter('');
    ensureContactsLoaded();
  }

  function toggleSelectedMember(id: number) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startDirect(contact: ChatContact) {
    try {
      const r = await api.post<{ conversation_id: number }>('/chat/direct', { recipient_id: contact.id });
      openThread(r.conversation_id, contact.name, 'direct');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to start conversation', 'error');
    }
  }

  async function submitCreateGroup() {
    const name = groupNameDraft.trim();
    if (!name || selectedMemberIds.size === 0 || creatingGroupSubmitting) return;
    setCreatingGroupSubmitting(true);
    try {
      const created = await api.post<{ id: number }>('/chat/groups', { name, member_ids: Array.from(selectedMemberIds) });
      loadConversations();
      openThread(created.id, name, 'group');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to create group', 'error');
    } finally {
      setCreatingGroupSubmitting(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body || activeConversationId === null || sending) return;
    setSending(true);
    try {
      const created = await api.post<ChatMessage>('/chat/messages', { conversation_id: activeConversationId, body });
      // Always jump to it — the composer stays visible even while scrolled
      // up reading old history, so sending a message has to override
      // "not currently stuck to the bottom" rather than leave the
      // message you just sent scrolled out of view.
      stickToBottomRef.current = true;
      setMessages((prev) => [...prev, created]);
      setDraft('');
      loadConversations();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  }

  /**
   * Deletes one of the CALLER's own messages — the delete affordance only
   * ever renders on a message where `m.sender_id === user?.id`, and the
   * backend re-enforces the same ownership regardless (see
   * ChatMessageModel::softDelete()), so this never needs to handle "tried
   * to delete someone else's message" as a real case.
   *
   * Optimistic: flips the message to its deleted shape locally right
   * away rather than waiting on loadThread's next poll, so a delete you
   * just confirmed reads back instantly — the same way send() doesn't
   * wait for a poll to show what was just sent.
   */
  async function deleteMessage(message: ChatMessage) {
    if (!(await confirm('Delete this message? This cannot be undone.', { title: 'Delete Message', confirmLabel: 'Delete' }))) return;

    try {
      await api.del(`/chat/messages/${message.id}`);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, body: '', deleted_at: new Date().toISOString() } : m))
      );
      loadConversations();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete message', 'error');
    }
  }

  function openGroupInfo() {
    setRenameDraft(activeConversationName);
    setAddingMemberToGroup(false);
    setContactFilter('');
    setGroupInfoOpen(true);
    ensureContactsLoaded();
  }

  async function saveGroupName() {
    const name = renameDraft.trim();
    if (!name || activeConversationId === null || renaming || name === activeConversationName) return;
    setRenaming(true);
    try {
      await api.put(`/chat/groups/${activeConversationId}`, { name });
      setActiveConversationName(name);
      loadConversations();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to rename group', 'error');
    } finally {
      setRenaming(false);
    }
  }

  async function addMemberToGroup(contact: ChatContact) {
    if (activeConversationId === null) return;
    try {
      await api.post(`/chat/groups/${activeConversationId}/members`, { user_id: contact.id });
      setAddingMemberToGroup(false);
      loadThread(activeConversationId, true);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to add member', 'error');
    }
  }

  async function removeMemberFromGroup(member: ChatConversationMember) {
    if (activeConversationId === null) return;
    const isSelf = member.user_id === user?.id;
    const question = isSelf ? 'Leave this group? You will stop seeing new messages in it.' : `Remove ${member.name} from the group?`;
    if (!(await confirm(question, { title: isSelf ? 'Leave Group' : 'Remove Member', confirmLabel: isSelf ? 'Leave' : 'Remove' }))) return;

    setMemberActionBusyId(member.user_id);
    try {
      await api.del(`/chat/groups/${activeConversationId}/members/${member.user_id}`);
      if (isSelf) {
        setGroupInfoOpen(false);
        setActiveConversationId(null);
        loadConversations();
      } else {
        loadThread(activeConversationId, true);
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to remove member', 'error');
    } finally {
      setMemberActionBusyId(null);
    }
  }

  /**
   * Permanently deletes the whole conversation — every message in it, for
   * everyone, not just the caller's own view. A direct conversation can be
   * deleted by either party; a group only by whoever created it (the
   * IconButton that calls this is itself hidden for a non-creator — see
   * its render condition in the header below — but the backend enforces
   * the same rule regardless).
   */
  async function deleteConversation() {
    if (activeConversationId === null) return;
    const isGroup = activeConversationType === 'group';
    const question = isGroup
      ? `Delete "${activeConversationName}"? This permanently deletes it and every message in it for all members. This cannot be undone.`
      : `Delete this conversation with ${activeConversationName}? This permanently deletes every message in it for both of you. This cannot be undone.`;
    if (!(await confirm(question, { title: 'Delete Conversation', confirmLabel: 'Delete' }))) return;

    try {
      await api.del(`/chat/conversations/${activeConversationId}`);
      setGroupInfoOpen(false);
      setActiveConversationId(null);
      loadConversations();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete conversation', 'error');
    }
  }

  function closePanel() {
    setOpen(false);
    setActiveConversationId(null);
    setPickingContact(false);
    setCreatingGroup(false);
    setGroupInfoOpen(false);
  }

  function goBackFromPicker() {
    if (activeConversationId !== null) {
      setActiveConversationId(null);
    } else {
      setPickingContact(false);
      setCreatingGroup(false);
    }
  }

  const memberIdsInActiveGroup = new Set(activeMembers.map((m) => m.user_id));

  return (
    <>
      <Tooltip title="Messages">
        <IconButton size="small" onClick={() => setOpen(true)} sx={{ color: '#fff' }}>
          <Badge badgeContent={unread} color="error" max={99}>
            <ForumOutlinedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer anchor="right" open={open} onClose={closePanel} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 380 } } } }}>
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              {(activeConversationId !== null || pickingContact || creatingGroup) && (
                <IconButton size="small" onClick={goBackFromPicker} aria-label="Back">
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                  {activeConversationId !== null
                    ? activeConversationName
                    : creatingGroup
                      ? 'New group'
                      : pickingContact
                        ? 'New message'
                        : 'Messages'}
                </Typography>
                {activeConversationId !== null && activeConversationType === 'group' && (
                  <Typography variant="caption" color="text.secondary">
                    {activeMembers.length} member{activeMembers.length === 1 ? '' : 's'}
                  </Typography>
                )}
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              {activeConversationId !== null && activeConversationType === 'group' && (
                <Tooltip title="Group info">
                  <IconButton size="small" onClick={openGroupInfo} aria-label="Group info">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {/* Either party can delete a direct conversation; a group only by whoever created it — see deleteConversation()'s own docblock. */}
              {activeConversationId !== null && (activeConversationType === 'direct' || activeConversationIsCreator) && (
                <Tooltip title="Delete conversation">
                  <IconButton size="small" onClick={deleteConversation} aria-label="Delete conversation">
                    <DeleteForeverOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {activeConversationId === null && !pickingContact && !creatingGroup && (
                <>
                  <Tooltip title="New direct message">
                    <IconButton size="small" onClick={openDirectPicker} aria-label="New direct message">
                      <AddCommentOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="New group">
                    <IconButton size="small" onClick={openGroupCreator} aria-label="New group">
                      <GroupAddOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <IconButton size="small" onClick={closePanel} aria-label="Close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {activeConversationId !== null ? (
            <>
              <Stack
                ref={threadScrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  // Within 48px of the bottom counts as "still following
                  // along" — the reader doesn't have to be pixel-perfect
                  // at the very bottom for new messages to keep tracking.
                  stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
                }}
                spacing={1.25}
                sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}
              >
                {loadingThread ? (
                  <Stack sx={{ alignItems: 'center', py: 4 }}>
                    <CircularProgress size={22} />
                  </Stack>
                ) : messages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No messages yet — say hello.
                  </Typography>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    const deleted = m.deleted_at !== null;
                    const showSenderName = !mine && activeConversationType === 'group' && !deleted;
                    return (
                      <Box key={m.id}>
                        {showSenderName && (
                          <Typography variant="caption" sx={{ display: 'block', ml: 0.5, mb: 0.25, fontWeight: 600, color: 'text.secondary' }}>
                            {m.sender_name}
                          </Typography>
                        )}
                        <Box
                          className="chat-message-row"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: mine ? 'flex-end' : 'flex-start' }}
                        >
                          {/* The delete affordance sits BESIDE the bubble, not
                              inside it — only the sender's own, still-live
                              messages ever get one, and it only appears on
                              hover so the thread doesn't read as a row of
                              trash cans at rest. */}
                          {mine && !deleted && (
                            <Tooltip title="Delete message">
                              <IconButton
                                size="small"
                                onClick={() => deleteMessage(m)}
                                aria-label="Delete message"
                                className="chat-message-delete"
                                sx={{ opacity: 0, transition: 'opacity 0.1s ease', '.chat-message-row:hover &': { opacity: 1 } }}
                              >
                                <DeleteOutlineOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Box
                            sx={{
                              maxWidth: '78%',
                              px: 1.5,
                              py: 1,
                              borderRadius: 2.5,
                              bgcolor: deleted ? 'transparent' : mine ? 'primary.main' : 'action.selected',
                              color: deleted ? 'text.disabled' : mine ? 'primary.contrastText' : 'text.primary',
                              border: deleted ? '1px dashed' : 'none',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontStyle: deleted ? 'italic' : 'normal' }}
                            >
                              {deleted ? 'This message was deleted' : m.body}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', mt: 0.25, opacity: 0.7, textAlign: mine ? 'right' : 'left' }}
                            >
                              {formatTime(m.created_at, user?.currency)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                )}
                <div ref={threadEndRef} />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  multiline
                  maxRows={4}
                />
                <IconButton color="primary" onClick={send} disabled={!draft.trim() || sending} aria-label="Send">
                  <SendIcon fontSize="small" />
                </IconButton>
              </Stack>
            </>
          ) : pickingContact ? (
            <Stack sx={{ flex: 1, minHeight: 0 }}>
              {contacts !== null && contacts.length > 0 && (
                <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
                  <TextField fullWidth size="small" autoFocus placeholder="Filter by name" value={contactFilter} onChange={(e) => setContactFilter(e.target.value)} />
                </Box>
              )}
              <Stack sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <ContactPicker
                  contacts={contacts}
                  filter={contactFilter}
                  onPick={startDirect}
                  emptyLabel="No other Back Office teammates to message yet."
                />
              </Stack>
            </Stack>
          ) : creatingGroup ? (
            <Stack sx={{ flex: 1, minHeight: 0 }}>
              <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
                <TextField fullWidth size="small" autoFocus label="Group name" value={groupNameDraft} onChange={(e) => setGroupNameDraft(e.target.value)} />
              </Box>
              {contacts !== null && contacts.length > 0 && (
                <Box sx={{ px: 2, pb: 1 }}>
                  <TextField fullWidth size="small" placeholder="Filter by name" value={contactFilter} onChange={(e) => setContactFilter(e.target.value)} />
                </Box>
              )}
              <Stack sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <ContactPicker
                  contacts={contacts}
                  filter={contactFilter}
                  selectedIds={selectedMemberIds}
                  onPick={(c) => toggleSelectedMember(c.id)}
                  emptyLabel="No other Back Office teammates to add."
                />
              </Stack>
              <Stack sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  variant="contained"
                  disabled={!groupNameDraft.trim() || selectedMemberIds.size === 0 || creatingGroupSubmitting}
                  onClick={submitCreateGroup}
                >
                  Create group{selectedMemberIds.size > 0 ? ` (${selectedMemberIds.size + 1})` : ''}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {conversations.length === 0 ? (
                <Stack spacing={1.5} sx={{ alignItems: 'center', py: 6, px: 2, color: 'text.secondary' }}>
                  <ForumOutlinedIcon sx={{ fontSize: 36, opacity: 0.4 }} />
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    No conversations yet.
                  </Typography>
                </Stack>
              ) : (
                conversations.map((c, i) => {
                  const preview =
                    c.last_message_at === null
                      ? 'No messages yet'
                      : c.last_message_deleted
                        ? 'This message was deleted'
                        : c.type === 'group'
                          ? `${c.last_message_from_me ? 'You' : c.last_message_sender_name ?? ''}: ${c.last_message}`
                          : `${c.last_message_from_me ? 'You: ' : ''}${c.last_message}`;
                  return (
                    <Box key={c.id}>
                      {i > 0 && <Divider />}
                      <Box
                        onClick={() => openThread(c.id, c.name, c.type)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          px: 2,
                          py: 1.5,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 15 }}>
                          {c.type === 'group' ? <GroupsOutlinedIcon fontSize="small" /> : initialsOf(c.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <Typography variant="body2" sx={{ fontWeight: c.unread_count > 0 ? 700 : 600 }} noWrap>
                              {c.name}
                              {c.type === 'group' && (
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                                  ({c.member_count})
                                </Typography>
                              )}
                            </Typography>
                            {c.last_message_at !== null && (
                              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
                                {formatTime(c.last_message_at, user?.currency)}
                              </Typography>
                            )}
                          </Stack>
                          <Typography
                            variant="caption"
                            color={c.unread_count > 0 ? 'text.primary' : 'text.secondary'}
                            sx={{ display: 'block', fontWeight: c.unread_count > 0 ? 700 : 400, fontStyle: c.last_message_deleted ? 'italic' : 'normal' }}
                            noWrap
                          >
                            {preview}
                          </Typography>
                        </Box>
                        {c.unread_count > 0 && <Badge badgeContent={c.unread_count} color="error" max={99} sx={{ flexShrink: 0 }} />}
                      </Box>
                    </Box>
                  );
                })
              )}
            </Stack>
          )}

          {/* Only on the conversation-list home view — repeating this on
              every open thread would be noise, and it's the same fact
              regardless of which thread is open. */}
          {activeConversationId === null && !pickingContact && !creatingGroup && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              Messages are kept for 3 months, then deleted automatically.
            </Typography>
          )}
        </Stack>
      </Drawer>

      <Dialog open={groupInfoOpen} onClose={() => setGroupInfoOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {addingMemberToGroup && (
            <IconButton size="small" onClick={() => setAddingMemberToGroup(false)} aria-label="Back">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          {addingMemberToGroup ? 'Add member' : 'Group info'}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {addingMemberToGroup ? (
            <Stack>
              <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
                <TextField fullWidth size="small" autoFocus placeholder="Filter by name" value={contactFilter} onChange={(e) => setContactFilter(e.target.value)} />
              </Box>
              <ContactPicker
                contacts={contacts === null ? null : contacts.filter((c) => !memberIdsInActiveGroup.has(c.id))}
                filter={contactFilter}
                onPick={addMemberToGroup}
                emptyLabel="Every eligible teammate is already in this group."
              />
            </Stack>
          ) : (
            <Stack>
              <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Group name"
                  value={renameDraft}
                  disabled={!activeConversationIsCreator}
                  helperText={activeConversationIsCreator ? undefined : 'Only the group creator can rename it'}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveGroupName();
                  }}
                />
                {activeConversationIsCreator && (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!renameDraft.trim() || renaming || renameDraft.trim() === activeConversationName}
                    onClick={saveGroupName}
                  >
                    Save
                  </Button>
                )}
              </Stack>
              <Divider />
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1.5, pb: 0.5 }}>
                <Typography variant="subtitle2">Members ({activeMembers.length})</Typography>
                <Button size="small" startIcon={<GroupAddOutlinedIcon fontSize="small" />} onClick={() => { setAddingMemberToGroup(true); setContactFilter(''); }}>
                  Add
                </Button>
              </Stack>
              {activeMembers.map((m) => (
                <Box key={m.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>{initialsOf(m.name)}</Avatar>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }} noWrap>
                    {m.name}
                    {m.user_id === user?.id && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                        (you)
                      </Typography>
                    )}
                  </Typography>
                  {(m.user_id === user?.id || activeConversationIsCreator) && (
                    <Tooltip title={m.user_id === user?.id ? 'Leave group' : 'Remove from group'}>
                      <span>
                        <IconButton size="small" onClick={() => removeMemberFromGroup(m)} disabled={memberActionBusyId === m.user_id} aria-label={m.user_id === user?.id ? 'Leave group' : `Remove ${m.name}`}>
                          <PersonRemoveOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
