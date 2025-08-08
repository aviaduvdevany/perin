"use client";

import { useState } from "react";
import {
  getConnectionPermissionsService,
  updateConnectionPermissionsService,
} from "@/app/services/network";
import type {
  ConnectionPermission,
  ConnectionConstraints,
  NetworkScope,
} from "@/types/network";

const ALL_SCOPES: NetworkScope[] = [
  "profile.basic.read",
  "calendar.availability.read",
  "calendar.events.propose",
  "calendar.events.write.auto",
  "calendar.events.write.confirm",
];

export default function PermissionsPage() {
  const [connectionId, setConnectionId] = useState("");
  const [permissions, setPermissions] = useState<ConnectionPermission | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLoad = async () => {
    setMessage(null);
    if (!connectionId) return;
    setLoading(true);
    try {
      const res = await getConnectionPermissionsService(connectionId);
      setPermissions(res.permissions || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleScope = (scope: NetworkScope) => {
    if (!permissions) return;
    const scopes = new Set(permissions.scopes || []);
    if (scopes.has(scope)) scopes.delete(scope);
    else scopes.add(scope);
    setPermissions({ ...permissions, scopes: Array.from(scopes) });
  };

  const updateConstraint = (path: (c: ConnectionConstraints) => void) => {
    if (!permissions) return;
    const next: ConnectionConstraints = {
      ...(permissions.constraints || {}),
    };
    path(next);
    setPermissions({ ...permissions, constraints: next });
  };

  const handleSave = async () => {
    if (!permissions) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await updateConnectionPermissionsService(
        permissions.connection_id,
        {
          scopes: permissions.scopes,
          constraints: permissions.constraints,
        }
      );
      setPermissions(res.permissions);
      setMessage("Saved");
    } catch (e) {
      console.error(e);
      setMessage("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-semibold">Connection Permissions</h1>

      <section className="space-y-3">
        <div className="flex gap-2">
          <input
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            placeholder="Connection ID"
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={handleLoad}
            disabled={!connectionId}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </div>
      </section>

      {permissions && (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-medium">Scopes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {ALL_SCOPES.map((s) => {
                const checked = permissions.scopes?.includes(s) || false;
                return (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleScope(s)}
                    />
                    <span>{s}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium">Constraints</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
              <input
                placeholder="Working Start (HH:MM)"
                value={permissions.constraints?.workingHours?.start || ""}
                onChange={(e) =>
                  updateConstraint((c) => {
                    c.workingHours = c.workingHours || { start: "", end: "" };
                    c.workingHours.start = e.target.value;
                  })
                }
                className="border rounded px-3 py-2"
              />
              <input
                placeholder="Working End (HH:MM)"
                value={permissions.constraints?.workingHours?.end || ""}
                onChange={(e) =>
                  updateConstraint((c) => {
                    c.workingHours = c.workingHours || { start: "", end: "" };
                    c.workingHours.end = e.target.value;
                  })
                }
                className="border rounded px-3 py-2"
              />
              <input
                placeholder="Min Notice Hours"
                type="number"
                value={permissions.constraints?.minNoticeHours || 0}
                onChange={(e) =>
                  updateConstraint((c) => {
                    c.minNoticeHours = parseInt(e.target.value || "0", 10);
                  })
                }
                className="border rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
              <input
                placeholder="Meeting Min (mins)"
                type="number"
                value={permissions.constraints?.meetingLengthMins?.min || 15}
                onChange={(e) =>
                  updateConstraint((c) => {
                    c.meetingLengthMins = c.meetingLengthMins || {
                      min: 15,
                      max: 60,
                    };
                    c.meetingLengthMins.min = parseInt(
                      e.target.value || "0",
                      10
                    );
                  })
                }
                className="border rounded px-3 py-2"
              />
              <input
                placeholder="Meeting Max (mins)"
                type="number"
                value={permissions.constraints?.meetingLengthMins?.max || 60}
                onChange={(e) =>
                  updateConstraint((c) => {
                    c.meetingLengthMins = c.meetingLengthMins || {
                      min: 15,
                      max: 60,
                    };
                    c.meetingLengthMins.max = parseInt(
                      e.target.value || "0",
                      10
                    );
                  })
                }
                className="border rounded px-3 py-2"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={permissions.constraints?.autoScheduling || false}
                  onChange={(e) =>
                    updateConstraint((c) => {
                      c.autoScheduling = e.target.checked;
                    })
                  }
                />
                <span>Auto-scheduling</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            {message && (
              <span className="text-sm text-gray-600">{message}</span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
