import { StatusPanel } from "@/ui/feedback/StatusPanel";

type AppStatusProps = {
  title: string;
  message: string;
};

export function AppStatus({ title, message }: AppStatusProps) {
  return <StatusPanel eyebrow="Ambiente local" title={title} message={message} />;
}
