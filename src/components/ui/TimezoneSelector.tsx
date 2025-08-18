"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Globe, Clock, MapPin, ChevronDown } from "lucide-react";
import {
  TIMEZONE_OPTIONS,
  getUserTimezone,
  type TimezoneOption,
} from "@/lib/utils/timezone";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelect = (timezone: string) => {
    onChange(timezone);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleDetectedTimezoneSelect = () => {
    if (detectedTimezone) {
      handleSelect(detectedTimezone);
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "rounded-lg shadow-sm transition-all duration-200",
          "hover:border-blue-300 dark:hover:border-blue-600",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 border-blue-500"
        )}
      >
        <div className="flex items-center space-x-3">
          <Globe className="w-5 h-5 text-gray-400" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedTimezone?.label || placeholder}
            </span>
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
        <ChevronDown
          className={cn(
            "w-5 h-5 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search timezones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  onClick={handleDetectedTimezoneSelect}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Use
                </button>
              </div>
            </div>
          )}

          {/* Timezone List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredGroups.map((group) => (
              <div key={group.region}>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 uppercase tracking-wide">
                  {group.region}
                </div>
                {group.timezones.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-left",
                      "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                      "focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700",
                      value === option.value &&
                        "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    )}
                  >
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
                    {value === option.value && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No timezones found matching &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
