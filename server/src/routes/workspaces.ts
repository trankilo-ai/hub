import { Router } from 'express'
import { getAuth } from 'firebase-admin/auth'
import { authMiddleware } from '../middleware/auth'
import { requireWorkspaceRole } from '../middleware/rbac'
import { getWorkspace, createWorkspace, setMemberRole, listUserWorkspaces, createInvite, listInvites, deleteInvite, acceptInvite } from '../services/workspaces'
import { listWorkspaceAgents } from '../services/agents'
import { sendInviteEmail } from '../services/email'
import type { Role } from '../types'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  const workspaces = await listUserWorkspaces(req.user!.uid)
  res.json(workspaces)
})

router.get('/:workspaceId/agent', authMiddleware, requireWorkspaceRole('Viewer'), async (req, res) => {
  const agents = await listWorkspaceAgents(req.params.workspaceId)
  res.json(agents)
})

router.get('/:workspaceId/member', authMiddleware, async (req, res) => {
  const ws = await getWorkspace(req.params.workspaceId)
  if (!ws) { res.status(404).json({ message: 'Workspace not found' }); return }
  if (!ws.members[req.user!.uid]) { res.status(403).json({ message: 'Not a member' }); return }

  const uids = Object.keys(ws.members)
  const { users } = await getAuth().getUsers(uids.map((uid) => ({ uid })))
  const members = uids.map((uid) => {
    const u = users.find((r) => r.uid === uid)
    return { uid, displayName: u?.displayName ?? null, email: u?.email ?? null, photoURL: u?.photoURL ?? null, role: ws.members[uid] }
  })
  res.json(members)
})

router.get('/:workspaceId', authMiddleware, async (req, res) => {
  const ws = await getWorkspace(req.params.workspaceId)
  if (!ws) {
    res.status(404).json({ message: 'Workspace not found' })
    return
  }

  if (!ws.members[req.user!.uid]) {
    res.status(403).json({ message: 'Not a member of this workspace' })
    return
  }

  res.json(ws)
})

router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body as { name?: string }
  if (!name) {
    res.status(400).json({ message: 'name required' })
    return
  }
  const ws = await createWorkspace(name, req.user!.uid)
  res.status(201).json(ws)
})

router.get(
  '/:workspaceId/invite',
  authMiddleware,
  requireWorkspaceRole('Viewer'),
  async (req, res) => {
    const invites = await listInvites(req.params.workspaceId)
    res.json(invites)
  },
)

router.post(
  '/:workspaceId/invite',
  authMiddleware,
  requireWorkspaceRole('Admin'),
  async (req, res) => {
    const { email, role } = req.body as { email?: string; role?: string }
    if (!email || !role) {
      res.status(400).json({ message: 'email and role required' })
      return
    }
    const ws = await getWorkspace(req.params.workspaceId)
    const invite = await createInvite(req.params.workspaceId, email, role as Role, req.user!.uid)
    sendInviteEmail(email, ws?.name ?? 'a workspace', role as Role, req.user!.email ?? req.user!.uid, req.params.workspaceId, invite.id).catch(
      (err) => console.error('[email] failed to send invite email:', err),
    )
    res.status(201).json(invite)
  },
)

router.post(
  '/:workspaceId/invite/:inviteId/accept',
  authMiddleware,
  async (req, res) => {
    const { workspaceId, inviteId } = req.params
    const userEmail = req.user!.email
    if (!userEmail) { res.status(400).json({ message: 'Authenticated user has no email' }); return }
    try {
      await acceptInvite(workspaceId, inviteId, req.user!.uid, userEmail)
      const ws = await getWorkspace(workspaceId)
      res.json(ws)
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      res.status(e.status ?? 500).json({ message: e.message ?? 'Failed to accept invitation' })
    }
  },
)

router.delete(
  '/:workspaceId/invite/:inviteId',
  authMiddleware,
  requireWorkspaceRole('Admin'),
  async (req, res) => {
    await deleteInvite(req.params.workspaceId, req.params.inviteId)
    res.json({ message: 'Invite deleted' })
  },
)

router.patch(
  '/:workspaceId/member/:userId/role',
  authMiddleware,
  requireWorkspaceRole('Admin'),
  async (req, res) => {
    const { role } = req.body as { role?: Role }
    if (!role || !['Admin', 'Editor', 'Viewer'].includes(role)) {
      res.status(400).json({ message: 'Valid role required' })
      return
    }
    await setMemberRole(req.params.workspaceId, req.params.userId, role)
    res.json({ message: 'Role updated' })
  },
)

export default router
