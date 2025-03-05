import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ConnectingIndicator() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 text-primary animate-spin mr-3" />
        <p className="text-muted-foreground">正在初始化连接...</p>
      </CardContent>
    </Card>
  );
} 