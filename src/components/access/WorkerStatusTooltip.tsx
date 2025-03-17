import { DynamicIcon } from "lucide-react/dynamic";
import { useServiceWorkerStore } from "@/store/serviceWorkerStore";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const RunningStatus = () => {
  const t = useTranslations('WorkerStatusTooltip');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-green-500">{t('running')}</p>
    </div>
  );
};

const NotRunningStatus = () => {
  const t = useTranslations('WorkerStatusTooltip');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-destructive">{t('notRunning')}</p>
      <p className="text-xs text-muted-foreground">{t('notRunningTooltip')}</p>
    </div>
  );
};

export default function WorkerStatusTooltip() {
  const { status } = useServiceWorkerStore();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("text-destructive cursor-pointer", status === 'ok' ? "text-green-500" : "text-destructive")}>
            <DynamicIcon name={status === 'ok' ? "check-circle" : "alert-circle"} className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-background border">
          {status === 'ok' ? <RunningStatus /> : <NotRunningStatus />}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}