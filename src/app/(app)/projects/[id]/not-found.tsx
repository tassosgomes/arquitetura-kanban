import Link from "next/link";
import { ErrorState } from "@/ui/feedback/ErrorState";

export default function ProjectNotFound() {
  return (
    <ErrorState
      title="Projeto não encontrado"
      message="Este projeto não existe ou não está mais disponível."
      action={
        <Link href="/projects" className="text-label-md font-semibold text-primary underline">
          Voltar aos projetos
        </Link>
      }
    />
  );
}
