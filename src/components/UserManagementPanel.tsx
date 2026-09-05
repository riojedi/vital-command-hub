import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Key, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Edit2, 
  Clock, 
  Check, 
  X, 
  UserCheck, 
  UserX, 
  ShieldAlert 
} from "lucide-react";
import { toast } from "sonner";
import { vitalApi, type UserInfo } from "@/lib/vitalApi";

export function UserManagementPanel() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current logged in user
  const currentUsername = typeof window !== "undefined" ? localStorage.getItem("v4l_username") || "admin" : "admin";
  const currentRole = typeof window !== "undefined" ? localStorage.getItem("v4l_user_role") || "admin" : "admin";

  // Create User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [creating, setCreating] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [editStatus, setEditStatus] = useState<"active" | "pending_approval" | "suspended" | "rejected">("active");
  const [editPassword, setEditPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  // Quick Action In-flight
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vitalApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users. Ensure you are signed in as an admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setCreating(true);
    try {
      await vitalApi.createUser({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        status: "active"
      });
      toast.success(`User "${newUsername.trim()}" created successfully!`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("editor");
      setShowAddModal(false);
      void fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    try {
      const payload: { role?: string; status?: string; password?: string } = { 
        role: editRole,
        status: editStatus
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      await vitalApi.updateUser(editingUser.id, payload);
      toast.success(`User "${editingUser.username}" updated!`);
      setEditingUser(null);
      setEditPassword("");
      void fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  const handleApprove = async (user: UserInfo, targetRole: "viewer" | "editor" | "admin" = "viewer") => {
    setProcessingId(user.id);
    try {
      await vitalApi.approveUser(user.id, targetRole);
      toast.success(`User "${user.username}" approved as ${targetRole}!`);
      void fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (user: UserInfo) => {
    if (!confirm(`Reject access request for "${user.username}"?`)) return;
    setProcessingId(user.id);
    try {
      await vitalApi.rejectUser(user.id);
      toast.success(`User "${user.username}" rejected.`);
      void fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleSuspend = async (user: UserInfo) => {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    const promptText = nextStatus === "suspended" 
      ? `Suspend user "${user.username}"? Their active sessions will be invalidated.`
      : `Reactivate user "${user.username}"?`;
    if (!confirm(promptText)) return;

    setProcessingId(user.id);
    try {
      await vitalApi.updateUser(user.id, { status: nextStatus });
      toast.success(`User "${user.username}" is now ${nextStatus}.`);
      void fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (user: UserInfo) => {
    if (user.username === currentUsername) {
      toast.error("You cannot delete your own active session account.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user "${user.username}"?`)) {
      return;
    }
    setProcessingId(user.id);
    try {
      await vitalApi.deleteUser(user.id);
      toast.success(`User "${user.username}" deleted.`);
      void fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingUsers = users.filter((u) => u.status === "pending_approval");

  return (
    <section aria-labelledby="user-management" className="panel p-5 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 id="user-management" className="flex items-center gap-2 text-xl font-bold text-white">
            <Users aria-hidden className="size-5 text-emerald-400" /> Team & User Management
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage admin, editor, and viewer accounts stored in the PostgreSQL state engine with self-service request approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentRole === "admin" && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-semibold transition shadow-sm cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              Add User
            </button>
          )}
          <button
            type="button"
            onClick={fetchUsers}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/40 p-3 text-xs text-red-200">
          <AlertCircle className="size-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* PENDING APPROVALS SECTION */}
      {pendingUsers.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Clock className="size-4 animate-pulse" />
              <span>Pending Access Requests ({pendingUsers.length})</span>
            </div>
            <span className="text-[11px] text-amber-300/80">Action required by administrator</span>
          </div>

          <div className="divide-y divide-amber-900/40 border border-amber-900/40 rounded-lg bg-zinc-950/60 overflow-hidden">
            {pendingUsers.map((u) => (
              <div key={u.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{u.username}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Requested on: {u.created_at ? new Date(u.created_at).toLocaleString() : "Recently"}
                  </p>
                </div>

                {currentRole === "admin" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={processingId === u.id}
                      onClick={() => void handleApprove(u, "viewer")}
                      className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      <UserCheck className="size-3 text-zinc-300" />
                      Approve Viewer
                    </button>
                    <button
                      type="button"
                      disabled={processingId === u.id}
                      onClick={() => void handleApprove(u, "editor")}
                      className="flex items-center gap-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      <UserCheck className="size-3 text-blue-200" />
                      Approve Editor
                    </button>
                    <button
                      type="button"
                      disabled={processingId === u.id}
                      onClick={() => void handleApprove(u, "admin")}
                      className="flex items-center gap-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      <Shield className="size-3 text-rose-200" />
                      Approve Admin
                    </button>
                    <button
                      type="button"
                      disabled={processingId === u.id}
                      onClick={() => void handleReject(u)}
                      className="flex items-center gap-1 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      <X className="size-3" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL USERS TABLE */}
      {loading && users.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-emerald-500" />
          <span>Loading authorized users...</span>
        </div>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-xs text-zinc-500">No user accounts found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-xs text-zinc-300 divide-y divide-zinc-800">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sessions</th>
                <th className="px-4 py-3">Session Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {users.map((u) => {
                const isCurrent = u.username === currentUsername;
                const userStatus = u.status || "active";
                return (
                  <tr key={u.id} className="hover:bg-zinc-900/40 transition">
                    <td className="px-4 py-3 font-mono text-zinc-500">#{u.id}</td>
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                      <span>{u.username}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-normal">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                        u.role === "admin"
                          ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                          : u.role === "editor"
                          ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        userStatus === "active"
                          ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                          : userStatus === "pending_approval"
                          ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                          : userStatus === "suspended"
                          ? "bg-red-950/60 text-red-300 border border-red-800/60"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {userStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-zinc-400">
                        {u.active_sessions ?? 0} active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {u.latest_session_expiry
                        ? new Date(u.latest_session_expiry).toLocaleString()
                        : "No active session"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {currentRole === "admin" && (
                        <div className="flex items-center justify-end gap-1.5">
                          {userStatus === "pending_approval" ? (
                            <>
                              <button
                                type="button"
                                disabled={processingId === u.id}
                                onClick={() => void handleApprove(u, "editor")}
                                title="Quick Approve as Editor"
                                className="px-2 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-semibold transition"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={processingId === u.id}
                                onClick={() => void handleReject(u)}
                                title="Reject Request"
                                className="px-2 py-1 rounded bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-[11px] font-semibold transition"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditRole(u.role);
                                  setEditStatus((u.status as any) || "active");
                                  setEditPassword("");
                                }}
                                title="Edit Role, Status, or Password"
                                className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              {!isCurrent && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleSuspend(u)}
                                    title={userStatus === "suspended" ? "Reactivate User" : "Suspend User"}
                                    className={`p-1.5 rounded transition cursor-pointer ${
                                      userStatus === "suspended" 
                                        ? "text-emerald-400 hover:bg-emerald-950/60" 
                                        : "text-amber-400 hover:bg-amber-950/60"
                                    }`}
                                  >
                                    <ShieldAlert className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteUser(u)}
                                    title="Delete Account"
                                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="size-4 text-emerald-400" />
                Create New Team Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jwarden"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">Permission Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="admin">Administrator (Full Control, Users & Run Trigger)</option>
                  <option value="editor">Editor (Queue & Config Modifications, Run Trigger)</option>
                  <option value="viewer">Viewer (Read-Only Telemetry & Analytics)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 rounded-md border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="size-4 text-emerald-400" />
                Edit Account: {editingUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-zinc-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="admin">Administrator</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="suspended">Suspended</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">
                  Reset Password <span className="text-zinc-500 font-normal lowercase">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  placeholder="New password..."
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-1.5 rounded-md border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {updating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}