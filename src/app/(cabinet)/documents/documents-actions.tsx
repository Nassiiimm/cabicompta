"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { UploadDialog } from "@/components/cabinet/upload-dialog";

export function DocumentsActions() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Téléverser
      </Button>
      <UploadDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
