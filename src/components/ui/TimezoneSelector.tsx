"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, Globe, Clock, MapPin } from "lucide-react";
import {
  TIMEZONE_OPTIONS,
  getUserTimezone,
  type TimezoneOption,
} from "@/lib/utils/timezone";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimezoneSelectorProps {
  value?: string;
  onChange: (timezone: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoDetect?: boolean;
}

interface TimezoneGroup {
  region: string;
  timezones: TimezoneOption[];
}

const TIMEZONE_REGIONS = {
  Popular: [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Australia/Sydney",
  ],
  Americas: ["America/", "US/", "Canada/", "Brazil/", "Mexico/"],
  Europe: ["Europe/"],
  Asia: ["Asia/"],
  Oceania: ["Australia/", "Pacific/"],
  Africa: ["Africa/"],
  Other: ["Etc/", "Indian/", "Atlantic/"],
};

export function TimezoneSelector({
  value,
  onChange,
  placeholder = "Select timezone",
  className,
  disabled = false,
  autoDetect = true,
}: TimezoneSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);

  // Auto-detect user's timezone
  useEffect(() => {
    if (autoDetect && !value) {
      const detected = getUserTimezone();
      setDetectedTimezone(detected);
    }
  }, [autoDetect, value]);

  // Group timezones by region
  const groupedTimezones = useMemo(() => {
    const groups: Record<string, TimezoneGroup> = {};

    TIMEZONE_OPTIONS.forEach((option) => {
      let region = "Other";

      // Find the region for this timezone
      for (const [regionName, patterns] of Object.entries(TIMEZONE_REGIONS)) {
        if (patterns.some((pattern) => option.value.startsWith(pattern))) {
          region = regionName;
          break;
        }
      }

      if (!groups[region]) {
        groups[region] = { region, timezones: [] };
      }

      groups[region].timezones.push(option);
    });

    return Object.values(groups);
  }, []);

  // Filter timezones based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedTimezones;

    const query = searchQuery.toLowerCase();
    return groupedTimezones
      .map((group) => ({
        ...group,
        timezones: group.timezones.filter(
          (option) =>
            option.label.toLowerCase().includes(query) ||
            option.value.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.timezones.length > 0);
  }, [groupedTimezones, searchQuery]);

  // Get current timezone display info
  const selectedTimezone = useMemo(() => {
    if (value) {
      return TIMEZONE_OPTIONS.find((option) => option.value === value);
    }
    if (detectedTimezone) {
      return TIMEZONE_OPTIONS.find(
        (option) => option.value === detectedTimezone
      );
    }
    return null;
  }, [value, detectedTimezone]);

  const handleSelect = (timezone: string) => {
    onChange(timezone);
    setSearchQuery("");
  };

  const handleDetectedTimezoneSelect = () => {
    if (detectedTimezone) {
      handleSelect(detectedTimezone);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Select value={value} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-gray-400" />
            <div className="flex flex-col text-left">
              <SelectValue placeholder={placeholder}>
                {selectedTimezone?.label || placeholder}
              </SelectValue>
              {detectedTimezone && !value && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Auto-detected:{" "}
                  {
                    TIMEZONE_OPTIONS.find((t) => t.value === detectedTimezone)
                      ?.label
                  }
                </span>
              )}
            </div>
          </div>
        </SelectTrigger>

        <SelectContent className="max-h-96">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search timezones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Detected Timezone Suggestion */}
          {detectedTimezone && !value && !searchQuery && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Use your detected timezone?
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDetectedTimezoneSelect();
                  }}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Use
                </button>
              </div>
            </div>
          )}

          {/* Timezone Groups */}
          {filteredGroups.map((group) => (
            <SelectGroup key={group.region}>
              <SelectLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {group.region}
              </SelectLabel>
              {group.timezones.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {option.label.split(" (")[0]}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {option.value}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}

          {filteredGroups.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No timezones found matching &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
