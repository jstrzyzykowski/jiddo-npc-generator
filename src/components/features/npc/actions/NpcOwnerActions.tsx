import { useCallback, useState } from "react";
import { EllipsisVertical } from "lucide-react";

import DeleteNpcModal from "@/components/features/npc/modal/DeleteNpcModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface OwnerActionNpc {
  id: string;
  name: string;
  status: "draft" | "published";
}

export interface NpcOwnerActionsProps {
  npc: OwnerActionNpc;
  isOwner?: boolean;
  triggerClassName?: string;
  menuClassName?: string;
  onEdit: () => void;
  onPublish: () => Promise<void>;
  onDeleteSuccess: () => Promise<void> | void;
}

const LOG_PREFIX = "NpcOwnerActions";

export function NpcOwnerActions({
  npc,
  isOwner = false,
  triggerClassName,
  menuClassName,
  onEdit,
  onPublish,
  onDeleteSuccess,
}: NpcOwnerActionsProps) {
  const [isPublishing, setPublishing] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const handlePublish = useCallback(async () => {
    if (npc.status === "published" || isPublishing) {
      return;
    }

    setPublishing(true);

    try {
      await onPublish();
    } catch (error) {
      console.error(`${LOG_PREFIX}: publish`, error);
      throw error;
    } finally {
      setPublishing(false);
    }
  }, [isPublishing, npc.status, onPublish]);

  const handleDeleteSuccess = useCallback(async () => {
    try {
      await onDeleteSuccess();
    } finally {
      setDeleteModalOpen(false);
    }
  }, [onDeleteSuccess]);

  if (!isOwner) {
    return null;
  }

  return (
    <>
      <DeleteNpcModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        npcId={npc.id}
        npcName={npc.name}
        onSuccess={handleDeleteSuccess}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring",
              triggerClassName
            )}
            aria-label="Owner actions"
          >
            <EllipsisVertical className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className={cn("w-44", menuClassName)}>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onEdit();
            }}
          >
            Edit
          </DropdownMenuItem>
          {npc.status !== "published" ? (
            <DropdownMenuItem
              disabled={isPublishing}
              onSelect={async (event) => {
                event.preventDefault();
                try {
                  await handlePublish();
                } catch (error) {
                  console.error(`${LOG_PREFIX}: onSelect publish`, error);
                }
              }}
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setDeleteModalOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default NpcOwnerActions;
