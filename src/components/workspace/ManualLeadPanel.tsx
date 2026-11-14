import React, { useState } from "react";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { LEAD_STATUSES, type Business } from "../../types/outflow";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Dropdown } from "../ui/Dropdown";
import { CalendarPicker } from "../ui/CalendarPicker";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface ManualLeadPanelProps {
  onAddLead: (lead: Omit<Business, "id">) => void;
  onClose: () => void;
}

export function ManualLeadPanel({ onAddLead, onClose }: ManualLeadPanelProps) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("New");
  const [followUpDate, setFollowUpDate] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Business name is required.");
      return;
    }

    onAddLead({
      name: name.trim(),
      number: number.trim(),
      website: website.trim(),
      email: email.trim(),
      status,
      followUpDate,
    });

    setName("");
    setNumber("");
    setWebsite("");
    setEmail("");
    setStatus("New");
    setFollowUpDate("");
    setNameError(null);
    onClose();
  };

  return (
    <Card state={nameError ? "error" : "active"} padding="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon={Add01Icon} size={16} className="text-[var(--accent-ink)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Add Lead Manually
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Icon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-start">
          <Input
            placeholder="Business Name"
            value={name}
            error={nameError}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
          />
          <Input
            placeholder="Mobile Number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <Input
            placeholder="Website URL"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Dropdown
            ariaLabel="Lead status"
            value={status}
            onChange={setStatus}
            options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <div className="flex items-center justify-between gap-2">
            <CalendarPicker
              value={followUpDate}
              onChange={setFollowUpDate}
              placeholder="Follow up"
            />
            <Button type="submit" variant="primary" size="md">
              Save
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
