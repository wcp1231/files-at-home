import React from 'react';
import { DynamicIcon } from 'lucide-react/dynamic'
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DirectorySelectorProps {
  onSelectDirectory: () => Promise<void>;
}

export default function DirectorySelector({ onSelectDirectory }: DirectorySelectorProps) {
  return (
    <Card>
      <CardHeader className="text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <DynamicIcon name="folder" className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">选择要分享的目录</CardTitle>
            <CardDescription className="mt-2">
              选择一个目录后，系统将生成一个分享链接，您可以将此链接发送给他人以共享目录内容。
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center md:justify-end">
        <Button onClick={onSelectDirectory}>
          选择目录
        </Button>
      </CardContent>
    </Card>
  );
} 