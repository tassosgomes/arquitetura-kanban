import Link from "next/link";
import { ErrorState } from "@/ui/feedback/ErrorState";

export default function ActivityNotFound() {
  return (
    <ErrorState
      title="Atividade não encontrada"
      message="Esta atividade não existe ou não está mais disponível."
      action={
        <Link href="/kanban" className="text-label-md font-semibold text-primary underline">
          Voltar ao Kanban
        </Link>
      }
    />
  );
}
