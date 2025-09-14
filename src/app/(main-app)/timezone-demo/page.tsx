"use client";

import React, { useState } from "react";
import { TimezoneSelector } from "@/components/ui/TimezoneSelector";
import {
  formatInTimezone,
  getCurrentTimeInTimezone,
  getTimezoneInfo,
} from "@/lib/utils/timezone";

export default function TimezoneDemoPage() {
  const [selectedTimezone, setSelectedTimezone] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timezoneInfo = selectedTimezone
    ? getTimezoneInfo(selectedTimezone, currentTime)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Timezone Selector Demo
          </h1>
          <p className="text-gray-300 text-lg">
            A beautiful, user-friendly timezone selector with emotional design
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timezone Selector */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              Select Your Timezone
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Primary Timezone
                </label>
                <TimezoneSelector
                  value={selectedTimezone}
                  onChange={setSelectedTimezone}
                  placeholder="Choose your timezone"
                  autoDetect={true}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Secondary Timezone (Disabled)
                </label>
                <TimezoneSelector
                  value="UTC"
                  onChange={() => {}}
                  placeholder="Disabled selector"
                  disabled={true}
                />
              </div>
            </div>
          </div>

          {/* Timezone Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              Timezone Information
            </h2>

            {selectedTimezone ? (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Current Time
                  </h3>
                  <div className="text-3xl font-mono text-blue-400">
                    {formatInTimezone(currentTime, selectedTimezone, {
                      hour12: false,
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">
                      Timezone
                    </h4>
                    <p className="text-white font-mono">
                      {timezoneInfo?.timezone}
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">
                      Abbreviation
                    </h4>
                    <p className="text-white font-mono">
                      {timezoneInfo?.abbreviation}
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">
                      UTC Offset
                    </h4>
                    <p className="text-white font-mono">
                      {timezoneInfo?.offset && timezoneInfo.offset > 0
                        ? "+"
                        : ""}
                      {timezoneInfo?.offset && timezoneInfo.offset / 60}h
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">
                      DST Status
                    </h4>
                    <p className="text-white font-mono">
                      {timezoneInfo?.isDST ? "DST" : "Standard"}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">
                    Features Demonstrated
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Auto-detection of user&apos;s timezone</li>
                    <li>• Searchable timezone list</li>
                    <li>
                      • Regional grouping (Popular, Americas, Europe, etc.)
                    </li>
                    <li>• Real-time timezone information</li>
                    <li>• Dark mode support</li>
                    <li>• Emotional design with smooth animations</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-gray-400">
                  Select a timezone to see detailed information
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Examples */}
        <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">
            Different Use Cases
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                User Preferences
              </h3>
              <TimezoneSelector
                value=""
                onChange={() => {}}
                placeholder="Set your timezone"
                autoDetect={true}
              />
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Meeting Scheduler
              </h3>
              <TimezoneSelector
                value=""
                onChange={() => {}}
                placeholder="Select meeting timezone"
                autoDetect={false}
              />
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Travel Planning
              </h3>
              <TimezoneSelector
                value=""
                onChange={() => {}}
                placeholder="Destination timezone"
                autoDetect={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
