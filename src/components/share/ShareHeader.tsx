import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ShareHeaderProps {
  error: string | null;
}

export default function ShareHeader({ error }: ShareHeaderProps) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-6">分享目录</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
} 