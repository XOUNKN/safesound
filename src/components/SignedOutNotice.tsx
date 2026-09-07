"use client";

import Link from "next/link";
import { IconLock } from "@/components/ui/Icons";
import { Button, EmptyState } from "@/components/ui/primitives";

export default function SignedOutNotice({ title, body }: { title: string; body: string }) {
  return (
    <EmptyState
      icon={<IconLock size={26} />}
      title={title}
      body={body}
      action={
        <div className="flex gap-2.5">
          <Link href="/login">
            <Button variant="primary">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="secondary">Create account</Button>
          </Link>
        </div>
      }
    />
  );
}
