"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addContact } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";

interface AddContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddContactModal({ open, onClose }: AddContactModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => addContact(email.trim()),
    onSuccess: (contact) => {
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ variant: "success", title: `Added ${contact.name}` });
      setEmail("");
      onClose();
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiError ? err.message : "Could not add this contact.",
      );
    },
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        setEmail("");
        setError("");
        onClose();
      }}
      title="Add a contact"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          mutation.mutate();
        }}
      >
        <Input
          label="Email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          error={error}
          autoFocus
          required
        />
        <p className="ms-text-muted text-xs">
          They need an existing MeetSpace account — search by the email they signed up with.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Add contact
          </Button>
        </div>
      </form>
    </Modal>
  );
}
